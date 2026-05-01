from decimal import Decimal
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from accounts.permissions import IsAdminOrSuperAdmin, IsSuperAdmin
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import ScopedRateThrottle
from django.db.models import Count, Sum, Max, Min, Avg, F, Value, Q
from django.db.models.functions import Concat, TruncDate, TruncMonth
from datetime import timedelta, date, datetime
from django.utils import timezone

from .models import PageView, StaffVisitor
from .serializers import TrackPageViewSerializer
from bookings.models import Booking
from payments.models import Payment
from rooms.models import Room, RoomType
from reviews.models import Review


# Walk-in detector: backdated bookings OR auto-generated walk-in usernames
# (see bookings/views.py:135 — placeholder format `walkin-<8hex>`).
WALKIN_Q = Q(is_backdated=True) | Q(user__username__startswith='walkin-')


def _sales_qs():
    """Predicate used everywhere a 'real sale' is counted — matches Net Income."""
    return Booking.objects.filter(
        status__in=['confirmed', 'completed'],
        excluded_from_sales=False,
    )


def _parse_iso_date(s):
    if not s:
        return None
    try:
        return datetime.strptime(s, '%Y-%m-%d').date()
    except (TypeError, ValueError):
        return None


def _slots_per_day(room):
    """Available slots per day for a room. Slot-mode rooms have a day + night slot."""
    if room.is_day_only or room.booking_mode in ('overnight', '24hr'):
        return 1
    return 2


