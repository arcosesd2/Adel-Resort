from django.db import models as db_models
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes, throttle_classes
from rest_framework.throttling import AnonRateThrottle
from rest_framework.generics import ListAPIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from .models import News, Event, Promotion, Pricing, HeroConfig, SiteSettings, NewsletterSubscriber
from .serializers import (
    NewsSerializer, EventSerializer, PromotionSerializer, PricingSerializer,
    HeroConfigSerializer, SiteSettingsSerializer,
    AdminNewsSerializer, AdminEventSerializer, AdminPromotionSerializer, AdminPricingSerializer,
    NewsletterSubscribeSerializer, NewsletterSubscriberSerializer,
)
from .emails import (
    send_newsletter_welcome,
    send_subscription_confirmation,
    send_event_announcement,
    send_promotion_announcement,
)
from accounts.permissions import IsSuperAdmin
from accounts.models import log_activity


class NewsListView(ListAPIView):
    serializer_class = NewsSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return News.objects.filter(is_active=True)


class EventListView(ListAPIView):
    serializer_class = EventSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Event.objects.filter(is_active=True)


class PromotionListView(ListAPIView):
    serializer_class = PromotionSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        today = timezone.now().date()
        return Promotion.objects.filter(
            is_active=True,
        ).filter(
            models.Q(schedule_type='permanent')
            | models.Q(schedule_type='recurring')
            | db_models.Q(schedule_type='duration', valid_from__lte=today, valid_until__gte=today)
        )


class PricingListView(ListAPIView):
    serializer_class = PricingSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        return Pricing.objects.all()


@api_view(['GET'])
@permission_classes([AllowAny])
def site_settings(request):
    settings = SiteSettings.load()
    return Response(SiteSettingsSerializer(settings).data)


@api_view(['PATCH'])
@permission_classes([IsSuperAdmin])
def site_settings_update(request):
    settings = SiteSettings.load()
    serializer = SiteSettingsSerializer(settings, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        changes = ', '.join(f'{k}={v}' for k, v in request.data.items())
        log_activity(request.user, 'settings', 'Updated site settings', details=changes)
        return Response(SiteSettingsSerializer(settings).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def hero_config(request):
    config = HeroConfig.load()
    return Response(HeroConfigSerializer(config, context={'request': request}).data)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser])
