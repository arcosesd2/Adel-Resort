from datetime import timedelta

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.core.management.base import BaseCommand
from django.template.loader import render_to_string
from django.utils import timezone

from bookings.models import Booking, BookingStatus

REMIND_AFTER_HOURS = 1
# Must fire well before cancel_expired_bookings (24h) to be useful.


class Command(BaseCommand):
    help = 'Email users with pending-payment bookings older than 1 hour to finish checkout.'

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(hours=REMIND_AFTER_HOURS)
        # Window: created between 2h and 1h ago — so we only remind once per booking
        window_start = timezone.now() - timedelta(hours=REMIND_AFTER_HOURS + 1)

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