class AnalyticsRateThrottle(ScopedRateThrottle):
    scope = 'analytics'


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AnalyticsRateThrottle])
def track_page_view(request):
    serializer = TrackPageViewSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    visitor_id = serializer.validated_data['visitor_id']

    u = request.user
    is_staff_user = bool(
        u and u.is_authenticated and (
            getattr(u, 'is_staff', False)
            or getattr(u, 'is_admin', False)
            or getattr(u, 'is_superadmin', False)
        )
    )

    # Authenticated staff: mark this visitor_id permanently and don't record
    # the view. update_or_create keeps last_seen + user fresh on every hit.
    if is_staff_user:
        StaffVisitor.objects.update_or_create(
            visitor_id=visitor_id,
            defaults={'user': u},
        )
        return Response(status=status.HTTP_201_CREATED)

    # Anonymous request from a browser previously seen as staff: drop silently.
    # Covers the "logged out then back in" race where the tracker fires before
    # the auth state refreshes.
    if StaffVisitor.objects.filter(visitor_id=visitor_id).exists():
        return Response(status=status.HTTP_201_CREATED)

    PageView.objects.create(**serializer.validated_data)
    return Response(status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
@throttle_classes([AnalyticsRateThrottle])
def public_stats(request):
    from django.core.cache import cache
    cached = cache.get('public_stats')
    if cached:
        return Response(cached)
    total_guests = (
        Booking.objects
        .filter(status__in=['confirmed', 'completed'])
        .values('user')
        .distinct()
        .count()
    )
    total_rooms = Room.objects.filter(is_active=True).count()

    oldest_booking = Booking.objects.order_by('created_at').values_list('created_at', flat=True).first()
    if oldest_booking:
        years = (timezone.now() - oldest_booking).days / 365.25
    else:
        years = 1

    avg_rating = Review.objects.filter(is_approved=True).aggregate(avg=Avg('rating'))['avg']

    data = {
        'total_guests': total_guests,
        'total_rooms': total_rooms,
        'years_of_service': round(years, 1),
        'average_rating': round(avg_rating, 1) if avg_rating else None,
    }
    cache.set('public_stats', data, 600)  # Cache for 10 minutes
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdminOrSuperAdmin])
def admin_dashboard(request):
    # Public-facing PageView queryset — strips out anything from a visitor_id
    # that has ever been logged in as staff/admin/superadmin (StaffVisitor),
    # so logging in once permanently scrubs that browser from public stats.
    staff_visitor_ids = StaffVisitor.objects.values_list('visitor_id', flat=True)
    page_view_qs = PageView.objects.exclude(visitor_id__in=staff_visitor_ids)

    # Page view analytics
    page_views = list(
        page_view_qs
        .values('page_path')
        .annotate(views=Count('id'), last_viewed=Max('timestamp'))
        .order_by('-last_viewed')
    )
    unique_visitors = page_view_qs.values('visitor_id').distinct().count()
    total_page_views = page_view_qs.count()

    # Recent access timestamps per path (last 50 hits each, full datetime).
    # One query → group in Python instead of N queries (one per path).
    RECENT_PER_PATH = 50
    recent_accesses_by_path = {}
    relevant_paths = {r['page_path'] for r in page_views}
    for entry in page_view_qs.order_by('-timestamp').values('page_path', 'visitor_id', 'timestamp')[:5000]:
        path = entry['page_path']
        if path not in relevant_paths:
            continue
        bucket = recent_accesses_by_path.setdefault(path, [])
        if len(bucket) < RECENT_PER_PATH:
            bucket.append({
                'visitor_id': entry['visitor_id'],
                'timestamp': entry['timestamp'].isoformat(),
            })
    for row in page_views:
        row['recent_accesses'] = recent_accesses_by_path.get(row['page_path'], [])
        if row.get('last_viewed'):
            row['last_viewed'] = row['last_viewed'].isoformat()

    # Daily page views (last 90 days)
    ninety_days_ago = timezone.now() - timedelta(days=90)
    daily_page_views = list(
        page_view_qs
        .filter(timestamp__gte=ninety_days_ago)
        .annotate(view_date=TruncDate('timestamp'))
        .values('page_path', 'view_date')
        .annotate(views=Count('id'))
        .order_by('page_path', '-view_date')
    )

    # Business metrics — net income = sum of all confirmed + completed bookings
    # (excluding bookings explicitly flagged as excluded_from_sales)
    sales_qs = Booking.objects.filter(
        status__in=['confirmed', 'completed'],
        excluded_from_sales=False,
    )
    net_income = sales_qs.aggregate(total=Sum('total_price'))['total'] or 0
    total_sales = sales_qs.count()

    pending_sales = Booking.objects.filter(status='pending').count()

    pending_payments = Payment.objects.filter(status='pending').count()

    # Unique guests — grouped by user, with booking stats
    unique_guests = list(
        Booking.objects
        .filter(status__in=['confirmed', 'completed'])
        .values('user__id')
        .annotate(
            guest_name=Concat(F('user__first_name'), Value(' '), F('user__last_name')),
            username=F('user__username'),
            phone=F('user__phone'),
            total_bookings=Count('id'),
            total_spent=Sum('total_price'),
            last_booking=Max('created_at'),
        )
        .order_by('-last_booking')
    )

    # Per-guest booking details for expandable rows
    guest_bookings = list(
        Booking.objects
        .filter(status__in=['confirmed', 'completed'])
        .select_related('room')
        .values(
            'user__id', 'id', 'room__name',
            'check_in', 'check_out', 'total_price',
            'status', 'created_at', 'slots',
        )
        .order_by('user__id', '-created_at')
    )

    # Unique visitors list — grouped by visitor_id, last 90 days
    unique_visitors_list = list(
        page_view_qs
        .filter(timestamp__gte=ninety_days_ago)
        .values('visitor_id')
        .annotate(
            total_views=Count('id'),
            pages_visited=Count('page_path', distinct=True),
            last_seen=Max('timestamp'),
        )
        .order_by('-last_seen')[:100]
    )

    # Per-visitor page view details
    visitor_page_views = list(
        page_view_qs
        .filter(timestamp__gte=ninety_days_ago)
        .annotate(view_date=TruncDate('timestamp'))
        .values('visitor_id', 'page_path', 'view_date')
        .annotate(views=Count('id'))
        .order_by('visitor_id', '-view_date')
    )

    # Revenue by month — last 12 months
    # Sourced from bookings (same source as Net Income / Total Sales) so the
    # charts stay in sync with the headline sales metrics — including walk-in
    # / onsite bookings that may not have a matching Payment record.
    twelve_months_ago = timezone.now() - timedelta(days=365)
    revenue_by_month = list(
        sales_qs
        .filter(created_at__gte=twelve_months_ago)
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(revenue=Sum('total_price'))
        .order_by('month')
    )
    for entry in revenue_by_month:
        entry['month'] = entry['month'].strftime('%Y-%m')
        entry['revenue'] = float(entry['revenue'])

    # Revenue by day — last 30 days
    thirty_days_ago = timezone.now() - timedelta(days=30)
    revenue_by_day = list(
        sales_qs
        .filter(created_at__gte=thirty_days_ago)
        .annotate(day=TruncDate('created_at'))
        .values('day')
        .annotate(revenue=Sum('total_price'))
        .order_by('day')
    )
    for entry in revenue_by_day:
        entry['day'] = entry['day'].strftime('%Y-%m-%d')
        entry['revenue'] = float(entry['revenue'])

    # Room occupancy — last 30 days
    room_occupancy = []
    active_rooms = Room.objects.filter(is_active=True)
    today = date.today()
    period_start = today - timedelta(days=30)
    for room in active_rooms:
        slots_per_day = 1 if (room.is_day_only or room.booking_mode == 'overnight') else 2
        max_slots = 30 * slots_per_day

        bookings_in_period = Booking.objects.filter(
            room=room,
            status__in=['confirmed', 'completed'],
            check_out__gte=period_start,
            check_in__lte=today,
        )
        total_booked_slots = 0
        for b in bookings_in_period:
            for s in b.slots:
                try:
                    slot_date = date.fromisoformat(s['date'])
                    if period_start <= slot_date <= today:
                        total_booked_slots += 1
                except (ValueError, KeyError):
                    pass

        upcoming_bookings = Booking.objects.filter(
            room=room,
            status__in=['confirmed', 'pending'],
            check_in__gte=today,
        ).count()

        occupancy_pct = round((total_booked_slots / max_slots) * 100, 1) if max_slots > 0 else 0

        room_occupancy.append({
            'room_id': room.id,
            'room_name': room.name,
            'room_type': room.get_room_type_display(),
            'is_day_only': room.is_day_only,
            'booking_mode': room.booking_mode,
            'total_booked_slots': total_booked_slots,
            'max_slots': max_slots,
            'occupancy_pct': occupancy_pct,
            'upcoming_bookings': upcoming_bookings,
        })

    # Base data accessible to all staff
    data = {
        'net_income': float(net_income),
        'total_sales': total_sales,
        'pending_sales': pending_sales,
        'pending_payments': pending_payments,
        'revenue_by_month': revenue_by_month,
        'revenue_by_day': revenue_by_day,
        'room_occupancy': room_occupancy,
    }

    # Superadmin-only data
    if getattr(request.user, 'is_superadmin', False):
        data.update({
            'page_views': list(page_views),
            'daily_page_views': daily_page_views,
            'unique_visitors': unique_visitors,
            'total_page_views': total_page_views,
            'unique_guests_count': len(unique_guests),
            'unique_guests': unique_guests,
            'guest_bookings': guest_bookings,
            'unique_visitors_list': unique_visitors_list,
            'visitor_page_views': visitor_page_views,
        })

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdminOrSuperAdmin])
def export_bookings_csv(request):
    import csv
    from django.http import HttpResponse

    date_from = request.query_params.get('from')
    date_to = request.query_params.get('to')

    qs = Booking.objects.select_related('user', 'room').all().order_by('-created_at')
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="bookings-export.csv"'

    writer = csv.writer(response)
    writer.writerow(['Reference', 'Guest', 'Username', 'Room', 'Check-in', 'Check-out',
                     'Guests', 'Slots Summary', 'Total Price', 'Status', 'Created'])

    for b in qs:
        guest_name = f'{b.user.first_name} {b.user.last_name}'.strip() or b.user.username
        writer.writerow([
            b.reference_code, guest_name, b.user.username, b.room.name,
            b.check_in, b.check_out, b.guests, b.slots_summary,
            b.total_price, b.status, b.created_at.strftime('%Y-%m-%d %H:%M'),
        ])

    return response


