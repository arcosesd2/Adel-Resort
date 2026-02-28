from django.utils import timezone
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny
from .models import Event, Promotion, Pricing
from .serializers import EventSerializer, PromotionSerializer, PricingSerializer


class EventListView(ListAPIView):
    serializer_class = EventSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Event.objects.filter(is_active=True, date__gte=timezone.now().date())


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
