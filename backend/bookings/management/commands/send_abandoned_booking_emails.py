from datetime import timedelta

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.core.management.base import BaseCommand
from django.template.loader import render_to_string
from django.utils import timezone

from bookings.models import Booking, BookingStatus

REMIND_AFTER_MINUTES = 30
# Fire at 30 min — well before the 60-min payment deadline cancellation.


class Command(BaseCommand):
    help = 'Email users with pending-payment bookings older than 30 minutes to finish checkout.'

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(minutes=REMIND_AFTER_MINUTES)
        # Window: created between 60 and 30 min ago — so we only remind once per booking
        window_start = timezone.now() - timedelta(minutes=REMIND_AFTER_MINUTES + 30)

        bookings = (
            Booking.objects
            .select_related('user', 'room')
            .filter(
                status=BookingStatus.PENDING,
                created_at__lt=cutoff,
                created_at__gte=window_start,
                payment__isnull=True,
            )
            .distinct()
        )

        sent = 0
        for booking in bookings:
            user = booking.user
            if not user or not user.email:
                continue

            prefs = getattr(user, 'notification_preferences', None)
            if prefs and not prefs.receive_booking_updates:
                continue

            context = {
                'user': user,
                'booking': booking,
                'frontend_url': settings.FRONTEND_URL,
            }
            try:
                html_body = render_to_string('emails/abandoned_booking.html', context)
                msg = EmailMultiAlternatives(
                    subject=f'Complete your booking — {booking.room.name}',
                    body=html_body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[user.email],
                )
                msg.attach_alternative(html_body, 'text/html')
                msg.send(fail_silently=False)
                sent += 1
            except Exception as exc:
                self.stderr.write(f'Failed for booking {booking.reference_code}: {exc}')

        self.stdout.write(self.style.SUCCESS(f'Sent {sent} abandoned booking reminder(s).'))
