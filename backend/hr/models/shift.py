from django.conf import settings
from django.db import models


class Shift(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=30, unique=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    break_minutes = models.PositiveIntegerField(
        default=60,
        help_text='Unpaid break duration in minutes.',
    )
    grace_period_minutes = models.PositiveIntegerField(
        default=15,
        help_text='Minutes after shift start before marked late.',
    )
    is_night_shift = models.BooleanField(
        default=False,
        help_text='Mark if this shift primarily covers 10PM-6AM.',
    )
    is_active = models.BooleanField(default=True)
    color = models.CharField(
        max_length=7, blank=True, default='#3b82f6',
        help_text='Hex color for calendar display.',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.code} - {self.name} ({self.start_time}-{self.end_time})'

    @property
    def work_hours(self):
        from datetime import datetime, timedelta
        start = datetime.combine(datetime.today(), self.start_time)
        end = datetime.combine(datetime.today(), self.end_time)
        if end <= start:
            end += timedelta(days=1)
        total_minutes = (end - start).total_seconds() / 60 - self.break_minutes
        return max(total_minutes, 0) / 60


class ShiftAssignment(models.Model):
    employee = models.ForeignKey(
        'hr.Employee', on_delete=models.CASCADE, related_name='shift_assignments',
    )
    shift = models.ForeignKey(
        Shift, on_delete=models.CASCADE, related_name='assignments',
    )
    effective_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='shift_assignments_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-effective_date']

    def __str__(self):
        return f'{self.employee.employee_code} → {self.shift.code} ({self.effective_date})'

    @property
    def is_current(self):
        from datetime import date
        today = date.today()
        return self.effective_date <= today and (self.end_date is None or self.end_date >= today)
