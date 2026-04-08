from datetime import timedelta

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.core.management.base import BaseCommand
from django.template.loader import render_to_string
from django.utils import timezone

from bookings.models import Booking, BookingStatus


class Command(BaseCommand):
    help = 'Email guests 2 days after checkout asking for a review (completed bookings without reviews).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days-after',
            type=int,
            default=2,
            help='How many days after check-out to send the request (default: 2)',
        )

    def handle(self, *args, **options):
        target_date = timezone.localdate() - timedelta(days=options['days_after'])
        bookings = (
            Booking.objects
            .select_related('user', 'room')
            .filter(
                status=BookingStatus.COMPLETED,
                check_out=target_date,
                review__isnull=True,
            )
        )

        sent = 0
        for booking in bookings:
            user = booking.user
            if not user or not user.email:
                continue

            prefs = getattr(user, 'notification_preferences', None)
            if prefs and not prefs.receive_review_requests:
                continue

            context = {
                'user': user,
                'booking': booking,
                'frontend_url': settings.FRONTEND_URL,
            }
            try:
                html_body = render_to_string('emails/review_request.html', context)
                msg = EmailMultiAlternatives(
                    subject='How was your stay? Share your experience',
                    body=html_body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[user.email],
                )
                msg.attach_alternative(html_body, 'text/html')
                msg.send(fail_silently=False)
                sent += 1
            except Exception as exc:
                self.stderr.write(f'Failed for booking {booking.reference_code}: {exc}')

        self.stdout.write(self.style.SUCCESS(f'Sent {sent} review request(s).'))
