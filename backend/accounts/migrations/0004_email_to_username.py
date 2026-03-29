from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_set_superadmin_flag'),
    ]

    operations = [
        # User: rename email → username, change field type
        migrations.RenameField(
            model_name='user',
            old_name='email',
            new_name='username',
        ),
        migrations.AlterField(
            model_name='user',
            name='username',
            field=models.CharField(max_length=150, unique=True),
        ),

        # LoginAttempt: rename email → username, change field type
        migrations.RenameField(
            model_name='loginattempt',
            old_name='email',
            new_name='username',
        ),
        migrations.AlterField(
            model_name='loginattempt',
            name='username',
            field=models.CharField(max_length=150),
        ),
    ]
