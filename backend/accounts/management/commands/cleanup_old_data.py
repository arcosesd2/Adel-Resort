from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Clean up old login attempts, activity logs, read notifications, and expired JWT tokens.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--login-attempts-days',
            type=int,
            default=90,
            help='Delete login attempts older than this many days (default: 90)',
        )
        parser.add_argument(
            '--activity-log-days',
            type=int,
            default=180,
            help='Delete activity logs older than this many days (default: 180)',
        )
        parser.add_argument(
            '--notifications-days',
            type=int,
            default=30,
            help='Delete read notifications older than this many days (default: 30)',
        )
        parser.add_argument(
            '--token-days',
            type=int,
            default=7,
            help='Delete blacklisted/expired JWT tokens older than this many days (default: 7)',
        )

    def handle(self, *args, **options):
        login_days = options['login_attempts_days']
        activity_days = options['activity_log_days']
        notif_days = options['notifications_days']
        token_days = options['token_days']

        now = timezone.now()

        # Clean up old login attempts
        from accounts.models import LoginAttempt
        login_cutoff = now - timedelta(days=login_days)
        deleted_login, _ = LoginAttempt.objects.filter(created_at__lt=login_cutoff).delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {deleted_login} old login attempt(s) (>{login_days}d).'))

        # Clean up old activity logs
        from accounts.models import ActivityLog
        activity_cutoff = now - timedelta(days=activity_days)
        deleted_activity, _ = ActivityLog.objects.filter(created_at__lt=activity_cutoff).delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {deleted_activity} old activity log(s) (>{activity_days}d).'))

        # Clean up read notifications
        from accounts.models import Notification
        notif_cutoff = now - timedelta(days=notif_days)
        deleted_notifs, _ = Notification.objects.filter(
            is_read=True,
            created_at__lt=notif_cutoff,
        ).delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {deleted_notifs} old read notification(s) (>{notif_days}d).'))

        # Clean up blacklisted/expired JWT tokens
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
        token_cutoff = now - timedelta(days=token_days)
        try:
            old_blacklisted = BlacklistedToken.objects.filter(token__created_at__lt=token_cutoff)
            deleted_blacklisted, _ = old_blacklisted.delete()
            self.stdout.write(self.style.SUCCESS(f'Deleted {deleted_blacklisted} old blacklisted token(s) (>{token_days}d).'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Skipped token cleanup: {e}'))

        # Clean up outstanding tokens that have been blacklisted and are old
        try:
            outstanding_cutoff = now - timedelta(days=30)
            blacklisted_token_ids = BlacklistedToken.objects.values_list('token_id', flat=True)
            old_outstanding = OutstandingToken.objects.filter(
                created_at__lt=outstanding_cutoff,
                id__in=blacklisted_token_ids,
            )
            deleted_outstanding, _ = old_outstanding.delete()
            self.stdout.write(self.style.SUCCESS(f'Deleted {deleted_outstanding} old outstanding token(s) (>30d, blacklisted).'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Skipped outstanding token cleanup: {e}'))

        self.stdout.write(self.style.SUCCESS('Cleanup complete.'))