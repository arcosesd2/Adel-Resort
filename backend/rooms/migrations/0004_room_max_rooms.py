from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rooms', '0003_merge_room_types'),
    ]

    operations = [
        migrations.AddField(
            model_name='room',
            name='max_rooms',
            field=models.PositiveIntegerField(default=1, help_text='Number of physical units available for this room type'),
        ),
    ]
