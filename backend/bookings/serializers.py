from datetime import date
from decimal import Decimal
from rest_framework import serializers
from django.db.models import Q
from .models import Booking
from rooms.serializers import RoomListSerializer


class BookingSerializer(serializers.ModelSerializer):
    room_detail = RoomListSerializer(source='room', read_only=True)
    slots_summary = serializers.CharField(read_only=True)
    payment_submitted = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = (
            'id', 'room', 'room_detail', 'check_in', 'check_out', 'guests',
            'slots', 'slots_summary', 'total_price', 'status',
            'special_requests', 'created_at', 'payment_submitted',
        )
        read_only_fields = ('id', 'check_in', 'check_out', 'total_price', 'status', 'created_at')

    def get_payment_submitted(self, obj):
        return hasattr(obj, 'payment')

    def _validate_slots(self, slots):
        """Validate slots structure: list of {date, slot}."""
        if not isinstance(slots, list) or len(slots) == 0:
            raise serializers.ValidationError({'slots': 'At least one slot is required.'})

        valid_slot_types = {'day', 'night'}
        seen = set()
        for entry in slots:
            if not isinstance(entry, dict):
                raise serializers.ValidationError({'slots': 'Each slot must be an object with date and slot.'})
            d = entry.get('date')
            s = entry.get('slot')
            if not d or not s:
                raise serializers.ValidationError({'slots': 'Each slot must have date and slot fields.'})
            if s not in valid_slot_types:
                raise serializers.ValidationError({'slots': f'Invalid slot type: {s}. Must be day or night.'})
            try:
                date.fromisoformat(d)
            except (ValueError, TypeError):
                raise serializers.ValidationError({'slots': f'Invalid date format: {d}. Use YYYY-MM-DD.'})
            key = (d, s)
            if key in seen:
                raise serializers.ValidationError({'slots': f'Duplicate slot: {s} on {d}.'})
            seen.add(key)

        return slots

    def validate(self, data):
        slots = data.get('slots')
        room = data.get('room')
        guests = data.get('guests', 1)

        if slots is not None:
            self._validate_slots(slots)

            # Check day-only rooms
            if room and room.is_day_only:
                night_slots = [s for s in slots if s['slot'] == 'night']
                if night_slots:
                    raise serializers.ValidationError('This accommodation is available for day tours only.')

        if room and guests and guests > room.capacity:
            raise serializers.ValidationError(
                f'This room fits max {room.capacity} persons.'
            )

        # Conflict check: per-slot overlap
        if slots and room:
            slot_dates = [s['date'] for s in slots]
            min_date = min(slot_dates)
            max_date = max(slot_dates)

            existing_bookings = Booking.objects.filter(
                room=room,
                status__in=['confirmed', 'pending'],
                check_in__lte=max_date,
                check_out__gte=min_date,
            )
            instance = self.instance
            if instance:
                existing_bookings = existing_bookings.exclude(pk=instance.pk)

            # Build set of already booked (date, slot) tuples
            booked_set = set()
            for booking in existing_bookings:
                for s in booking.slots:
                    booked_set.add((s['date'], s['slot']))

            # Check for overlaps
            for s in slots:
                key = (s['date'], s['slot'])
                if key in booked_set:
                    raise serializers.ValidationError(
                        f"The {s['slot']} slot on {s['date']} is already booked for this room."
                    )

        return data

    def create(self, validated_data):
        slots = validated_data['slots']
        room = validated_data['room']

        # Auto-derive check_in / check_out from slots
        slot_dates = sorted(s['date'] for s in slots)
        validated_data['check_in'] = slot_dates[0]
        validated_data['check_out'] = slot_dates[-1]

        # Price calc: sum per slot
        day_price = room.day_price or Decimal('0')
        night_price = room.night_price or room.day_price
        total = Decimal('0')
        for s in slots:
            if s['slot'] == 'night':
                total += night_price
            else:
                total += day_price
        validated_data['total_price'] = total

        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class BookingCreateSerializer(BookingSerializer):
    class Meta(BookingSerializer.Meta):
        fields = (
            'id', 'room', 'check_in', 'check_out', 'guests',
            'slots', 'special_requests', 'total_price', 'status', 'created_at',
        )
