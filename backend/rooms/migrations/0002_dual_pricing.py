from django.db import migrations, models


def copy_price_to_night(apps, schema_editor):
    Room = apps.get_model('rooms', 'Room')
    Room.objects.all().update(night_price=models.F('day_price'))


class Migration(migrations.Migration):

    dependencies = [
        ('rooms', '0001_initial'),
    ]

    operations = [
        # Rename price_per_night -> day_price
        migrations.RenameField(
            model_name='room',
            old_name='price_per_night',
            new_name='day_price',
        ),
        # Add night_price
        migrations.AddField(
            model_name='room',
            name='night_price',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        # Add is_day_only
        migrations.AddField(
            model_name='room',
            name='is_day_only',
            field=models.BooleanField(default=False),
        ),
        # Copy day_price into night_price for existing rows
        migrations.RunPython(copy_price_to_night, migrations.RunPython.noop),
        # Update room_type max_length and choices
        migrations.AlterField(
            model_name='room',
            name='room_type',
            field=models.CharField(
                choices=[
                    ('small_cottage', 'Small Cottage'),
                    ('dos_andanas_down', 'Dos Andanas Cottage Down'),
                    ('dos_andanas_up', 'Dos Andanas Cottage Up'),
                    ('large_cottage', 'Large Cottage'),
                    ('dos_andanas_room_sm', 'Dos Andanas Room w/ Cottage (Small)'),
                    ('dos_andanas_room_lg', 'Dos Andanas Room w/ Cottage (Large)'),
                    ('lavender_house', 'Lavender House'),
                    ('ac_karaoke', 'Air-Conditioned Karaoke Room'),
                    ('kubo_with_toilet', 'Kubo Room & Cottage w/ Toilet'),
                    ('kubo_without_toilet', 'Kubo Room & Cottage w/o Toilet'),
                    ('function_hall', 'Function Hall'),
                    ('trapal_table', 'Trapal Table'),
                ],
                default='small_cottage',
                max_length=25,
            ),
        ),
        # Update ordering
        migrations.AlterModelOptions(
            name='room',
            options={'ordering': ['day_price']},
        ),
    ]
