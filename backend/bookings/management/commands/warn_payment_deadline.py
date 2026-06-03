from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from bookings.constants import PAYMENT_DEADLINE_MINUTES
from bookings.models import Booking, BookingStatus

WARNING_BEFORE_MINUTES = 15


class Command(BaseCommand):
    help = 'Notify staff about pending bookings approaching their payment deadline.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--warn-minutes',
            type=int,
            default=WARNING_BEFORE_MINUTES,
            help=f'Minutes before deadline to send warning (default: {WARNING_BEFORE_MINUTES})',
        )

    def handle(self, *args, **options):
        warn_minutes = options['warn_minutes']
        now = timezone.now()

        cutoff_min = now - timedelta(minutes=PAYMENT_DEADLINE_MINUTES) + timedelta(minutes=warn_minutes)
        cutoff_max = now - timedelta(minutes=PAYMENT_DEADLINE_MINUTES)

        bookings = Booking.objects.filter(
            status=BookingStatus.PENDING,
            created_at__gte=cutoff_max,
            created_at__lt=cutoff_min,
        ).exclude(payment__isnull=False).select_related('user', 'room')

        notified = 0
        for booking in bookings:
            remaining_minutes = PAYMENT_DEADLINE_MINUTES - int((now - booking.created_at).total_seconds() / 60)
            try:
                from accounts.models import notify_staff
                notify_staff(
                    'pending_payment_review',
                    'Booking Payment Deadline Approaching',
                    f'Booking {booking.reference_code} for {booking.room.name} by {booking.user.get_full_name() or booking.user.username} will expire in ~{remaining_minutes}min without payment.',
                    '/admin-dashboard/bookings',
                )
            except Exception:
                pass
            notified += 1

        self.stdout.write(self.style.SUCCESS(f'Warned staff about {notified} booking(s) approaching deadline.'))
