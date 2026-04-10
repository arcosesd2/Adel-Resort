from datetime import date
from django.core.management.base import BaseCommand
from bookings.models import Booking, BookingStatus


class Command(BaseCommand):
    help = 'Auto-complete confirmed bookings whose check-out date has passed.'

    def handle(self, *args, **options):
        today = date.today()
        bookings = Booking.objects.filter(
            status=BookingStatus.CONFIRMED,
            check_out__lt=today,
        ).select_related('user', 'room')

        count = 0
        for booking in bookings:
            booking.status = BookingStatus.COMPLETED
            booking.save(update_fields=['status'])
            count += 1
            try:
                from accounts.models import create_notification
                create_notification(
                    booking.user,
                    'booking_completed',
                    'Stay Completed!',
                    f'Your stay at {booking.room.name} is complete. We hope you enjoyed it! Consider leaving a review.',
                    f'/booking/{booking.id}',
                )
            except Exception:
                pass

        self.stdout.write(self.style.SUCCESS(f'Auto-completed {count} booking(s).'))