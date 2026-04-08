from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_activitylog'),
    ]

    operations = [
        migrations.CreateModel(
            name='NotificationPreference',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('receive_events', models.BooleanField(default=True)),
                ('receive_promotions', models.BooleanField(default=True)),
                ('receive_booking_updates', models.BooleanField(default=True)),
                ('receive_checkin_reminders', models.BooleanField(default=True)),
                ('receive_review_requests', models.BooleanField(default=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=models.deletion.CASCADE, related_name='notification_preferences', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
