from django.db import migrations, models


def backfill_reference_codes(apps, schema_editor):
    Booking = apps.get_model('bookings', 'Booking')
    for booking in Booking.objects.all():
        year = booking.created_at.year if booking.created_at else 2026
        booking.reference_code = f'ABR-{year}-{booking.pk:04d}'
        booking.save(update_fields=['reference_code'])


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0004_slots_replace_tour_type'),
    ]

    operations = [
        # Step 1: Add field without unique constraint
        migrations.AddField(
            model_name='booking',
            name='reference_code',
            field=models.CharField(blank=True, default='', max_length=20),
            preserve_default=False,
        ),
        # Step 2: Backfill existing rows
        migrations.RunPython(backfill_reference_codes, migrations.RunPython.noop),
        # Step 3: Add unique constraint
        migrations.AlterField(
            model_name='booking',
            name='reference_code',
            field=models.CharField(blank=True, max_length=20, unique=True),
        ),
    ]