@api_view(['GET'])
@permission_classes([IsAdminOrSuperAdmin])
def export_revenue_csv(request):
    import csv
    from django.http import HttpResponse

    date_from = request.query_params.get('from')
    date_to = request.query_params.get('to')

    qs = Payment.objects.select_related('booking__user', 'booking__room').filter(
        status='succeeded'
    ).order_by('-created_at')
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="revenue-export.csv"'

    writer = csv.writer(response)
    writer.writerow(['Date', 'Booking Ref', 'Guest', 'Room', 'Amount', 'Payment Type'])

    for p in qs:
        guest_name = f'{p.booking.user.first_name} {p.booking.user.last_name}'.strip() or p.booking.user.username
        writer.writerow([
            p.created_at.strftime('%Y-%m-%d'),
            p.booking.reference_code,
            guest_name,
            p.booking.room.name,
            p.amount,
            p.payment_type,
        ])

    return response


def _compute_revenue_insights(is_superadmin, custom_from, custom_to):
    today = date.today()
    long_start = custom_from or (today - timedelta(days=365))
    long_end = custom_to or today
    short_start = custom_from or (today - timedelta(days=30))
    short_end = custom_to or today

    sales_long = _sales_qs().filter(created_at__date__range=(long_start, long_end))
    sales_short_qs = _sales_qs().filter(check_in__range=(short_start, short_end))

    # ---------- Breakdowns (long window) ----------
    revenue_by_room = list(
        sales_long
        .values('room__id', 'room__name', 'room__room_type')
        .annotate(revenue=Sum('total_price'), bookings=Count('id'))
        .order_by('-revenue')
    )
    type_label = dict(RoomType.choices)
    for row in revenue_by_room:
        row['room_type_label'] = type_label.get(row['room__room_type'], row['room__room_type'])
        row['revenue'] = float(row['revenue'] or 0)

    revenue_by_room_type = list(
        sales_long
        .values('room__room_type')
        .annotate(revenue=Sum('total_price'), bookings=Count('id'))
        .order_by('-revenue')
    )
    for row in revenue_by_room_type:
        row['room_type_label'] = type_label.get(row['room__room_type'], row['room__room_type'])
        row['revenue'] = float(row['revenue'] or 0)

    revenue_by_payment_type = list(
        sales_long
        .values('payment__payment_type')
        .annotate(revenue=Sum('total_price'), bookings=Count('id'))
        .order_by('-revenue')
    )
    for row in revenue_by_payment_type:
        if row['payment__payment_type'] is None:
            row['payment__payment_type'] = 'onsite'
        row['revenue'] = float(row['revenue'] or 0)

    weekday_revenue = Decimal('0')
    weekend_revenue = Decimal('0')
    weekday_bookings = 0
    weekend_bookings = 0
    for b in sales_long.values('check_in', 'total_price'):
        if b['check_in'].weekday() >= 5:
            weekend_revenue += b['total_price']
            weekend_bookings += 1
        else:
            weekday_revenue += b['total_price']
            weekday_bookings += 1
    weekday_vs_weekend = {
        'weekday': {'revenue': float(weekday_revenue), 'bookings': weekday_bookings},
        'weekend': {'revenue': float(weekend_revenue), 'bookings': weekend_bookings},
    }

    # ---------- KPIs (short window) ----------
    short_revenue = sales_short_qs.aggregate(t=Sum('total_price'))['t'] or Decimal('0')
    short_bookings = sales_short_qs.count()

    occupied_room_nights = 0
    daily_occupied = {}
    for b in sales_short_qs.values('slots'):
        for s in b['slots'] or []:
            try:
                slot_date = date.fromisoformat(s['date'])
            except (ValueError, KeyError, TypeError):
                continue
            if short_start <= slot_date <= short_end:
                occupied_room_nights += 1
                daily_occupied[slot_date] = daily_occupied.get(slot_date, 0) + 1

    period_days = (short_end - short_start).days + 1
    daily_capacity = 0
    for room in Room.objects.filter(is_active=True):
        daily_capacity += room.max_rooms * _slots_per_day(room)
    total_available_slots = daily_capacity * period_days

    adr = float(short_revenue) / occupied_room_nights if occupied_room_nights > 0 else 0
    revpar = float(short_revenue) / total_available_slots if total_available_slots > 0 else 0
    occupancy_pct = (occupied_room_nights / total_available_slots * 100) if total_available_slots > 0 else 0

    occupancy_trend = []
    cursor = short_start
    while cursor <= short_end:
        occupied = daily_occupied.get(cursor, 0)
        pct = round((occupied / daily_capacity) * 100, 1) if daily_capacity > 0 else 0
        occupancy_trend.append({'date': cursor.isoformat(), 'occupancy_pct': pct})
        cursor += timedelta(days=1)

    # ---------- Lead time (long window) ----------
    lead_buckets_order = ['0', '1-3', '4-7', '8-14', '15-30', '31+']
    lead_buckets = {k: 0 for k in lead_buckets_order}
    for b in sales_long.values('check_in', 'created_at'):
        diff = (b['check_in'] - b['created_at'].date()).days
        if diff <= 0:
            lead_buckets['0'] += 1
        elif diff <= 3:
            lead_buckets['1-3'] += 1
        elif diff <= 7:
            lead_buckets['4-7'] += 1
        elif diff <= 14:
            lead_buckets['8-14'] += 1
        elif diff <= 30:
            lead_buckets['15-30'] += 1
        else:
            lead_buckets['31+'] += 1
    lead_time_buckets = [{'bucket': k, 'count': lead_buckets[k]} for k in lead_buckets_order]

    # ---------- Discounts, vouchers, cancellations (long window) ----------
    from vouchers.models import VoucherUsage

    voucher_roi = list(
        VoucherUsage.objects
        .filter(created_at__date__range=(long_start, long_end))
        .values('voucher__code')
        .annotate(
            uses=Count('id'),
            total_discount=Sum('discount_amount'),
            revenue_after=Sum('booking__total_price'),
        )
        .order_by('-total_discount')
    )
    for row in voucher_roi:
        row['total_discount'] = float(row['total_discount'] or 0)
        row['revenue_after'] = float(row['revenue_after'] or 0)
        row['roi'] = round(row['revenue_after'] / row['total_discount'], 2) if row['total_discount'] > 0 else None

    manual_discount_total = float(
        sales_long.aggregate(t=Sum('manual_discount'))['t'] or Decimal('0')
    )

    cancel_window = Booking.objects.filter(created_at__date__range=(long_start, long_end))
    total_in_window = cancel_window.count()
    cancelled_in_window = cancel_window.filter(status='cancelled').count()
    cancellation_stats = {
        'total': total_in_window,
        'cancelled': cancelled_in_window,
        'rate_pct': round((cancelled_in_window / total_in_window) * 100, 1) if total_in_window > 0 else 0,
    }

    refunded_revenue = float(
        Payment.objects.filter(
            status='refunded',
            created_at__date__range=(long_start, long_end),
        ).aggregate(t=Sum('amount'))['t'] or Decimal('0')
    )

    lost_revenue = float(
        Booking.objects.filter(
            status='cancelled',
            created_at__date__range=(long_start, long_end),
        ).aggregate(t=Sum('total_price'))['t'] or Decimal('0')
    )

    walkin_qs = sales_long.filter(WALKIN_Q)
    online_qs = sales_long.exclude(WALKIN_Q)
    walkin_vs_online = {
        'walkin': {
            'count': walkin_qs.count(),
            'revenue': float(walkin_qs.aggregate(t=Sum('total_price'))['t'] or Decimal('0')),
        },
        'online': {
            'count': online_qs.count(),
            'revenue': float(online_qs.aggregate(t=Sum('total_price'))['t'] or Decimal('0')),
        },
    }

    # ---------- Period comparisons ----------
    monthly_qs = list(
        _sales_qs()
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(revenue=Sum('total_price'))
    )
    monthly_revenue = {row['month'].strftime('%Y-%m'): float(row['revenue'] or 0) for row in monthly_qs}

    today_ref = long_end
    this_month_key = today_ref.strftime('%Y-%m')
    prev_month_dt = (today_ref.replace(day=1) - timedelta(days=1))
    prev_month_key = prev_month_dt.strftime('%Y-%m')
    yoy_dt = today_ref.replace(year=today_ref.year - 1)
    yoy_key = yoy_dt.strftime('%Y-%m')

    def _delta(curr, prev):
        if prev <= 0:
            return 100.0 if curr > 0 else 0.0
        return round((curr - prev) / prev * 100, 1)

    mom_curr = monthly_revenue.get(this_month_key, 0)
    mom_prev = monthly_revenue.get(prev_month_key, 0)
    yoy_prev = monthly_revenue.get(yoy_key, 0)

    comparisons = {
        'mom': {'curr': mom_curr, 'prev': mom_prev, 'delta_pct': _delta(mom_curr, mom_prev)},
        'yoy': {'curr': mom_curr, 'prev': yoy_prev, 'delta_pct': _delta(mom_curr, yoy_prev)},
    }

    # ---------- Guest insights (aggregates for all staff) ----------
    completed_all = _sales_qs()
    user_booking_counts = list(
        completed_all.values('user').annotate(c=Count('id'))
    )
    total_users = len(user_booking_counts)
    repeat_users = sum(1 for u in user_booking_counts if u['c'] >= 2)
    repeat_booking_rate = round(repeat_users / total_users * 100, 1) if total_users > 0 else 0

    # New vs returning within the long window
    user_first_booking = {}
    for row in completed_all.values('user').annotate(first=Min('created_at')):
        user_first_booking[row['user']] = row['first']

    new_count = 0
    returning_count = 0
    for b in sales_long.values('user', 'created_at'):
        first = user_first_booking.get(b['user'])
        if first and first >= b['created_at']:
            new_count += 1
        else:
            returning_count += 1
    new_vs_returning = {'new': new_count, 'returning': returning_count}

    result = {
        'long_window': {'from': long_start.isoformat(), 'to': long_end.isoformat()},
        'short_window': {'from': short_start.isoformat(), 'to': short_end.isoformat()},
        'revenue_by_room': revenue_by_room,
        'revenue_by_room_type': revenue_by_room_type,
        'revenue_by_payment_type': revenue_by_payment_type,
        'weekday_vs_weekend': weekday_vs_weekend,
        'adr': round(adr, 2),
        'revpar': round(revpar, 2),
        'occupancy_pct': round(occupancy_pct, 1),
        'short_window_revenue': float(short_revenue),
        'short_window_bookings': short_bookings,
        'occupied_room_nights': occupied_room_nights,
        'total_available_slots': total_available_slots,
        'occupancy_trend': occupancy_trend,
        'lead_time_buckets': lead_time_buckets,
        'voucher_roi': voucher_roi,
        'manual_discount_total': manual_discount_total,
        'cancellation_stats': cancellation_stats,
        'refunded_revenue': refunded_revenue,
        'lost_revenue': lost_revenue,
        'walkin_vs_online': walkin_vs_online,
        'comparisons': comparisons,
        'repeat_booking_rate': repeat_booking_rate,
        'new_vs_returning': new_vs_returning,
    }

    # ---------- Superadmin-only: named top spenders ----------
    if is_superadmin:
        top_spenders = list(
            sales_long
            .values('user__id', 'user__first_name', 'user__last_name', 'user__username')
            .annotate(
                total_spent=Sum('total_price'),
                bookings=Count('id'),
                last_booking=Max('created_at'),
            )
            .order_by('-total_spent')[:20]
        )
        for row in top_spenders:
            row['guest_name'] = (
                f"{row['user__first_name'] or ''} {row['user__last_name'] or ''}".strip()
                or row['user__username']
            )
            row['total_spent'] = float(row['total_spent'] or 0)
            row['last_booking'] = row['last_booking'].isoformat() if row['last_booking'] else None
        merged = {}
        for row in top_spenders:
            key = row['guest_name']
            if key in merged:
                merged[key]['total_spent'] += row['total_spent']
                merged[key]['bookings'] += row['bookings']
                if row['last_booking'] and (not merged[key]['last_booking'] or row['last_booking'] > merged[key]['last_booking']):
                    merged[key]['last_booking'] = row['last_booking']
            else:
                merged[key] = dict(row)
        result['top_spenders'] = sorted(merged.values(), key=lambda r: r['total_spent'], reverse=True)[:20]

    return result


