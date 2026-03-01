"""Replace tour_type with slots JSONField."""

from django.db import migrations, models
import datetime


def tour_type_to_slots(apps, schema_editor):
    """Convert existing bookings' tour_type + date range → slots list."""
    Booking = apps.get_model('bookings', 'Booking')
    for booking in Booking.objects.all():
        tour_type = booking.tour_type or 'day'
        slots = []
        current = booking.check_in
        while current < booking.check_out:
            slots.append({'date': current.isoformat(), 'slot': tour_type})
            current += datetime.timedelta(days=1)
        # If no dates (same day), add at least check_in
        if not slots:
            slots.append({'date': booking.check_in.isoformat(), 'slot': tour_type})
        booking.slots = slots
        booking.save(update_fields=['slots'])


def slots_to_tour_type(apps, schema_editor):
    """Reverse: pick the first slot's type as the tour_type."""
    Booking = apps.get_model('bookings', 'Booking')
    for booking in Booking.objects.all():
        if booking.slots:
            booking.tour_type = booking.slots[0].get('slot', 'day')
        else:
            booking.tour_type = 'day'
        booking.save(update_fields=['tour_type'])


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0003_remove_booking_stripe_payment_intent_id'),
    ]

    operations = [
        # Step 1: Add slots field
        migrations.AddField(
            model_name='booking',
            name='slots',
            field=models.JSONField(default=list),
        ),
        # Step 2: Migrate data
        migrations.RunPython(tour_type_to_slots, slots_to_tour_type),
        # Step 3: Remove tour_type
        migrations.RemoveField(
            model_name='booking',
            name='tour_type',
        ),
    ]
