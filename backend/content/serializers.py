from rest_framework import serializers
from .models import Event, Promotion, Pricing


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['id', 'title', 'description', 'image', 'date']


class PromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promotion
        fields = ['id', 'title', 'description', 'image', 'discount_info', 'valid_from', 'valid_until']


class PricingSerializer(serializers.ModelSerializer):
    room_type_display = serializers.CharField(source='get_room_type_display', read_only=True)

    class Meta:
        model = Pricing
        fields = ['id', 'room_type', 'room_type_display', 'label', 'day_price', 'night_price', 'notes', 'order']
