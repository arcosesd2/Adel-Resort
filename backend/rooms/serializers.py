from rest_framework import serializers
from .models import Room, RoomImage


class RoomImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomImage
        fields = ('id', 'image', 'alt_text', 'is_primary', 'order')


class RoomSerializer(serializers.ModelSerializer):
    images = RoomImageSerializer(many=True, read_only=True)
    room_type_display = serializers.CharField(source='get_room_type_display', read_only=True)
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = (
            'id', 'name', 'room_type', 'room_type_display', 'description',
            'day_price', 'night_price', 'is_day_only', 'capacity', 'size_sqm',
            'amenities', 'is_active', 'images', 'primary_image', 'created_at',
        )

    def get_primary_image(self, obj):
        primary = obj.images.filter(is_primary=True).first() or obj.images.first()
        if primary:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(primary.image.url)
            return primary.image.url
        return None


class RoomListSerializer(serializers.ModelSerializer):
    images = RoomImageSerializer(many=True, read_only=True)
    room_type_display = serializers.CharField(source='get_room_type_display', read_only=True)
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = (
            'id', 'name', 'room_type', 'room_type_display',
            'day_price', 'night_price', 'is_day_only', 'capacity',
            'primary_image', 'amenities', 'images',
        )

    def get_primary_image(self, obj):
        primary = obj.images.filter(is_primary=True).first() or obj.images.first()
        if primary:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(primary.image.url)
            return primary.image.url
        return None
