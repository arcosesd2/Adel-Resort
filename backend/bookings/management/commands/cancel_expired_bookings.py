from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from bookings.models import Booking, BookingStatus

PAYMENT_DEADLINE_HOURS = 24


class Command(BaseCommand):
    help = 'Cancel pending bookings that have not been paid within 24 hours.'

    def handle(self, *args, **options):
        deadline = timezone.now() - timedelta(hours=PAYMENT_DEADLINE_HOURS)
        expired = Booking.objects.filter(
            status=BookingStatus.PENDING,
            created_at__lt=deadline,
        ).exclude(payment__isnull=False)

        count = expired.update(status=BookingStatus.CANCELLED)
        self.stdout.write(self.style.SUCCESS(f'Cancelled {count} expired booking(s).'))
