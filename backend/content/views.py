from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.generics import ListAPIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import News, Event, Promotion, Pricing, HeroConfig, SiteSettings
from .serializers import (
    NewsSerializer, EventSerializer, PromotionSerializer, PricingSerializer,
    HeroConfigSerializer, SiteSettingsSerializer,
    AdminNewsSerializer, AdminEventSerializer, AdminPromotionSerializer, AdminPricingSerializer,
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
        return Promotion.objects.filter(is_active=True, valid_until__gte=timezone.now().date())


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
@permission_classes([IsSuperAdmin])
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
@permission_classes([IsSuperAdmin])
def admin_news_list(request):
    news = News.objects.all()
    return Response(AdminNewsSerializer(news, many=True, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
@parser_classes([MultiPartParser, FormParser])
def admin_news_create(request):
    serializer = AdminNewsSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        log_activity(request.user, 'content', f'Created news: "{serializer.data["title"]}"')
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsSuperAdmin])
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
@permission_classes([IsSuperAdmin])
def admin_events_list(request):
    events = Event.objects.all()
    return Response(AdminEventSerializer(events, many=True, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
@parser_classes([MultiPartParser, FormParser])
def admin_events_create(request):
    serializer = AdminEventSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        log_activity(request.user, 'content', f'Created event: "{serializer.data["title"]}"')
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsSuperAdmin])
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
@permission_classes([IsSuperAdmin])
def admin_promotions_list(request):
    promotions = Promotion.objects.all()
    return Response(AdminPromotionSerializer(promotions, many=True, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
@parser_classes([MultiPartParser, FormParser])
def admin_promotions_create(request):
    serializer = AdminPromotionSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        log_activity(request.user, 'content', f'Created promotion: "{serializer.data["title"]}"')
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsSuperAdmin])
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
