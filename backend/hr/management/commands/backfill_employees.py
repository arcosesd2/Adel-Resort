from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from hr.models import Employee, CompensationProfile

User = get_user_model()


class Command(BaseCommand):
    help = (
        'Interactively create Employee + initial CompensationProfile rows for staff users '
        'without a payroll record. Salary defaults to 0 — admins complete via UI.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='List candidates without creating any rows.')
        parser.add_argument('--auto', action='store_true',
                            help='Create with defaults for every candidate (no prompts).')

    def handle(self, *args, **options):
        candidates = (
            User.objects
            .filter(is_staff=True, is_active=True, employee__isnull=True)
            .order_by('username')
        )
        if not candidates.exists():
            self.stdout.write(self.style.SUCCESS('No staff users without an Employee profile.'))
            return

        self.stdout.write(self.style.NOTICE(f'Found {candidates.count()} candidate(s):'))
        for u in candidates:
            self.stdout.write(f'  - {u.username} ({u.get_full_name() or "—"}) <{u.email}>')

        if options['dry_run']:
            return

        for u in candidates:
            self.stdout.write('')
            self.stdout.write(self.style.HTTP_INFO(
                f'-- {u.username} ({u.get_full_name() or "—"}) --'
            ))
            if options['auto']:
                position = 'Staff'
                department = ''
                pay_schedule = CompensationProfile.PaySchedule.SEMI_MONTHLY
                weekly_cutoff_day = None
            else:
                ans = input('Create Employee for this user? [y/N]: ').strip().lower()
                if ans != 'y':
                    self.stdout.write(self.style.WARNING('Skipped.'))
                    continue
                position = input('  Position [Staff]: ').strip() or 'Staff'
                department = input('  Department []: ').strip()
                ps = input('  Pay schedule [semi_monthly/monthly/weekly] (default semi_monthly): ').strip().lower()
                pay_schedule = ps or CompensationProfile.PaySchedule.SEMI_MONTHLY
                if pay_schedule not in CompensationProfile.PaySchedule.values:
                    self.stdout.write(self.style.ERROR('Invalid choice; using semi_monthly.'))
                    pay_schedule = CompensationProfile.PaySchedule.SEMI_MONTHLY
                weekly_cutoff_day = None
                if pay_schedule == CompensationProfile.PaySchedule.WEEKLY:
                    cd = input('  Weekly cutoff weekday (1=Mon..7=Sun) [5]: ').strip() or '5'
                    try:
                        weekly_cutoff_day = int(cd)
                        assert 1 <= weekly_cutoff_day <= 7
                    except (ValueError, AssertionError):
                        self.stdout.write(self.style.ERROR('Invalid; using 5 (Friday).'))
                        weekly_cutoff_day = 5

            with transaction.atomic():
                emp = Employee.objects.create(
                    user=u,
                    hire_date=u.date_joined.date() if u.date_joined else date.today(),
                    position=position,
                    department=department,
                )
                CompensationProfile.objects.create(
                    employee=emp,
                    effective_date=emp.hire_date,
                    monthly_basic_salary=Decimal('0.00'),
                    pay_schedule=pay_schedule,
                    weekly_cutoff_day=weekly_cutoff_day,
                )
            self.stdout.write(self.style.SUCCESS(
                f'  Created {emp.employee_code} (placeholder salary 0; finalize via admin UI).'
            ))
