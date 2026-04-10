from django.core.management.base import BaseCommand
from django.utils import timezone
from vouchers.models import Voucher


class Command(BaseCommand):
    help = 'Deactivate vouchers that have passed their valid_until date.'

    def handle(self, *args, **options):
        now = timezone.now()
        expired = Voucher.objects.filter(
            is_active=True,
            valid_until__lt=now,
        )
        count = expired.update(is_active=False)
        self.stdout.write(self.style.SUCCESS(f'Deactivated {count} expired voucher(s).'))