from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from bookings.models import Booking, BookingStatus

PAYMENT_DEADLINE_MINUTES = 60


class Command(BaseCommand):
    help = f'Cancel pending bookings that have not been paid within {PAYMENT_DEADLINE_MINUTES} minutes and notify guests.'

    def handle(self, *args, **options):
        deadline = timezone.now() - timedelta(minutes=PAYMENT_DEADLINE_MINUTES)
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
                    f'Your booking for {booking.room.name} ({booking.reference_code}) has been cancelled because payment was not received within {PAYMENT_DEADLINE_MINUTES} minutes.',
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