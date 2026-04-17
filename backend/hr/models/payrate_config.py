from django.conf import settings
from django.db import models


class PayRateConfig(models.Model):
    effective_from = models.DateField(unique=True)

    ot_ordinary_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=125.00,
        help_text='Overtime on ordinary workday (% of hourly rate)',
    )
    ot_rest_day_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=160.00,
        help_text='Overtime on rest day (% of hourly rate)',
    )
    ot_regular_holiday_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=260.00,
        help_text='Overtime on regular holiday (% of hourly rate)',
    )
    ot_special_holiday_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=195.00,
        help_text='Overtime on special non-working holiday (% of hourly rate)',
    )
    ot_rest_day_regular_holiday_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=390.00,
        help_text='Overtime on rest day + regular holiday (% of hourly rate)',
    )
    ot_rest_day_special_holiday_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=195.00,
        help_text='Overtime on rest day + special holiday (% of hourly rate)',
    )

    regular_holiday_rate_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=200.00,
        help_text='Regular holiday first 8h (% of daily rate)',
    )
    special_holiday_rate_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=130.00,
        help_text='Special non-working holiday first 8h (% of daily rate)',
    )
    rest_day_rate_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=130.00,
        help_text='Rest day first 8h (% of daily rate)',
    )
    rest_day_regular_holiday_rate_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=260.00,
        help_text='Rest day + regular holiday first 8h (% of daily rate)',
    )
    rest_day_special_holiday_rate_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=150.00,
        help_text='Rest day + special holiday first 8h (% of daily rate)',
    )

    night_diff_ordinary_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=10.00,
        help_text='Night diff on ordinary workday (% premium on hourly rate, 10PM-6AM)',
    )
    night_diff_rest_day_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=20.00,
        help_text='Night diff on rest day (% premium on hourly rate)',
    )
    night_diff_holiday_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=20.00,
        help_text='Night diff on holiday (% premium on hourly rate)',
    )

    late_deduction_multiplier_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=100.00,
        help_text='Late deduction multiplier (% of proportional hourly deduction)',
    )
    undertime_deduction_multiplier_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=100.00,
        help_text='Undertime deduction multiplier (% of proportional hourly deduction)',
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='payrate_configs_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-effective_from']

    def __str__(self):
        return f'PayRateConfig effective {self.effective_from}'

    def ot_rate(self, is_rest_day, is_holiday, holiday_type):
        if is_rest_day and is_holiday:
            if holiday_type == 'regular':
                return self.ot_rest_day_regular_holiday_pct
            return self.ot_rest_day_special_holiday_pct
        if is_holiday:
            if holiday_type == 'regular':
                return self.ot_regular_holiday_pct
            return self.ot_special_holiday_pct
        if is_rest_day:
            return self.ot_rest_day_pct
        return self.ot_ordinary_pct

    def day_rate(self, is_rest_day, is_holiday, holiday_type):
        if is_rest_day and is_holiday:
            if holiday_type == 'regular':
                return self.rest_day_regular_holiday_rate_pct
            return self.rest_day_special_holiday_rate_pct
        if is_holiday:
            if holiday_type == 'regular':
                return self.regular_holiday_rate_pct
            return self.special_holiday_rate_pct
        if is_rest_day:
            return self.rest_day_rate_pct
        return None

    def night_diff_pct(self, is_rest_day, is_holiday):
        if is_rest_day or is_holiday:
            return self.night_diff_holiday_pct
        return self.night_diff_ordinary_pct
