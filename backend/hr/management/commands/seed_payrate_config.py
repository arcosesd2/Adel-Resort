from datetime import date

from django.core.management.base import BaseCommand

from hr.models import PayRateConfig


class Command(BaseCommand):
    help = 'Seed default PH pay rate configuration effective from a given date (default: 2025-01-01).'

    def add_arguments(self, parser):
        parser.add_argument('--date', default='2025-01-01', help='Effective from date (YYYY-MM-DD)')

    def handle(self, *args, **options):
        eff_date = date.fromisoformat(options['date'])
        config, created = PayRateConfig.objects.get_or_create(
            effective_from=eff_date,
            defaults={},
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created PayRateConfig effective {eff_date}'))
        else:
            self.stdout.write(f'PayRateConfig for {eff_date} already exists.')
