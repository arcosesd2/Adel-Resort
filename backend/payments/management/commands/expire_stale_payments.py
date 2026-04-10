from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from payments.models import Payment, PaymentStatus
from bookings.models import Booking, BookingStatus


PAYMENT_VERIFICATION_DEADLINE_HOURS = 48


class Command(BaseCommand):
    help = 'Mark pending payments as failed if not verified within the deadline, and cancel their bookings.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=PAYMENT_VERIFICATION_DEADLINE_HOURS,
            help=f'Hours after which a pending payment is considered stale (default: {PAYMENT_VERIFICATION_DEADLINE_HOURS})',
        )

    def handle(self, *args, **options):
        hours = options['hours']
        deadline = timezone.now() - timedelta(hours=hours)
        stale_payments = Payment.objects.filter(
            status=PaymentStatus.PENDING,
            created_at__lt=deadline,
        ).select_related('booking', 'booking__user', 'booking__room')

        count = 0
        for payment in stale_payments:
            payment.status = PaymentStatus.FAILED
            payment.save(update_fields=['status', 'updated_at'])

            booking = payment.booking
            if booking.status in (BookingStatus.PENDING, BookingStatus.CONFIRMED):
                booking.status = BookingStatus.CANCELLED
                booking.save(update_fields=['status'])

            try:
                from accounts.models import create_notification, notify_staff
                create_notification(
                    booking.user,
                    'booking_cancelled',
                    'Payment Verification Expired',
                    f'Your payment for {booking.room.name} ({booking.reference_code}) could not be verified in time. Your booking has been cancelled.',
                    f'/booking/{booking.id}',
                )
                notify_staff(
                    'system',
                    'Stale Payment Auto-Expired',
                    f'Payment #{payment.id} for booking {booking.reference_code} was pending for over {hours}h and has been auto-failed.',
                    '/admin-dashboard/payments',
                )
            except Exception:
                pass

            count += 1

        self.stdout.write(self.style.SUCCESS(f'Expired {count} stale payment(s).'))