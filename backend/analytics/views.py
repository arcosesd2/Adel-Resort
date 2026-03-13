from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import ScopedRateThrottle
from django.db.models import Count, Sum, Max
from datetime import timedelta
from django.db.models.functions import TruncDate
from django.utils import timezone

from .models import PageView
from .serializers import TrackPageViewSerializer
from bookings.models import Booking
from payments.models import Payment


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

    return Response({
        'page_views': list(page_views),
        'daily_page_views': daily_page_views,
        'unique_visitors': unique_visitors,
        'total_page_views': total_page_views,
        'net_income': float(net_income),
        'total_sales': total_sales,
        'pending_sales': pending_sales,
        'pending_payments': pending_payments,
    })
