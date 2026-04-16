from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from hr.models import PayrollPeriod
from hr.services import payroll_engine

User = get_user_model()


class Command(BaseCommand):
    help = (
        'CLI trigger for payroll. Creates a DRAFT run for the given period and (optionally) '
        'finalizes/marks-paid in a single shot.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--period', type=int, required=True, help='PayrollPeriod ID.')
        parser.add_argument('--actor', type=str, required=True,
                            help='Username to record as the run actor.')
        parser.add_argument('--employees', type=str, default='',
                            help='Comma-separated Employee IDs. Empty = all eligible.')
        parser.add_argument('--finalize', action='store_true',
                            help='After draft, transition to FINALIZED.')
        parser.add_argument('--mark-paid', action='store_true',
                            help='After finalize, transition to PAID (requires --finalize).')

    def handle(self, *args, **options):
        try:
            period = PayrollPeriod.objects.get(pk=options['period'])
        except PayrollPeriod.DoesNotExist:
            raise CommandError(f'Period {options["period"]} not found.')
        try:
            actor = User.objects.get(username=options['actor'])
        except User.DoesNotExist:
            raise CommandError(f'User "{options["actor"]}" not found.')

        emp_csv = options['employees'].strip()
        employee_ids = [int(x) for x in emp_csv.split(',') if x.strip()] if emp_csv else None

        try:
            run = payroll_engine.generate_payroll_run(period, actor, employee_ids)
        except ValueError as e:
            raise CommandError(str(e))
        self.stdout.write(self.style.SUCCESS(
            f'DRAFT run #{run.id} created for {period} ({run.payslips.count()} payslip(s)).'
        ))

        if options['finalize']:
            try:
                run = payroll_engine.finalize_run(run, actor)
            except ValueError as e:
                raise CommandError(str(e))
            self.stdout.write(self.style.SUCCESS(f'Run #{run.id} FINALIZED.'))

            if options['mark_paid']:
                try:
                    run = payroll_engine.mark_paid(run, actor)
                except ValueError as e:
                    raise CommandError(str(e))
                self.stdout.write(self.style.SUCCESS(f'Run #{run.id} marked PAID.'))
