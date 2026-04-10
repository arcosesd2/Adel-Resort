from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = 'Run all scheduled maintenance tasks: expire bookings, expire payments, complete bookings, deactivate vouchers, cleanup data, warn staff, resolve stale chats.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO('=== Running all cron tasks ===\n'))

        tasks = [
            ('Cancel expired bookings', 'cancel_expired_bookings'),
            ('Expire stale payments', 'expire_stale_payments'),
            ('Auto-complete past bookings', 'auto_complete_bookings'),
            ('Deactivate expired vouchers', 'deactivate_expired_vouchers'),
            ('Warn about payment deadlines', 'warn_payment_deadline'),
            ('Send abandoned booking emails', 'send_abandoned_booking_emails'),
            ('Send check-in reminders', 'send_checkin_reminders'),
            ('Send review requests', 'send_review_requests'),
            ('Send promo expiry reminders', 'send_promo_expiry_reminders'),
            ('Resolve stale chat conversations', 'resolve_stale_conversations'),
            ('Cleanup old data', 'cleanup_old_data'),
        ]

        for label, command in tasks:
            self.stdout.write(self.style.HTTP_INFO(f'\n--- {label} ---'))
            try:
                call_command(command)
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'Failed: {label}: {e}'))

        self.stdout.write(self.style.HTTP_INFO('\n=== All cron tasks completed ==='))