@api_view(['GET'])
@permission_classes([IsAdminOrSuperAdmin])
def revenue_insights(request):
    from django.core.cache import cache

    is_superadmin = bool(getattr(request.user, 'is_superadmin', False))
    custom_from = _parse_iso_date(request.query_params.get('from'))
    custom_to = _parse_iso_date(request.query_params.get('to'))
    use_cache = not (custom_from or custom_to)
    cache_key = f'revenue_insights:{"superadmin" if is_superadmin else "staff"}'

    if use_cache:
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

    data = _compute_revenue_insights(is_superadmin, custom_from, custom_to)

    if use_cache:
        cache.set(cache_key, data, 600)

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdminOrSuperAdmin])
def export_breakdowns_csv(request):
    import csv
    from django.http import HttpResponse

    custom_from = _parse_iso_date(request.query_params.get('from'))
    custom_to = _parse_iso_date(request.query_params.get('to'))
    data = _compute_revenue_insights(
        bool(getattr(request.user, 'is_superadmin', False)),
        custom_from, custom_to,
    )

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="revenue-breakdowns.csv"'
    writer = csv.writer(response)

    window = data['long_window']
    writer.writerow([f"Window: {window['from']} to {window['to']}"])
    writer.writerow([])

    writer.writerow(['Revenue by Room'])
    writer.writerow(['Room', 'Type', 'Bookings', 'Revenue'])
    for row in data['revenue_by_room']:
        writer.writerow([row['room__name'], row['room_type_label'], row['bookings'], row['revenue']])
    writer.writerow([])

    writer.writerow(['Revenue by Room Type'])
    writer.writerow(['Room Type', 'Bookings', 'Revenue'])
    for row in data['revenue_by_room_type']:
        writer.writerow([row['room_type_label'], row['bookings'], row['revenue']])
    writer.writerow([])

    writer.writerow(['Revenue by Payment Type'])
    writer.writerow(['Payment Type', 'Bookings', 'Revenue'])
    for row in data['revenue_by_payment_type']:
        writer.writerow([row['payment__payment_type'], row['bookings'], row['revenue']])
    writer.writerow([])

    writer.writerow(['Weekday vs Weekend'])
    writer.writerow(['Bucket', 'Bookings', 'Revenue'])
    writer.writerow(['Weekday', data['weekday_vs_weekend']['weekday']['bookings'], data['weekday_vs_weekend']['weekday']['revenue']])
    writer.writerow(['Weekend', data['weekday_vs_weekend']['weekend']['bookings'], data['weekday_vs_weekend']['weekend']['revenue']])
    writer.writerow([])

    writer.writerow(['Hotel KPIs (short window: ' + data['short_window']['from'] + ' to ' + data['short_window']['to'] + ')'])
    writer.writerow(['ADR', data['adr']])
    writer.writerow(['RevPAR', data['revpar']])
    writer.writerow(['Occupancy %', data['occupancy_pct']])
    writer.writerow(['Occupied Room-Nights', data['occupied_room_nights']])
    writer.writerow(['Available Room-Nights', data['total_available_slots']])
    writer.writerow([])

    writer.writerow(['Lead Time Buckets (days from booking to check-in)'])
    writer.writerow(['Bucket', 'Bookings'])
    for row in data['lead_time_buckets']:
        writer.writerow([row['bucket'], row['count']])

    return response


