from datetime import date
from decimal import Decimal

from django.conf import settings
from django.db import models, transaction


class Employee(models.Model):
    class EmploymentStatus(models.TextChoices):
        REGULAR = 'regular', 'Regular'
        PROBATIONARY = 'probationary', 'Probationary'
        CONTRACTUAL = 'contractual', 'Contractual'
        PART_TIME = 'part_time', 'Part-time'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='employee',
    )
    employee_code = models.CharField(max_length=20, unique=True, blank=True)
    tin = models.CharField(max_length=20, blank=True)
    sss_number = models.CharField(max_length=20, blank=True)
    philhealth_number = models.CharField(max_length=20, blank=True)
    pagibig_number = models.CharField(max_length=20, blank=True)
    hire_date = models.DateField()
    termination_date = models.DateField(null=True, blank=True)
    employment_status = models.CharField(
        max_length=20, choices=EmploymentStatus.choices, default=EmploymentStatus.REGULAR,
    )
    position = models.CharField(max_length=100)
    department = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['employee_code']

    def __str__(self):
        return f'{self.employee_code} - {self.user.get_full_name() or self.user.username}'

    def save(self, *args, **kwargs):
        if not self.employee_code:
            with transaction.atomic():
                year = (self.hire_date or date.today()).year
                last = (
                    Employee.objects
                    .select_for_update()
                    .filter(employee_code__startswith=f'EMP-{year}-')
                    .order_by('-employee_code')
                    .first()
                )
                seq = 1
                if last:
                    try:
                        seq = int(last.employee_code.split('-')[-1]) + 1
                    except (ValueError, IndexError):
                        seq = 1
                self.employee_code = f'EMP-{year}-{seq:04d}'
        super().save(*args, **kwargs)

    def current_compensation(self, on_date=None):
        on_date = on_date or date.today()
        return (
            self.compensation_history
            .filter(effective_date__lte=on_date)
            .order_by('-effective_date')
            .first()
        )


class CompensationProfile(models.Model):
    class PaySchedule(models.TextChoices):
        SEMI_MONTHLY = 'semi_monthly', 'Semi-monthly (15th & EOM)'
        MONTHLY = 'monthly', 'Monthly'
        WEEKLY = 'weekly', 'Weekly'

    class TaxStatus(models.TextChoices):
        SINGLE = 'single', 'Single'
        HEAD_OF_FAMILY = 'head_of_family', 'Head of Family'
        MARRIED = 'married', 'Married'

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name='compensation_history',
    )
    effective_date = models.DateField()
    monthly_basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    pay_schedule = models.CharField(max_length=20, choices=PaySchedule.choices)
    weekly_cutoff_day = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text='1=Mon, 7=Sun. Required when pay_schedule=WEEKLY.',
    )
    weekly_basis = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text='Optional flat weekly gross. If null, derived from monthly_basic_salary x 12 / 52.',
    )
    sss_msc_override = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
    )
    tax_status = models.CharField(
        max_length=20, choices=TaxStatus.choices, default=TaxStatus.SINGLE,
    )
    daily_rate = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    hourly_rate = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='compensation_profiles_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-effective_date']
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'effective_date'],
                name='unique_compensation_per_employee_date',
            ),
        ]

    def __str__(self):
        return f'{self.employee.employee_code} - {self.effective_date} - PHP {self.monthly_basic_salary}'

    def computed_daily_rate(self):
        if self.daily_rate:
            return self.daily_rate
        return (self.monthly_basic_salary / Decimal('22')).quantize(Decimal('0.01'))

    def computed_hourly_rate(self):
        if self.hourly_rate:
            return self.hourly_rate
        return (self.computed_daily_rate() / Decimal('8')).quantize(Decimal('0.01'))

    def computed_weekly_basis(self):
        if self.weekly_basis:
            return self.weekly_basis
        return (self.monthly_basic_salary * Decimal('12') / Decimal('52')).quantize(Decimal('0.01'))
