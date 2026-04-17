import calendar
from datetime import date, timedelta

from django.conf import settings
from django.db import models, transaction


class PayrollPeriod(models.Model):
    class Half(models.TextChoices):
        FIRST_HALF = 'first_half', '1st-15th'
        SECOND_HALF = 'second_half', '16th-EOM'
        WHOLE_MONTH = 'whole_month', 'Whole Month'
        WEEK = 'week', 'Week'
        THIRTEENTH_MONTH = 'thirteenth_month', '13th Month'

    year = models.PositiveSmallIntegerField()
    month = models.PositiveSmallIntegerField(null=True, blank=True)
    half = models.CharField(max_length=20, choices=Half.choices)
    week_number = models.PositiveSmallIntegerField(null=True, blank=True)
    cutoff_day = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text='Weekday the WEEK period ends (1=Mon..7=Sun). Only set when half=WEEK.',
    )
    start_date = models.DateField()
    end_date = models.DateField()
    pay_date = models.DateField()
    is_closed = models.BooleanField(default=False)

    class Meta:
        ordering = ['year', 'month', 'half', 'week_number']
        constraints = [
            models.UniqueConstraint(
                fields=['year', 'month', 'half'],
                condition=models.Q(week_number__isnull=True),
                name='unique_period_year_month_half',
            ),
            models.UniqueConstraint(
                fields=['year', 'half', 'week_number', 'cutoff_day'],
                condition=models.Q(week_number__isnull=False),
                name='unique_period_week',
            ),
        ]

    def __str__(self):
        if self.half == self.Half.WEEK:
            return f'{self.year}-W{self.week_number} cutoff={self.cutoff_day} ({self.start_date} to {self.end_date})'
        if self.half == self.Half.THIRTEENTH_MONTH:
            return f'{self.year} 13th-month'
        return f'{self.year}-{self.month:02d} {self.half}'

    @classmethod
    def ensure_for_year(cls, year):
        created = []
        for month in range(1, 13):
            last_day = calendar.monthrange(year, month)[1]
            fh_start = date(year, month, 1)
            fh_end = date(year, month, 15)
            sh_start = date(year, month, 16)
            sh_end = date(year, month, last_day)
            wm_start = fh_start
            wm_end = sh_end
            for half, start, end, pay in [
                (cls.Half.FIRST_HALF, fh_start, fh_end, fh_end),
                (cls.Half.SECOND_HALF, sh_start, sh_end, sh_end),
                (cls.Half.WHOLE_MONTH, wm_start, wm_end, wm_end),
            ]:
                obj, was_created = cls.objects.get_or_create(
                    year=year, month=month, half=half, week_number=None,
                    defaults={'start_date': start, 'end_date': end, 'pay_date': pay},
                )
                if was_created:
                    created.append(obj)
        return created

    @classmethod
    def ensure_weekly_periods(cls, year, cutoff_day):
        """Generate weekly periods for the given year ending on cutoff_day (1=Mon..7=Sun)."""
        if not (1 <= cutoff_day <= 7):
            raise ValueError('cutoff_day must be 1..7')
        # iso weekday: Mon=1..Sun=7. Find first end-of-week date in this year.
        current = date(year, 1, 1)
        # Walk forward to first cutoff_day match.
        while current.isoweekday() != cutoff_day:
            current += timedelta(days=1)
        end_of_year = date(year, 12, 31)
        created = []
        week_number = 1
        while current <= end_of_year:
            start = current - timedelta(days=6)
            end = current
            pay = current + timedelta(days=2)
            obj, was_created = cls.objects.get_or_create(
                year=year, half=cls.Half.WEEK,
                week_number=week_number, cutoff_day=cutoff_day,
                defaults={'start_date': start, 'end_date': end, 'pay_date': pay},
            )
            if was_created:
                created.append(obj)
            current += timedelta(days=7)
            week_number += 1
        return created


class PayrollRun(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        FINALIZED = 'finalized', 'Finalized'
        PAID = 'paid', 'Paid'
        VOIDED = 'voided', 'Voided'

    period = models.ForeignKey(PayrollPeriod, on_delete=models.PROTECT, related_name='runs')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    run_at = models.DateTimeField(auto_now_add=True)
    finalized_at = models.DateTimeField(null=True, blank=True)
    finalized_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_runs_finalized',
    )
    voided_at = models.DateTimeField(null=True, blank=True)
    voided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_runs_voided',
    )
    void_reason = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_runs_created',
    )

    class Meta:
        ordering = ['-run_at']
        constraints = [
            models.UniqueConstraint(
                fields=['period'],
                condition=~models.Q(status='voided'),
                name='one_live_run_per_period',
            ),
        ]

    def __str__(self):
        return f'Run #{self.pk} - {self.period} ({self.status})'


class Payslip(models.Model):
    run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, related_name='payslips')
    employee = models.ForeignKey('hr.Employee', on_delete=models.PROTECT, related_name='payslips')
    compensation_snapshot = models.ForeignKey(
        'hr.CompensationProfile', on_delete=models.PROTECT, related_name='payslips',
    )
    payslip_number = models.CharField(max_length=40, unique=True, blank=True)

    days_worked = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    gross_basic = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    overtime_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    holiday_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    rest_day_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    night_diff = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    allowances_taxable = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    allowances_non_taxable = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gross_earnings = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    sss_ee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    philhealth_ee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    pagibig_ee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    withholding_tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    loan_deduction_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    sss_er = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    philhealth_er = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    pagibig_er = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ec_contribution = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    meta = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['run', 'employee'], name='unique_payslip_per_run_employee'),
        ]
        ordering = ['-id']

    def __str__(self):
        return self.payslip_number or f'Payslip #{self.pk}'

    def save(self, *args, **kwargs):
        if not self.payslip_number:
            with transaction.atomic():
                period = self.run.period
                month = period.month or 0
                half_code = {
                    PayrollPeriod.Half.FIRST_HALF: '1',
                    PayrollPeriod.Half.SECOND_HALF: '2',
                    PayrollPeriod.Half.WHOLE_MONTH: 'M',
                    PayrollPeriod.Half.WEEK: f'W{period.week_number or 0}',
                    PayrollPeriod.Half.THIRTEENTH_MONTH: '13',
                }[period.half]
                prefix = f'PS-{period.year}-{month:02d}-{half_code}-'
                last = (
                    Payslip.objects
                    .select_for_update()
                    .filter(payslip_number__startswith=prefix)
                    .order_by('-payslip_number')
                    .first()
                )
                seq = 1
                if last:
                    try:
                        seq = int(last.payslip_number.split('-')[-1]) + 1
                    except (ValueError, IndexError):
                        seq = 1
                self.payslip_number = f'{prefix}{seq:04d}'
        super().save(*args, **kwargs)


class PayslipLineItem(models.Model):
    class Category(models.TextChoices):
        EARNING = 'earning', 'Earning'
        DEDUCTION = 'deduction', 'Deduction'
        EMPLOYER_CONTRIBUTION = 'employer_contribution', 'Employer Contribution'
        INFO = 'info', 'Info'

    payslip = models.ForeignKey(Payslip, on_delete=models.CASCADE, related_name='line_items')
    category = models.CharField(max_length=30, choices=Category.choices)
    code = models.CharField(max_length=40)
    label = models.CharField(max_length=120)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    meta = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['category', 'id']

    def __str__(self):
        return f'{self.payslip_id} {self.code} = {self.amount}'
