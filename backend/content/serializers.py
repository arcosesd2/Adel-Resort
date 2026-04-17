from rest_framework import serializers
from .models import News, Event, Promotion, Pricing, HeroConfig, SiteSettings, NewsletterSubscriber


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
    discount_type_display = serializers.CharField(source='get_discount_type_display', read_only=True)
    schedule_type_display = serializers.CharField(source='get_schedule_type_display', read_only=True)

    class Meta:
        model = Promotion
        fields = ['id', 'title', 'description', 'image', 'image_url', 'discount_type', 'discount_type_display', 'discount_value', 'schedule_type', 'schedule_type_display', 'valid_from', 'valid_until', 'applicable_days', 'room_types', 'allows_voucher', 'min_booking_amount']


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
        fields = ['id', 'title', 'description', 'image', 'image_url', 'date', 'is_active', 'announcement_sent_at', 'created_at', 'updated_at']
        read_only_fields = ['announcement_sent_at', 'created_at', 'updated_at']


class AdminPromotionSerializer(ImageURLMixin, serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    discount_type_display = serializers.CharField(source='get_discount_type_display', read_only=True)
    schedule_type_display = serializers.CharField(source='get_schedule_type_display', read_only=True)

    class Meta:
        model = Promotion
        fields = ['id', 'title', 'description', 'image', 'image_url', 'discount_type', 'discount_type_display', 'discount_value', 'schedule_type', 'schedule_type_display', 'valid_from', 'valid_until', 'applicable_days', 'room_types', 'allows_voucher', 'min_booking_amount', 'is_active', 'announcement_sent_at', 'created_at', 'updated_at']
        read_only_fields = ['announcement_sent_at', 'created_at', 'updated_at']


class AdminPricingSerializer(serializers.ModelSerializer):
    room_type_display = serializers.CharField(source='get_room_type_display', read_only=True)

    class Meta:
        model = Pricing
        fields = ['id', 'room_type', 'room_type_display', 'label', 'day_price', 'night_price', 'notes', 'order']


class SiteSettingsSerializer(serializers.ModelSerializer):
    featured_mode_display = serializers.CharField(source='get_featured_mode_display', read_only=True)

    class Meta:
        model = SiteSettings
        fields = ['show_stats', 'show_testimonials', 'featured_mode', 'featured_mode_display', 'weekend_walkin_only', 'updated_at']


class NewsletterSubscribeSerializer(serializers.Serializer):
    email = serializers.EmailField()


class NewsletterSubscriberSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsletterSubscriber
        fields = ['id', 'email', 'is_active', 'created_at']
        read_only_fields = fields


class HeroConfigSerializer(serializers.ModelSerializer):
    video_url = serializers.SerializerMethodField()
    poster_url = serializers.SerializerMethodField()

    class Meta:
        model = HeroConfig
        fields = ['video', 'poster', 'video_url', 'poster_url', 'updated_at']
        extra_kwargs = {'video': {'required': False}, 'poster': {'required': False}}

    def validate_video(self, value):
        if value:
            allowed_types = ['video/mp4', 'video/webm']
            if value.content_type not in allowed_types:
                raise serializers.ValidationError('Only MP4 and WebM videos are allowed.')
            if not value.name.lower().endswith(('.mp4', '.webm')):
                raise serializers.ValidationError('Video file must have a .mp4 or .webm extension.')
        return value

    def validate_poster(self, value):
        if value:
            allowed_types = ['image/jpeg', 'image/png', 'image/webp']
            if value.content_type not in allowed_types:
                raise serializers.ValidationError('Only JPEG, PNG, or WebP images are allowed.')
            try:
                from PIL import Image
                img = Image.open(value)
                img.verify()
                value.seek(0)
            except Exception:
                raise serializers.ValidationError('File is not a valid image.')
        return value

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
