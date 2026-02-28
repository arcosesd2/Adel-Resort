from rest_framework import serializers
from django.db.models import Q
from .models import Booking
from rooms.serializers import RoomListSerializer


class BookingSerializer(serializers.ModelSerializer):
    room_detail = RoomListSerializer(source='room', read_only=True)
    nights = serializers.IntegerField(read_only=True)
    tour_type_display = serializers.CharField(source='get_tour_type_display', read_only=True)
    payment_submitted = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = (
            'id', 'room', 'room_detail', 'check_in', 'check_out', 'guests',
            'tour_type', 'tour_type_display', 'total_price', 'status',
            'special_requests', 'nights', 'created_at', 'payment_submitted',
        )
        read_only_fields = ('id', 'total_price', 'status', 'created_at')

    def get_payment_submitted(self, obj):
        return hasattr(obj, 'payment')

    def validate(self, data):
        check_in = data.get('check_in')
        check_out = data.get('check_out')
        room = data.get('room')
        guests = data.get('guests', 1)
        tour_type = data.get('tour_type', 'day')

        if check_in and check_out:
            if check_in >= check_out:
                raise serializers.ValidationError('Check-out must be after check-in.')

        if room and guests and guests > room.capacity:
            raise serializers.ValidationError(
                f'This room fits max {room.capacity} persons.'
            )

        if room and room.is_day_only and tour_type == 'night':
            raise serializers.ValidationError('This accommodation is available for day tours only.')

        if check_in and check_out and room:
            conflicting = Booking.objects.filter(
                room=room,
                status__in=['confirmed', 'pending'],
            ).filter(
                Q(check_in__lt=check_out) & Q(check_out__gt=check_in)
            )
            instance = self.instance
            if instance:
                conflicting = conflicting.exclude(pk=instance.pk)
            if conflicting.exists():
                raise serializers.ValidationError('Room is not available for the selected dates.')

        return data

    def create(self, validated_data):
        room = validated_data['room']
        tour_type = validated_data.get('tour_type', 'day')
        if tour_type == 'night' and room.night_price:
            validated_data['total_price'] = room.night_price
        else:
            validated_data['total_price'] = room.day_price
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class BookingCreateSerializer(BookingSerializer):
    class Meta(BookingSerializer.Meta):
        fields = (
            'id', 'room', 'check_in', 'check_out', 'guests',
            'tour_type', 'special_requests', 'total_price', 'status', 'created_at',
        )
