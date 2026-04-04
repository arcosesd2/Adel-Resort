from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.generics import ListAPIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import News, Event, Promotion, Pricing, HeroConfig, SiteSettings
from .serializers import NewsSerializer, EventSerializer, PromotionSerializer, PricingSerializer, HeroConfigSerializer, SiteSettingsSerializer
from accounts.permissions import IsSuperAdmin


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
        try:
            from accounts.models import log_activity
            changes = ', '.join(f'{k}={v}' for k, v in request.data.items())
            log_activity(request.user, 'settings', 'Updated site settings', details=changes)
        except Exception:
            pass
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
        try:
            from accounts.models import log_activity
            log_activity(request.user, 'content', 'Updated homepage hero config')
        except Exception:
            pass
        return Response(HeroConfigSerializer(config, context={'request': request}).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
