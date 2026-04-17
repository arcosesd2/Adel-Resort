from datetime import date

from django.core.management.base import BaseCommand

from hr.models import Holiday


PH_HOLIDAYS_2025 = [
    (date(2025, 1, 1), 'New Year\'s Day', 'regular', True),
    (date(2025, 1, 29), 'Chinese New Year', 'special_non_working', False),
    (date(2025, 2, 25), 'EDSA People Power Revolution', 'special_non_working', False),
    (date(2025, 3, 31), 'Eid\'l Fitr (Feast of Ramadhan)', 'regular', False),
    (date(2025, 4, 9), 'Araw ng Kagitingan', 'regular', True),
    (date(2025, 4, 17), 'Maundy Thursday', 'regular', False),
    (date(2025, 4, 18), 'Good Friday', 'regular', False),
    (date(2025, 4, 19), 'Black Saturday', 'special_non_working', False),
    (date(2025, 5, 1), 'Labor Day', 'regular', True),
    (date(2025, 6, 6), 'Eid\'l Adha (Feast of Sacrifice)', 'regular', False),
    (date(2025, 6, 12), 'Independence Day', 'regular', True),
    (date(2025, 8, 21), 'Ninoy Aquino Day', 'special_non_working', True),
    (date(2025, 8, 25), 'National Heroes Day', 'regular', True),
    (date(2025, 11, 1), 'All Saints\' Day', 'special_non_working', True),
    (date(2025, 11, 2), 'All Souls\' Day', 'special_non_working', True),
    (date(2025, 11, 30), 'Bonifacio Day', 'regular', True),
    (date(2025, 12, 8), 'Immaculate Conception', 'special_non_working', True),
    (date(2025, 12, 24), 'Christmas Eve', 'special_non_working', True),
    (date(2025, 12, 25), 'Christmas Day', 'regular', True),
    (date(2025, 12, 30), 'Rizal Day', 'regular', True),
    (date(2025, 12, 31), 'Last Day of the Year', 'special_non_working', True),
]


class Command(BaseCommand):
    help = 'Seed PH holidays for a given year (default: 2025).'

    def add_arguments(self, parser):
        parser.add_argument('--year', type=int, default=2025)

    def handle(self, *args, **options):
        year = options['year']
        count = 0
        for dt, name, htype, recurring in PH_HOLIDAYS_2025:
            adjusted = dt.replace(year=year)
            _, created = Holiday.objects.get_or_create(
                date=adjusted,
                defaults={'name': name, 'holiday_type': htype, 'is_recurring': recurring},
            )
            if created:
                count += 1
        self.stdout.write(self.style.SUCCESS(f'Seeded {count} holidays for {year}'))
