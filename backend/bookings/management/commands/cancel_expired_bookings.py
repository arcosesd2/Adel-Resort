from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from bookings.constants import PAYMENT_DEADLINE_LABEL, PAYMENT_DEADLINE_MINUTES
from bookings.models import Booking, BookingStatus
from payments.models import Payment, PaymentStatus


class Command(BaseCommand):
    help = f'Cancel pending bookings not paid within {PAYMENT_DEADLINE_LABEL}, including those with unverified payment proof.'

    def handle(self, *args, **options):
        deadline = timezone.now() - timedelta(minutes=PAYMENT_DEADLINE_MINUTES)
        cancelled_count = 0

        # 1) Bookings with NO payment at all past deadline
        no_payment = Booking.objects.filter(
            status=BookingStatus.PENDING,
            created_at__lt=deadline,
        ).exclude(payment__isnull=False)

        # 2) Bookings with a still-pending payment past deadline
        stale_payment_ids = Payment.objects.filter(
            status=PaymentStatus.PENDING,
            created_at__lt=deadline,
        ).values_list('booking_id', flat=True)

        with_stale_payment = Booking.objects.filter(
            status=BookingStatus.PENDING,
            id__in=stale_payment_ids,
        )

        expired = no_payment | with_stale_payment
        expired = expired.distinct()

        for booking in expired:
            booking.status = BookingStatus.CANCELLED
            booking.save(update_fields=['status'])
            cancelled_count += 1

            # Fail any pending payment on this booking
            Payment.objects.filter(
                booking=booking,
                status=PaymentStatus.PENDING,
            ).update(status=PaymentStatus.FAILED)

            try:
                from accounts.models import create_notification, notify_staff
                # Notify the guest
                create_notification(
                    booking.user,
                    'booking_cancelled',
                    'Booking Cancelled',
                    f'Your booking for {booking.room.name} ({booking.reference_code}) has been cancelled because payment was not verified within {PAYMENT_DEADLINE_LABEL}.',
                    f'/booking/{booking.id}',
                )
                # Notify all staff
                notify_staff(
                    'booking_cancelled',
                    'Expired Booking Auto-Cancelled',
                    f'Booking #{booking.id} ({booking.reference_code}) for {booking.room.name} by {booking.user.get_full_name() or booking.user.username} was auto-cancelled (unpaid after {PAYMENT_DEADLINE_LABEL}).',
                    '/admin-dashboard/bookings',
                )
            except Exception:
                pass
            try:
                from accounts.emails import send_booking_cancelled_email
                send_booking_cancelled_email(booking.user, booking)
            except Exception:
                pass

        self.stdout.write(self.style.SUCCESS(f'Cancelled {cancelled_count} expired booking(s).'))
