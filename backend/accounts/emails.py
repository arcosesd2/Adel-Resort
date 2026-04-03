import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .tokens import email_verification_token

logger = logging.getLogger(__name__)


def _send_email(subject, to_email, template_name, context):
    try:
        html_body = render_to_string(f'emails/{template_name}.html', context)
        msg = EmailMultiAlternatives(
            subject=subject,
            body=html_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to_email],
        )
        msg.attach_alternative(html_body, 'text/html')
        msg.send(fail_silently=False)
        return True
    except Exception:
        logger.exception(f'Failed to send email to {to_email}')
        return False


def send_welcome_email(user):
    if not user.email:
        return False
    return _send_email(
        subject='Welcome to Adel Beach Resort!',
        to_email=user.email,
        template_name='welcome',
        context={
            'user': user,
            'frontend_url': settings.FRONTEND_URL,
        },
    )


def send_verification_email(user):
    if not user.email:
        return False
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_verification_token.make_token(user)
    verify_url = f"{settings.FRONTEND_URL}/account/verify-email?uid={uid}&token={token}"
    return _send_email(
        subject='Verify your email — Adel Beach Resort',
        to_email=user.email,
        template_name='verify_email',
        context={
            'user': user,
            'verify_url': verify_url,
        },
    )


def send_password_reset_email(user):
    if not user.email:
        return False
    from django.contrib.auth.tokens import default_token_generator
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_url = f"{settings.FRONTEND_URL}/auth/reset-password?uid={uid}&token={token}"
    return _send_email(
        subject='Reset your password — Adel Beach Resort',
        to_email=user.email,
        template_name='password_reset',
        context={
            'user': user,
            'reset_url': reset_url,
        },
    )


def send_booking_confirmation_email(user, booking):
    if not user.email:
        return False
    return _send_email(
        subject=f'Booking Confirmed — {booking.room.name}',
        to_email=user.email,
        template_name='booking_confirmed',
        context={
            'user': user,
            'booking': booking,
            'frontend_url': settings.FRONTEND_URL,
        },
    )


def send_payment_received_email(user, booking):
    if not user.email:
        return False
    return _send_email(
        subject='Payment Received — Adel Beach Resort',
        to_email=user.email,
        template_name='payment_received',
        context={
            'user': user,
            'booking': booking,
            'frontend_url': settings.FRONTEND_URL,
        },
    )