def hero_config_update(request):
    config = HeroConfig.load()
    # Handle explicit removal of video/poster
    if request.data.get('remove_video') == 'true' and config.video:
        config.video.delete(save=False)
        config.video = ''
        config.save()
    if request.data.get('remove_poster') == 'true' and config.poster:
        config.poster.delete(save=False)
        config.poster = ''
        config.save()
    serializer = HeroConfigSerializer(config, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        log_activity(request.user, 'content', 'Updated homepage hero config')
        return Response(HeroConfigSerializer(config, context={'request': request}).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ───── Admin News CRUD ─────

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_news_list(request):
    news = News.objects.all()
    return Response(AdminNewsSerializer(news, many=True, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser])
def admin_news_create(request):
    serializer = AdminNewsSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        log_activity(request.user, 'content', f'Created news: "{serializer.data["title"]}"')
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser])
def admin_news_detail(request, pk):
    try:
        news = News.objects.get(pk=pk)
    except News.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(AdminNewsSerializer(news, context={'request': request}).data)

    if request.method == 'DELETE':
        title = news.title
        news.delete()
        log_activity(request.user, 'content', f'Deleted news: "{title}"')
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = AdminNewsSerializer(news, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        log_activity(request.user, 'content', f'Updated news: "{news.title}"')
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ───── Admin Events CRUD ─────

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_events_list(request):
    events = Event.objects.all()
    return Response(AdminEventSerializer(events, many=True, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser])
def admin_events_create(request):
    serializer = AdminEventSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        log_activity(request.user, 'content', f'Created event: "{serializer.data["title"]}"')
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser])
def admin_events_detail(request, pk):
    try:
        event = Event.objects.get(pk=pk)
    except Event.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(AdminEventSerializer(event, context={'request': request}).data)

    if request.method == 'DELETE':
        title = event.title
        event.delete()
        log_activity(request.user, 'content', f'Deleted event: "{title}"')
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = AdminEventSerializer(event, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        log_activity(request.user, 'content', f'Updated event: "{event.title}"')
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ───── Admin Promotions CRUD ─────

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_promotions_list(request):
    promotions = Promotion.objects.all()
    return Response(AdminPromotionSerializer(promotions, many=True, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser])
def admin_promotions_create(request):
    serializer = AdminPromotionSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        log_activity(request.user, 'content', f'Created promotion: "{serializer.data["title"]}"')
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser])
def admin_promotions_detail(request, pk):
    try:
        promo = Promotion.objects.get(pk=pk)
    except Promotion.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(AdminPromotionSerializer(promo, context={'request': request}).data)

    if request.method == 'DELETE':
        title = promo.title
        promo.delete()
        log_activity(request.user, 'content', f'Deleted promotion: "{title}"')
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = AdminPromotionSerializer(promo, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        log_activity(request.user, 'content', f'Updated promotion: "{promo.title}"')
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ───── Admin Pricing CRUD ─────

@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def admin_pricing_list(request):
    pricing = Pricing.objects.all()
    return Response(AdminPricingSerializer(pricing, many=True).data)


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def admin_pricing_create(request):
    serializer = AdminPricingSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        log_activity(request.user, 'content', f'Created pricing: "{serializer.data["label"]}"')
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsSuperAdmin])
def admin_pricing_detail(request, pk):
    try:
        pricing = Pricing.objects.get(pk=pk)
    except Pricing.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        label = pricing.label
        pricing.delete()
        log_activity(request.user, 'content', f'Deleted pricing: "{label}"')
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = AdminPricingSerializer(pricing, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        log_activity(request.user, 'content', f'Updated pricing: "{pricing.label}"')
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ───── Newsletter (Public) ────���

class NewsletterThrottle(AnonRateThrottle):
    rate = '5/hour'


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([NewsletterThrottle])
def newsletter_subscribe(request):
    serializer = NewsletterSubscribeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    email = serializer.validated_data['email'].strip().lower()
    subscriber, created = NewsletterSubscriber.objects.get_or_create(email=email)

    # Reactivate a previously unsubscribed record
    if not created and not subscriber.is_active:
        subscriber.is_active = True
        subscriber.save(update_fields=['is_active'])

    if not subscriber.is_confirmed:
        send_subscription_confirmation(subscriber)
        return Response(
            {'detail': "Please check your email to confirm your subscription."},
            status=status.HTTP_200_OK,
        )

    # Already confirmed — just acknowledge
    return Response({'detail': 'You are already subscribed.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def newsletter_confirm(request):
    token = (request.data.get('token') or '').strip()
    if not token:
        return Response({'detail': 'Token required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        sub = NewsletterSubscriber.objects.get(confirmation_token=token)
    except NewsletterSubscriber.DoesNotExist:
        return Response({'detail': 'Invalid or expired token.'}, status=status.HTTP_404_NOT_FOUND)

    if not sub.is_confirmed:
        sub.is_confirmed = True
        sub.is_active = True
        sub.confirmed_at = timezone.now()
        sub.save(update_fields=['is_confirmed', 'is_active', 'confirmed_at'])
        send_newsletter_welcome(sub)
    return Response({'detail': 'Subscription confirmed. Welcome aboard!'})


@api_view(['POST'])
@permission_classes([AllowAny])
def newsletter_unsubscribe(request):
    token = (request.data.get('token') or '').strip()
    if not token:
        return Response({'detail': 'Token required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        sub = NewsletterSubscriber.objects.get(unsubscribe_token=token)
    except NewsletterSubscriber.DoesNotExist:
        return Response({'detail': 'Invalid token.'}, status=status.HTTP_404_NOT_FOUND)
    if sub.is_active:
        sub.is_active = False
        sub.save(update_fields=['is_active'])
    return Response({'detail': 'Unsubscribed successfully.'}, status=status.HTTP_200_OK)


# ───── Admin Newsletter & Broadcast ─────

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_subscribers_list(request):
    subs = NewsletterSubscriber.objects.all()
    return Response(NewsletterSubscriberSerializer(subs, many=True).data)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_subscriber_delete(request, pk):
    try:
        sub = NewsletterSubscriber.objects.get(pk=pk)
    except NewsletterSubscriber.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    email = sub.email
    sub.delete()
    log_activity(request.user, 'content', f'Deleted subscriber: {email}')
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_event_broadcast(request, pk):
    try:
        event = Event.objects.get(pk=pk)
    except Event.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if not event.is_active:
        return Response({'detail': 'Event is not active.'}, status=status.HTTP_400_BAD_REQUEST)
    sent = send_event_announcement(event)
    event.announcement_sent_at = timezone.now()
    event.save(update_fields=['announcement_sent_at'])
    log_activity(request.user, 'content', f'Broadcast event "{event.title}" to {sent} recipients')
    return Response({'sent': sent, 'announcement_sent_at': event.announcement_sent_at})


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_promotion_broadcast(request, pk):
    try:
        promo = Promotion.objects.get(pk=pk)
    except Promotion.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if not promo.is_active:
        return Response({'detail': 'Promotion is not active.'}, status=status.HTTP_400_BAD_REQUEST)
    sent = send_promotion_announcement(promo)
    promo.announcement_sent_at = timezone.now()
    promo.save(update_fields=['announcement_sent_at'])
    log_activity(request.user, 'content', f'Broadcast promotion "{promo.title}" to {sent} recipients')
    return Response({'sent': sent, 'announcement_sent_at': promo.announcement_sent_at})
