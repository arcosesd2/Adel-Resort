import secrets

from django.db import migrations, models


def backfill_tokens(apps, schema_editor):
    NewsletterSubscriber = apps.get_model('content', 'NewsletterSubscriber')
    for sub in NewsletterSubscriber.objects.all():
        if not sub.confirmation_token:
            sub.confirmation_token = secrets.token_urlsafe(32)
            sub.save(update_fields=['confirmation_token'])


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0006_newsletter_announcements'),
    ]

    operations = [
        migrations.AddField(
            model_name='newslettersubscriber',
            name='is_confirmed',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='newslettersubscriber',
            name='confirmation_token',
            field=models.CharField(blank=True, db_index=True, default='', max_length=64),
        ),
        migrations.AddField(
            model_name='newslettersubscriber',
            name='confirmed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(backfill_tokens, reverse_code=migrations.RunPython.noop),
        migrations.AlterField(
            model_name='newslettersubscriber',
            name='confirmation_token',
            field=models.CharField(db_index=True, max_length=64, unique=True),
        ),
    ]
