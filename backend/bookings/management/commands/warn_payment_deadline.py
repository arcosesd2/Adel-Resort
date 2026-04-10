from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from bookings.models import Booking, BookingStatus


PAYMENT_DEADLINE_HOURS = 24
WARNING_BEFORE_HOURS = 4


class Command(BaseCommand):
    help = 'Notify staff about pending bookings approaching their payment deadline.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--warn-hours',
            type=int,
            default=WARNING_BEFORE_HOURS,
            help=f'Hours before deadline to send warning (default: {WARNING_BEFORE_HOURS})',
        )

    def handle(self, *args, **options):
        warn_hours = options['warn_hours']
        now = timezone.now()

        cutoff_min = now - timedelta(hours=PAYMENT_DEADLINE_HOURS) + timedelta(hours=warn_hours)
        cutoff_max = now - timedelta(hours=PAYMENT_DEADLINE_HOURS)

        bookings = Booking.objects.filter(
            status=BookingStatus.PENDING,
            created_at__gte=cutoff_max,
            created_at__lt=cutoff_min,
        ).exclude(payment__isnull=False).select_related('user', 'room')

        notified = 0
        for booking in bookings:
            remaining_hours = PAYMENT_DEADLINE_HOURS - int((now - booking.created_at).total_seconds() / 3600)
            try:
                from accounts.models import notify_staff
                notify_staff(
                    'pending_payment_review',
                    'Booking Payment Deadline Approaching',
                    f'Booking {booking.reference_code} for {booking.room.name} by {booking.user.get_full_name() or booking.user.username} will expire in ~{remaining_hours}h without payment.',
                    '/admin-dashboard/bookings',
                )
            except Exception:
                pass
            notified += 1

        self.stdout.write(self.style.SUCCESS(f'Warned staff about {notified} booking(s) approaching deadline.'))