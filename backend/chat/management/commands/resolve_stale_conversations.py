from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from chat.models import Conversation


STALE_CONVERSATION_DAYS = 7


class Command(BaseCommand):
    help = 'Auto-resolve open chat conversations that have been inactive for a specified number of days.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=STALE_CONVERSATION_DAYS,
            help=f'Resolve conversations inactive for this many days (default: {STALE_CONVERSATION_DAYS})',
        )

    def handle(self, *args, **options):
        days = options['days']
        cutoff = timezone.now() - timedelta(days=days)
        stale = Conversation.objects.filter(
            status='open',
            updated_at__lt=cutoff,
        )
        count = stale.update(status='resolved')
        self.stdout.write(self.style.SUCCESS(f'Resolved {count} stale conversation(s) (>{days}d inactive).'))