@api_view(['GET'])
@permission_classes([IsAdminOrSuperAdmin])
def export_vouchers_csv(request):
    import csv
    from django.http import HttpResponse

    custom_from = _parse_iso_date(request.query_params.get('from'))
    custom_to = _parse_iso_date(request.query_params.get('to'))
    data = _compute_revenue_insights(
        bool(getattr(request.user, 'is_superadmin', False)),
        custom_from, custom_to,
    )

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="voucher-roi.csv"'
    writer = csv.writer(response)
    window = data['long_window']
    writer.writerow([f"Window: {window['from']} to {window['to']}"])
    writer.writerow([])
    writer.writerow(['Voucher Code', 'Uses', 'Total Discount Given', 'Revenue After Discount', 'ROI (revenue ÷ discount)'])
    for row in data['voucher_roi']:
        writer.writerow([
            row['voucher__code'], row['uses'], row['total_discount'],
            row['revenue_after'], row['roi'] if row['roi'] is not None else '',
        ])
    writer.writerow([])
    writer.writerow(['Manual Discount Total (post-migration only)', data['manual_discount_total']])

    return response


@api_view(['GET'])
@permission_classes([IsAdminOrSuperAdmin])
def export_cancellations_csv(request):
    import csv
    from django.http import HttpResponse

    date_from = request.query_params.get('from')
    date_to = request.query_params.get('to')

    qs = Booking.objects.select_related('user', 'room', 'payment').filter(
        status='cancelled'
    ).order_by('-updated_at')
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="cancellations.csv"'
    writer = csv.writer(response)
    writer.writerow(['Reference', 'Guest', 'Room', 'Check-in', 'Check-out',
                     'Total Price', 'Created', 'Cancelled At', 'Payment Status'])
    for b in qs:
        guest_name = f'{b.user.first_name} {b.user.last_name}'.strip() or b.user.username
        try:
            payment_status = b.payment.status
        except Payment.DoesNotExist:
            payment_status = ''
        writer.writerow([
            b.reference_code, guest_name, b.room.name,
            b.check_in, b.check_out, b.total_price,
            b.created_at.strftime('%Y-%m-%d %H:%M'),
            b.updated_at.strftime('%Y-%m-%d %H:%M'),
            payment_status,
        ])

    return response


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def export_top_guests_csv(request):
    import csv
    from django.http import HttpResponse

    custom_from = _parse_iso_date(request.query_params.get('from'))
    custom_to = _parse_iso_date(request.query_params.get('to'))
    data = _compute_revenue_insights(True, custom_from, custom_to)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="top-guests.csv"'
    writer = csv.writer(response)
    window = data['long_window']
    writer.writerow([f"Window: {window['from']} to {window['to']}"])
    writer.writerow([])
    writer.writerow(['Guest', 'Username', 'Bookings', 'Total Spent', 'Last Booking'])
    for row in data.get('top_spenders', []):
        writer.writerow([
            row['guest_name'], row['user__username'],
            row['bookings'], row['total_spent'], row['last_booking'] or '',
        ])
    return response
