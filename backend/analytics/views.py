from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from accounts.permissions import IsSuperAdmin
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import ScopedRateThrottle
from django.db.models import Count, Sum, Max, Avg, F, Value, Q
from django.db.models.functions import Concat, TruncDate, TruncMonth
from datetime import timedelta, date
from django.utils import timezone

from .models import PageView
from .serializers import TrackPageViewSerializer
from bookings.models import Booking
from payments.models import Payment
from rooms.models import Room
from reviews.models import Review


class AnalyticsRateThrottle(ScopedRateThrottle):
    scope = 'analytics'


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AnalyticsRateThrottle])
def track_page_view(request):
    serializer = TrackPageViewSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    PageView.objects.create(**serializer.validated_data)
    return Response(status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_stats(request):
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

    return Response({
        'total_guests': total_guests,
        'total_rooms': total_rooms,
        'years_of_service': round(years, 1),
        'average_rating': round(avg_rating, 1) if avg_rating else None,
    })


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def admin_dashboard(request):
    # Page view analytics
    page_views = (
        PageView.objects
        .values('page_path')
        .annotate(views=Count('id'), last_viewed=Max('timestamp'))
        .order_by('-last_viewed')
    )
    unique_visitors = PageView.objects.values('visitor_id').distinct().count()
    total_page_views = PageView.objects.count()

    # Daily page views (last 90 days)
    ninety_days_ago = timezone.now() - timedelta(days=90)
    daily_page_views = list(
        PageView.objects
        .filter(timestamp__gte=ninety_days_ago)
        .annotate(view_date=TruncDate('timestamp'))
        .values('page_path', 'view_date')
        .annotate(views=Count('id'))
        .order_by('page_path', '-view_date')
    )

    # Business metrics
    net_income = (
        Payment.objects
        .filter(status='succeeded')
        .aggregate(total=Sum('amount'))['total']
    ) or 0

    total_sales = Booking.objects.filter(
        status__in=['confirmed', 'completed']
    ).count()

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
        PageView.objects
        .filter(timestamp__gte=ninety_days_ago)
        .values('visitor_id')
        .annotate(
            total_views=Count('id'),
            pages_visited=Count('page_path', distinct=True),
            last_seen=Max('timestamp'),
        )
        .order_by('-total_views')[:100]
    )

    # Per-visitor page view details
    visitor_page_views = list(
        PageView.objects
        .filter(timestamp__gte=ninety_days_ago)
        .annotate(view_date=TruncDate('timestamp'))
        .values('visitor_id', 'page_path', 'view_date')
        .annotate(views=Count('id'))
        .order_by('visitor_id', '-view_date')
    )

    # Revenue by month — last 12 months
    twelve_months_ago = timezone.now() - timedelta(days=365)
    revenue_by_month = list(
        Payment.objects
        .filter(status='succeeded', created_at__gte=twelve_months_ago)
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(revenue=Sum('amount'))
        .order_by('month')
    )
    for entry in revenue_by_month:
        entry['month'] = entry['month'].strftime('%Y-%m')
        entry['revenue'] = float(entry['revenue'])

    # Revenue by day — last 30 days
    thirty_days_ago = timezone.now() - timedelta(days=30)
    revenue_by_day = list(
        Payment.objects
        .filter(status='succeeded', created_at__gte=thirty_days_ago)
        .annotate(day=TruncDate('created_at'))
        .values('day')
        .annotate(revenue=Sum('amount'))
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
        slots_per_day = 1 if room.is_day_only else 2
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
            'total_booked_slots': total_booked_slots,
            'max_slots': max_slots,
            'occupancy_pct': occupancy_pct,
            'upcoming_bookings': upcoming_bookings,
        })

    return Response({
        'page_views': list(page_views),
        'daily_page_views': daily_page_views,
        'unique_visitors': unique_visitors,
        'total_page_views': total_page_views,
        'net_income': float(net_income),
        'total_sales': total_sales,
        'pending_sales': pending_sales,
        'pending_payments': pending_payments,
        'unique_guests_count': len(unique_guests),
        'unique_guests': unique_guests,
        'guest_bookings': guest_bookings,
        'unique_visitors_list': unique_visitors_list,
        'visitor_page_views': visitor_page_views,
        'revenue_by_month': revenue_by_month,
        'revenue_by_day': revenue_by_day,
        'room_occupancy': room_occupancy,
    })


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
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
@permission_classes([IsSuperAdmin])
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
            p.created_at.strftime('%Y-%m-%d %H:%M'),
            p.booking.reference_code, guest_name, p.booking.room.name,
            p.amount,
            getattr(p, 'payment_type', 'full'),
        ])

    return response
