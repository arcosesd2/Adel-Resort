from collections import Counter

from .models import Booking

ACTIVE_BOOKING_STATUSES = ['confirmed', 'pending']


def find_slot_conflict(room, slots, *, statuses=None, exclude_pk=None):
    slot_dates = [slot['date'] for slot in slots]
    min_date = min(slot_dates)
    max_date = max(slot_dates)
    booking_statuses = statuses or ACTIVE_BOOKING_STATUSES

    existing_bookings = Booking.objects.filter(
        room=room,
        status__in=booking_statuses,
        check_in__lte=max_date,
        check_out__gte=min_date,
    )
    if exclude_pk:
        existing_bookings = existing_bookings.exclude(pk=exclude_pk)

    booked_counts = Counter()
    for booking in existing_bookings.only('slots'):
        for slot in booking.slots:
            booked_counts[(slot['date'], slot['slot'])] += 1

    max_rooms = room.max_rooms or 1
    for slot in slots:
        key = (slot['date'], slot['slot'])
        if booked_counts[key] >= max_rooms:
            return f"The {slot['slot']} slot on {slot['date']} is fully booked for this room."
    return None
