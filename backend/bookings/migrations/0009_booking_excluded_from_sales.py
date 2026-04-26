from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0008_alter_booking_special_requests'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='excluded_from_sales',
            field=models.BooleanField(default=False),
        ),
    ]
