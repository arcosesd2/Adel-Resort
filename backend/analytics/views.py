from rest_framework.decorators import api_view, permission_classes, throttle_classes, parser_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from accounts.permissions import IsSuperAdmin
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import ScopedRateThrottle
from django.db.models import Count, Sum, Max, Avg, F, Value, Q
from django.db.models.functions import Concat, TruncDate, TruncMonth
from datetime import timedelta, date, datetime
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
@permission_classes([IsAdminUser])
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

    # Business metrics — net income = sum of all confirmed + completed bookings
    net_income = (
        Booking.objects
        .filter(status__in=['confirmed', 'completed'])
        .aggregate(total=Sum('total_price'))['total']
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
@permission_classes([IsAdminUser])
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
@permission_classes([IsAdminUser])
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

    return response


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def debug_reset(request):
    DEBUG_PIN = '6282208'

    pin = request.data.get('pin', '')
    if pin != DEBUG_PIN:
        return Response({'detail': 'Invalid PIN.'}, status=status.HTTP_403_FORBIDDEN)

    categories = request.data.get('categories', [])
    if not categories:
        return Response({'detail': 'No categories selected.'}, status=status.HTTP_400_BAD_REQUEST)

    valid_categories = [
        'bookings', 'payments', 'reviews', 'chat', 'notifications',
        'activity_logs', 'login_attempts', 'registered_devices',
        'analytics', 'favorites',
    ]
    invalid = [c for c in categories if c not in valid_categories]
    if invalid:
        return Response({'detail': f'Invalid categories: {", ".join(invalid)}'}, status=status.HTTP_400_BAD_REQUEST)

    results = {}

    if 'bookings' in categories:
        from vouchers.models import VoucherUsage
        deleted_voucher_usage, _ = VoucherUsage.objects.all().delete()
        deleted_bookings, _ = Booking.objects.all().delete()
        results['bookings'] = deleted_bookings
        results['voucher_usages'] = deleted_voucher_usage

    if 'payments' in categories:
        import cloudinary.uploader
        from payments.models import Payment
        proofs = Payment.objects.filter(proof_of_payment__isnull=False).exclude(proof_of_payment='').values_list('proof_of_payment', flat=True)
        deleted_count = 0
        for proof in proofs:
            try:
                cloudinary.uploader.destroy(proof, invalidate=True)
            except Exception:
                pass
            deleted_count += 1
        deleted_payments, _ = Payment.objects.all().delete()
        results['payments'] = deleted_payments
        results['payment_proofs_deleted'] = deleted_count

    if 'reviews' in categories:
        deleted_reviews, _ = Review.objects.all().delete()
        results['reviews'] = deleted_reviews

    if 'chat' in categories:
        from chat.models import Conversation, Message
        deleted_messages, _ = Message.objects.all().delete()
        deleted_conversations, _ = Conversation.objects.all().delete()
        results['conversations'] = deleted_conversations
        results['chat_messages'] = deleted_messages

    if 'notifications' in categories:
        from accounts.models import Notification
        deleted_notifications, _ = Notification.objects.all().delete()
        results['notifications'] = deleted_notifications

    if 'activity_logs' in categories:
        from accounts.models import ActivityLog
        deleted_logs, _ = ActivityLog.objects.all().delete()
        results['activity_logs'] = deleted_logs

    if 'login_attempts' in categories:
        from accounts.models import LoginAttempt
        deleted_attempts, _ = LoginAttempt.objects.all().delete()
        results['login_attempts'] = deleted_attempts

    if 'registered_devices' in categories:
        from accounts.models import RegisteredDevice
        deleted_devices, _ = RegisteredDevice.objects.all().delete()
        results['registered_devices'] = deleted_devices

    if 'analytics' in categories:
        deleted_pageviews, _ = PageView.objects.all().delete()
        results['page_views'] = deleted_pageviews

    if 'favorites' in categories:
        from accounts.models import FavoriteRoom
        deleted_favorites, _ = FavoriteRoom.objects.all().delete()
        results['favorite_rooms'] = deleted_favorites

    try:
        from accounts.models import log_activity
        log_activity(request.user, 'debug_reset', f'Debug reset performed: {", ".join(categories)}')
    except Exception:
        pass

    return Response({'detail': 'Debug reset completed.', 'results': results})


BACKUP_DIR = '/home/adel/backups'
DEBUG_PIN = '6282208'


def _validate_pin(request):
    pin = request.data.get('pin', '') or request.query_params.get('pin', '')
    return pin == DEBUG_PIN


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def backup_list(request):
    if not _validate_pin(request):
        return Response({'detail': 'Invalid PIN.'}, status=status.HTTP_403_FORBIDDEN)
    import os
    backups = []
    if os.path.isdir(BACKUP_DIR):
        for f in sorted(os.listdir(BACKUP_DIR), reverse=True):
            if f.endswith('.sql.gz'):
                filepath = os.path.join(BACKUP_DIR, f)
                stat = os.stat(filepath)
                backups.append({
                    'filename': f,
                    'size': stat.st_size,
                    'size_display': f'{stat.st_size / (1024 * 1024):.2f} MB' if stat.st_size > 1024 * 1024 else f'{stat.st_size / 1024:.1f} KB',
                    'created_at': datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                })
    return Response(backups)


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def backup_create(request):
    if not _validate_pin(request):
        return Response({'detail': 'Invalid PIN.'}, status=status.HTTP_403_FORBIDDEN)
    import os, subprocess
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    filename = f'adel_resort_{timestamp}.sql.gz'
    filepath = os.path.join(BACKUP_DIR, filename)
    try:
        result = subprocess.run(
            ['pg_dump', 'adel_resort'],
            capture_output=True, text=True, timeout=300,
        )
        if result.returncode != 0:
            return Response({'detail': f'Backup failed: {result.stderr}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        import gzip
        with gzip.open(filepath, 'wb') as f:
            f.write(result.stdout.encode('utf-8') if isinstance(result.stdout, str) else result.stdout)
        stat = os.stat(filepath)
        try:
            from accounts.models import log_activity
            log_activity(request.user, 'backup_create', f'Manual backup created: {filename}')
        except Exception:
            pass
        return Response({
            'detail': 'Backup created successfully.',
            'filename': filename,
            'size': stat.st_size,
            'size_display': f'{stat.st_size / (1024 * 1024):.2f} MB' if stat.st_size > 1024 * 1024 else f'{stat.st_size / 1024:.1f} KB',
        })
    except Exception as e:
        return Response({'detail': f'Backup failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def backup_download(request):
    if not _validate_pin(request):
        return Response({'detail': 'Invalid PIN.'}, status=status.HTTP_403_FORBIDDEN)
    import os
    filename = request.data.get('filename', '')
    if not filename or '..' in filename or '/' in filename:
        return Response({'detail': 'Invalid filename.'}, status=status.HTTP_400_BAD_REQUEST)
    filepath = os.path.join(BACKUP_DIR, filename)
    if not os.path.isfile(filepath):
        return Response({'detail': 'Backup file not found.'}, status=status.HTTP_404_NOT_FOUND)
    from django.http import FileResponse
    return FileResponse(open(filepath, 'rb'), as_attachment=True, filename=filename)


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
@parser_classes([MultiPartParser, FormParser])
def backup_restore(request):
    if not _validate_pin(request):
        return Response({'detail': 'Invalid PIN.'}, status=status.HTTP_403_FORBIDDEN)
    import os, subprocess, gzip
    backup_file = request.FILES.get('file')
    if not backup_file:
        return Response({'detail': 'No backup file provided.'}, status=status.HTTP_400_BAD_REQUEST)
    if not backup_file.name.endswith('.sql.gz'):
        return Response({'detail': 'File must be a .sql.gz backup.'}, status=status.HTTP_400_BAD_REQUEST)

    os.makedirs(BACKUP_DIR, exist_ok=True)
    safety_timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    safety_filename = f'adel_resort_pre_restore_{safety_timestamp}.sql.gz'
    safety_filepath = os.path.join(BACKUP_DIR, safety_filename)

    try:
        result = subprocess.run(
            ['pg_dump', 'adel_resort'],
            capture_output=True, text=True, timeout=300,
        )
        if result.returncode != 0:
            return Response({'detail': f'Safety backup failed: {result.stderr}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        with gzip.open(safety_filepath, 'wb') as f:
            f.write(result.stdout.encode('utf-8') if isinstance(result.stdout, str) else result.stdout)

        upload_path = os.path.join(BACKUP_DIR, f'upload_{safety_timestamp}.sql.gz')
        with open(upload_path, 'wb') as f:
            for chunk in backup_file.chunks():
                f.write(chunk)

        with gzip.open(upload_path, 'rb') as f:
            sql_content = f.read()

        restore_result = subprocess.run(
            ['psql', 'adel_resort'],
            input=sql_content,
            capture_output=True, timeout=600,
        )
        os.remove(upload_path)

        if restore_result.returncode != 0:
            return Response({
                'detail': 'Restore completed with errors.',
                'safety_backup': safety_filename,
                'output': restore_result.stderr.decode('utf-8', errors='replace') if isinstance(restore_result.stderr, bytes) else restore_result.stderr,
            }, status=status.HTTP_207_MULTI_STATUS)

        try:
            from accounts.models import log_activity
            log_activity(request.user, 'backup_restore', f'Database restored from {backup_file.name}. Safety backup: {safety_filename}')
        except Exception:
            pass

        return Response({
            'detail': 'Database restored successfully.',
            'safety_backup': safety_filename,
        })
    except Exception as e:
        if os.path.isfile(upload_path):
            os.remove(upload_path)
        return Response({'detail': f'Restore failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
