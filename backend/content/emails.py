import logging
import threading

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def _run_in_background(fn, *args, **kwargs):
    """Fire-and-forget a function on a daemon thread.

    Keeps API responses fast when sending large batches of emails. For a true
    production-grade setup, swap this out for Celery or Django-Q; the call
    sites here are the only things that would need to change.
    """
    thread = threading.Thread(target=fn, args=args, kwargs=kwargs, daemon=True)
    thread.start()
    return thread


def _collect_recipients(preference_field=None):
    """Return a list of (email, unsubscribe_token) tuples.

    Combines active+confirmed newsletter subscribers and registered users who
    have the given `preference_field` enabled (or all users if None).
    Deduplicated by lowercase email; subscribers take priority so their
    unsubscribe token is preserved.
    """
    from accounts.models import User
    from .models import NewsletterSubscriber

    recipients = {}
    for sub in NewsletterSubscriber.objects.filter(is_active=True, is_confirmed=True):
        recipients[sub.email.lower()] = sub.unsubscribe_token

    user_qs = User.objects.filter(is_active=True).exclude(email__isnull=True).exclude(email='')
    if preference_field:
        user_qs = _filter_users_by_pref(user_qs, preference_field)

    for user in user_qs:
        key = (user.email or '').lower()
        if not key:
            continue
        if key not in recipients:
            recipients[key] = ''
    return list(recipients.items())


def _filter_users_by_pref(user_qs, preference_field):
    """Return users who have `preference_field` enabled, or no prefs row yet."""
    from django.db.models import Q
    kwargs_enabled = {f'notification_preferences__{preference_field}': True}
    return user_qs.filter(
        Q(notification_preferences__isnull=True) | Q(**kwargs_enabled)
    ).distinct()


def _unsubscribe_url(token):
    if token:
        return f"{settings.FRONTEND_URL}/unsubscribe?token={token}"
    return f"{settings.FRONTEND_URL}/account/preferences"


def _render_and_send(subject, template_name, context, to_email, connection):
    try:
        html_body = render_to_string(f'emails/{template_name}.html', context)
        msg = EmailMultiAlternatives(
            subject=subject,
            body=html_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to_email],
            connection=connection,
        )
        msg.attach_alternative(html_body, 'text/html')
        msg.send(fail_silently=False)
        return True
    except Exception:
        logger.exception(f'Failed to send email to {to_email}')
        return False


def _send_broadcast_sync(subject, template_name, base_context, preference_field):
    recipients = _collect_recipients(preference_field=preference_field)
    if not recipients:
        return 0
    connection = get_connection()
    sent = 0
    for email, token in recipients:
        context = {
            **base_context,
            'unsubscribe_url': _unsubscribe_url(token),
            'recipient_email': email,
        }
        if _render_and_send(subject, template_name, context, email, connection):
            sent += 1
    logger.info(f'Broadcast "{subject}" sent to {sent}/{len(recipients)} recipients')
    return sent


def send_event_announcement(event, async_=True):
    subject = f'🌴 New Event at Adel Beach Resort: {event.title}'
    base_context = {'event': event, 'frontend_url': settings.FRONTEND_URL}
    if async_:
        _run_in_background(_send_broadcast_sync, subject, 'new_event', base_context, 'receive_events')
        return None
    return _send_broadcast_sync(subject, 'new_event', base_context, 'receive_events')


def send_promotion_announcement(promotion, async_=True):
    subject = f'🌴 New Promotion: {promotion.title}'
    base_context = {'promotion': promotion, 'frontend_url': settings.FRONTEND_URL}
    if async_:
        _run_in_background(_send_broadcast_sync, subject, 'new_promotion', base_context, 'receive_promotions')
        return None
    return _send_broadcast_sync(subject, 'new_promotion', base_context, 'receive_promotions')


def send_promotion_expiring(promotion, async_=True):
    subject = f'🌴 Last Chance: {promotion.title} ends soon'
    base_context = {'promotion': promotion, 'frontend_url': settings.FRONTEND_URL}
    if async_:
        _run_in_background(_send_broadcast_sync, subject, 'promotion_expiring', base_context, 'receive_promotions')
        return None
    return _send_broadcast_sync(subject, 'promotion_expiring', base_context, 'receive_promotions')


def send_subscription_confirmation(subscriber):
    confirm_url = f"{settings.FRONTEND_URL}/account/verify-subscription?token={subscriber.confirmation_token}"
    context = {
        'frontend_url': settings.FRONTEND_URL,
        'confirm_url': confirm_url,
        'unsubscribe_url': _unsubscribe_url(subscriber.unsubscribe_token),
    }
    connection = get_connection()
    return _render_and_send(
        subject='🌴 Please confirm your subscription — Adel Beach Resort',
        template_name='newsletter_confirm',
        context=context,
        to_email=subscriber.email,
        connection=connection,
    )


def send_newsletter_welcome(subscriber):
    context = {
        'frontend_url': settings.FRONTEND_URL,
        'unsubscribe_url': _unsubscribe_url(subscriber.unsubscribe_token),
    }
    connection = get_connection()
    return _render_and_send(
        subject='🌴 Welcome to the Adel Beach Resort newsletter',
        template_name='newsletter_welcome',
        context=context,
        to_email=subscriber.email,
        connection=connection,
    )
