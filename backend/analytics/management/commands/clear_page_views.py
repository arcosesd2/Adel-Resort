from django.core.management.base import BaseCommand
from analytics.models import PageView


class Command(BaseCommand):
    help = 'Delete all PageView records, resetting total views, unique visitors, and per-path counters.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--yes',
            action='store_true',
            help='Skip the confirmation prompt.',
        )

    def handle(self, *args, **options):
        count = PageView.objects.count()
        if count == 0:
            self.stdout.write(self.style.WARNING('No PageView records to delete.'))
            return

        if not options['yes']:
            confirm = input(f'Delete all {count} PageView records? Type "yes" to confirm: ')
            if confirm.strip().lower() != 'yes':
                self.stdout.write(self.style.ERROR('Aborted.'))
                return

        deleted, _ = PageView.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {deleted} PageView records.'))

        from django.core.cache import cache
        cache.delete('public_stats')
