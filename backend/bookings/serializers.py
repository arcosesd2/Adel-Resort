from rest_framework import serializers
from django.db.models import Q
from .models import Booking
from rooms.serializers import RoomListSerializer


class BookingSerializer(serializers.ModelSerializer):
    room_detail = RoomListSerializer(source='room', read_only=True)
    nights = serializers.IntegerField(read_only=True)

    class Meta:
        model = Booking
        fields = (
            'id', 'room', 'room_detail', 'check_in', 'check_out', 'guests',
            'total_price', 'status', 'stripe_payment_intent_id',
            'special_requests', 'nights', 'created_at',
        )
        read_only_fields = ('id', 'total_price', 'status', 'stripe_payment_intent_id', 'created_at')

    def validate(self, data):
        check_in = data.get('check_in')
        check_out = data.get('check_out')
        room = data.get('room')
        guests = data.get('guests', 1)

        if check_in and check_out:
            if check_in >= check_out:
                raise serializers.ValidationError('Check-out must be after check-in.')

        if room and guests and guests > room.capacity:
            raise serializers.ValidationError(
                f'This room fits max {room.capacity} guests.'
            )

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
        check_in = validated_data['check_in']
        check_out = validated_data['check_out']
        nights = (check_out - check_in).days
        validated_data['total_price'] = room.price_per_night * nights
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class BookingCreateSerializer(BookingSerializer):
    class Meta(BookingSerializer.Meta):
        fields = (
            'id', 'room', 'check_in', 'check_out', 'guests',
            'special_requests', 'total_price', 'status', 'created_at',
        )
