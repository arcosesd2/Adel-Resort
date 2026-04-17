from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Sum


class Loan(models.Model):
    class InterestMethod(models.TextChoices):
        NONE = 'none', 'No Interest'
        SIMPLE = 'simple', 'Simple'
        DIMINISHING = 'diminishing', 'Diminishing'

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        PAID_OFF = 'paid_off', 'Paid Off'
        DEFAULTED = 'defaulted', 'Defaulted'
        CANCELLED = 'cancelled', 'Cancelled'

    class Source(models.TextChoices):
        PAYROLL_DEDUCTION = 'payroll_deduction', 'Payroll Deduction'
        CASH = 'cash', 'Cash'
        BANK_TRANSFER = 'bank_transfer', 'Bank Transfer'
        GCASH = 'gcash', 'GCash'
        OTHER = 'other', 'Other'

    employee = models.ForeignKey('hr.Employee', on_delete=models.PROTECT, related_name='loans')
    principal = models.DecimalField(max_digits=12, decimal_places=2)
    interest_rate_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    interest_method = models.CharField(
        max_length=20, choices=InterestMethod.choices, default=InterestMethod.NONE,
    )
    term_periods = models.PositiveIntegerField()
    installment_amount = models.DecimalField(max_digits=12, decimal_places=2)
    purpose = models.CharField(max_length=200)
    start_date = models.DateField()
    auto_deduct = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    disbursed_at = models.DateTimeField(null=True, blank=True)
    paid_off_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='loans_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Loan #{self.pk} - {self.employee.employee_code} - PHP {self.principal}'

    @property
    def total_paid(self):
        return (self.payments.filter(is_voided=False).aggregate(total=Sum('amount'))['total'] or Decimal('0')).quantize(Decimal('0.01'))

    @property
    def remaining_balance(self):
        # Simple interest baseline: principal + (principal * rate * term_periods/12).
        # Diminishing balance is amortized via installment_amount externally; the
        # remaining balance still tracks principal + accrued − paid for display.
        accrued = Decimal('0')
        if self.interest_method == self.InterestMethod.SIMPLE and self.interest_rate_percent:
            # Annual simple interest on the full principal, no compounding.
            accrued = (
                self.principal
                * (self.interest_rate_percent / Decimal('100'))
            ).quantize(Decimal('0.01'))
        return (self.principal + accrued - self.total_paid).quantize(Decimal('0.01'))


class LoanPayment(models.Model):
    loan = models.ForeignKey(Loan, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    source = models.CharField(max_length=30, choices=Loan.Source.choices)
    payslip = models.ForeignKey(
        'hr.Payslip', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='loan_payments',
    )
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='loan_payments_recorded',
    )
    is_voided = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-payment_date', '-id']

    def __str__(self):
        return f'LoanPayment #{self.pk} - Loan {self.loan_id} - PHP {self.amount}'
