from django.conf import settings
from django.db import models


class LeaveType(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=30, unique=True)
    is_paid = models.BooleanField(default=True)
    default_credits = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text='Default credit days per year for new employees.',
    )
    carry_over_max = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text='Max days that can be carried over to next year. 0 = no carry-over.',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.code} - {self.name}'


class LeaveBalance(models.Model):
    employee = models.ForeignKey(
        'hr.Employee', on_delete=models.CASCADE, related_name='leave_balances',
    )
    leave_type = models.ForeignKey(
        LeaveType, on_delete=models.CASCADE, related_name='balances',
    )
    year = models.PositiveSmallIntegerField()
    total_credits = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    used = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    carried_over = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    adjusted = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        ordering = ['employee', 'leave_type', '-year']
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'leave_type', 'year'],
                name='unique_leave_balance',
            ),
        ]

    def __str__(self):
        return f'{self.employee.employee_code} - {self.leave_type.code} - {self.year}'

    @property
    def remaining(self):
        return self.total_credits + self.carried_over + self.adjusted - self.used


class LeaveRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        CANCELLED = 'cancelled', 'Cancelled'

    class HalfDay(models.TextChoices):
        NONE = 'none', 'Full Day'
        FIRST_HALF = 'first_half', 'First Half'
        SECOND_HALF = 'second_half', 'Second Half'

    employee = models.ForeignKey(
        'hr.Employee', on_delete=models.CASCADE, related_name='leave_requests',
    )
    leave_type = models.ForeignKey(
        LeaveType, on_delete=models.CASCADE, related_name='requests',
    )
    start_date = models.DateField()
    end_date = models.DateField()
    half_day = models.CharField(
        max_length=15, choices=HalfDay.choices, default=HalfDay.NONE,
    )
    reason = models.TextField(blank=True)
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.PENDING,
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='leave_requests_reviewed',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.employee.employee_code} - {self.leave_type.code} ({self.start_date} to {self.end_date})'
