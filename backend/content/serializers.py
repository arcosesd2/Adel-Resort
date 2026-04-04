from rest_framework import serializers
from .models import News, Event, Promotion, Pricing, HeroConfig, SiteSettings


class ImageURLMixin:
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class NewsSerializer(ImageURLMixin, serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = News
        fields = ['id', 'title', 'content', 'image', 'image_url', 'published_date']


class EventSerializer(ImageURLMixin, serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = ['id', 'title', 'description', 'image', 'image_url', 'date']


class PromotionSerializer(ImageURLMixin, serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Promotion
        fields = ['id', 'title', 'description', 'image', 'image_url', 'discount_info', 'valid_from', 'valid_until']


class PricingSerializer(serializers.ModelSerializer):
    room_type_display = serializers.CharField(source='get_room_type_display', read_only=True)

    class Meta:
        model = Pricing
        fields = ['id', 'room_type', 'room_type_display', 'label', 'day_price', 'night_price', 'notes', 'order']


class AdminNewsSerializer(ImageURLMixin, serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = News
        fields = ['id', 'title', 'content', 'image', 'image_url', 'published_date', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class AdminEventSerializer(ImageURLMixin, serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = ['id', 'title', 'description', 'image', 'image_url', 'date', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class AdminPromotionSerializer(ImageURLMixin, serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Promotion
        fields = ['id', 'title', 'description', 'image', 'image_url', 'discount_info', 'valid_from', 'valid_until', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class AdminPricingSerializer(serializers.ModelSerializer):
    room_type_display = serializers.CharField(source='get_room_type_display', read_only=True)

    class Meta:
        model = Pricing
        fields = ['id', 'room_type', 'room_type_display', 'label', 'day_price', 'night_price', 'notes', 'order']


class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = ['show_stats', 'show_testimonials', 'updated_at']


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
