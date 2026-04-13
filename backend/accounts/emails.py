import logging
import threading

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


def send_booking_cancelled_email(user, booking):
    if not user.email:
        return False
    return _send_email(
        subject=f'Booking Cancelled — {booking.reference_code}',
        to_email=user.email,
        template_name='booking_cancelled',
        context={
            'user': user,
            'booking': booking,
            'frontend_url': settings.FRONTEND_URL,
        },
    )


def send_booking_completed_email(user, booking):
    if not user.email:
        return False
    return _send_email(
        subject=f'Thank you for staying with us — {booking.reference_code}',
        to_email=user.email,
        template_name='booking_completed',
        context={
            'user': user,
            'booking': booking,
            'frontend_url': settings.FRONTEND_URL,
        },
    )


NOTIFICATION_TYPE_SUBJECTS = {
    'new_booking': 'New Booking Received',
    'booking_cancelled': 'Booking Cancelled',
    'pending_payment_review': 'Payment Awaiting Review',
    'new_review_pending': 'New Review Pending Approval',
    'new_message': 'New Message',
    'system': 'System Notification',
    'booking_confirmed': 'Booking Confirmed',
    'payment_received': 'Payment Received',
    'booking_completed': 'Booking Completed',
    'review_approved': 'Review Approved',
}


def _send_staff_notification_emails_sync(notification_type, title, message, link='', exclude_user=None):
    from .models import User

    staff_users = User.objects.filter(is_staff=True, is_active=True).exclude(email__isnull=True).exclude(email='')
    if exclude_user:
        staff_users = staff_users.exclude(pk=exclude_user.pk)

    subject = NOTIFICATION_TYPE_SUBJECTS.get(notification_type, title)
    dashboard_url = f"{settings.FRONTEND_URL}{link or '/admin-dashboard'}"
    sent = 0
    for staff in staff_users:
        ctx = {
            'staff': staff,
            'title': title,
            'message': message,
            'dashboard_url': dashboard_url,
            'frontend_url': settings.FRONTEND_URL,
        }
        if _send_email(subject=subject, to_email=staff.email, template_name='staff_notification', context=ctx):
            sent += 1
    logger.info(f'Staff notification email sent to {sent}/{staff_users.count()} staff for "{title}"')
    return sent


def send_staff_notification_emails(notification_type, title, message, link='', exclude_user=None):
    thread = threading.Thread(
        target=_send_staff_notification_emails_sync,
        args=(notification_type, title, message, link),
        kwargs={'exclude_user': exclude_user},
        daemon=True,
    )
    thread.start()
    return thread
