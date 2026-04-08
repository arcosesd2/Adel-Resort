from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from content.emails import send_promotion_expiring
from content.models import Promotion


class Command(BaseCommand):
    help = 'Send "last chance" emails for active promotions expiring in 2 days.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days-before',
            type=int,
            default=2,
            help='How many days before expiry to send the reminder (default: 2)',
        )

    def handle(self, *args, **options):
        target_date = timezone.localdate() + timedelta(days=options['days_before'])
        promos = Promotion.objects.filter(is_active=True, valid_until=target_date)

        count = 0
        for promo in promos:
            # Run synchronously in the management command (no request to block)
            send_promotion_expiring(promo, async_=False)
            count += 1

        self.stdout.write(self.style.SUCCESS(f'Queued expiry reminders for {count} promotion(s).'))
