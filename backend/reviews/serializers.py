from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    room_name = serializers.CharField(source='room.name', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'booking', 'user', 'room', 'room_name', 'rating', 'comment',
                  'is_approved', 'user_name', 'created_at']
        read_only_fields = ['id', 'user', 'room', 'booking', 'is_approved', 'created_at']

    def get_user_name(self, obj):
        return f'{obj.user.first_name} {obj.user.last_name}'.strip() or obj.user.username


class CreateReviewSerializer(serializers.Serializer):
    booking_id = serializers.IntegerField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(max_length=2000, allow_blank=False, trim_whitespace=True)
