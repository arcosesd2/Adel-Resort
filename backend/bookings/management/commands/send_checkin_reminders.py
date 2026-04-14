from datetime import timedelta

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.core.management.base import BaseCommand
from django.template.loader import render_to_string
from django.utils import timezone

from bookings.models import Booking, BookingStatus


class Command(BaseCommand):
    help = 'Email guests whose check-in is tomorrow (confirmed bookings only).'

    def handle(self, *args, **options):
        tomorrow = timezone.localdate() + timedelta(days=1)
        bookings = (
            Booking.objects
            .select_related('user', 'room')
            .filter(
                status=BookingStatus.CONFIRMED,
                check_in=tomorrow,
            )
        )

        sent = 0
        for booking in bookings:
            user = booking.user
            if not user or not user.email:
                continue

            # Respect notification preferences
            prefs = getattr(user, 'notification_preferences', None)
            if prefs and not prefs.receive_checkin_reminders:
                continue

            context = {
                'user': user,
                'booking': booking,
                'frontend_url': settings.FRONTEND_URL,
            }
            try:
                html_body = render_to_string('emails/checkin_reminder.html', context)
                msg = EmailMultiAlternatives(
                    subject=f'🌴 See you tomorrow — {booking.room.name}',
                    body=html_body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[user.email],
                )
                msg.attach_alternative(html_body, 'text/html')
                msg.send(fail_silently=False)
                sent += 1
            except Exception as exc:
                self.stderr.write(f'Failed for booking {booking.reference_code}: {exc}')

        self.stdout.write(self.style.SUCCESS(f'Sent {sent} check-in reminder(s).'))
