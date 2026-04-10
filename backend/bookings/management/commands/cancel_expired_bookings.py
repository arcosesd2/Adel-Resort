from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from bookings.models import Booking, BookingStatus

PAYMENT_DEADLINE_HOURS = 24


class Command(BaseCommand):
    help = 'Cancel pending bookings that have not been paid within 24 hours and notify guests.'

    def handle(self, *args, **options):
        deadline = timezone.now() - timedelta(hours=PAYMENT_DEADLINE_HOURS)
        expired = Booking.objects.filter(
            status=BookingStatus.PENDING,
            created_at__lt=deadline,
        ).exclude(payment__isnull=False)

        cancelled_count = 0
        for booking in expired:
            booking.status = BookingStatus.CANCELLED
            booking.save(update_fields=['status'])
            cancelled_count += 1
            try:
                from accounts.models import create_notification
                create_notification(
                    booking.user,
                    'booking_cancelled',
                    'Booking Cancelled',
                    f'Your booking for {booking.room.name} ({booking.reference_code}) has been cancelled because payment was not received within {PAYMENT_DEADLINE_HOURS} hours.',
                    f'/booking/{booking.id}',
                )
            except Exception:
                pass
            try:
                from accounts.emails import send_booking_cancelled_email
                send_booking_cancelled_email(booking.user, booking)
            except Exception:
                pass

        self.stdout.write(self.style.SUCCESS(f'Cancelled {cancelled_count} expired booking(s).'))