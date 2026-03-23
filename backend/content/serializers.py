from rest_framework import serializers
from .models import News, Event, Promotion, Pricing, HeroConfig


class NewsSerializer(serializers.ModelSerializer):
    class Meta:
        model = News
        fields = ['id', 'title', 'content', 'image', 'published_date']


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


class HeroConfigSerializer(serializers.ModelSerializer):
    video_url = serializers.SerializerMethodField()
    poster_url = serializers.SerializerMethodField()

    class Meta:
        model = HeroConfig
        fields = ['video', 'poster', 'video_url', 'poster_url', 'updated_at']
        extra_kwargs = {'video': {'required': False}, 'poster': {'required': False}}

    def get_video_url(self, obj):
        if obj.video:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.video.url)
            return obj.video.url
        return None

    def get_poster_url(self, obj):
        if obj.poster:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.poster.url)
            return obj.poster.url
        return None
