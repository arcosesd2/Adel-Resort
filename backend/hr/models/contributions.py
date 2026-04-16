from django.db import models


class SSSBracket(models.Model):
    range_from = models.DecimalField(max_digits=12, decimal_places=2)
    range_to = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    msc = models.DecimalField(max_digits=12, decimal_places=2)
    ee_contribution = models.DecimalField(max_digits=12, decimal_places=2)
    er_contribution = models.DecimalField(max_digits=12, decimal_places=2)
    ec_contribution = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    effective_from = models.DateField()

    class Meta:
        ordering = ['-effective_from', 'range_from']
        constraints = [
            models.UniqueConstraint(
                fields=['range_from', 'effective_from'],
                name='unique_sss_bracket_per_effective',
            ),
        ]

    def __str__(self):
        upper = f'{self.range_to}' if self.range_to else '+'
        return f'SSS [{self.range_from}-{upper}] MSC={self.msc} (eff {self.effective_from})'


class PhilHealthRate(models.Model):
    effective_from = models.DateField(unique=True)
    premium_rate_percent = models.DecimalField(max_digits=5, decimal_places=2)
    salary_floor = models.DecimalField(max_digits=12, decimal_places=2)
    salary_ceiling = models.DecimalField(max_digits=12, decimal_places=2)
    employee_share_percent = models.DecimalField(max_digits=5, decimal_places=2, default=50)

    class Meta:
        ordering = ['-effective_from']

    def __str__(self):
        return f'PhilHealth {self.premium_rate_percent}% (eff {self.effective_from})'


class PagIbigRate(models.Model):
    effective_from = models.DateField(unique=True)
    ee_rate_low_percent = models.DecimalField(max_digits=5, decimal_places=2, default=1)
    ee_rate_high_percent = models.DecimalField(max_digits=5, decimal_places=2, default=2)
    er_rate_percent = models.DecimalField(max_digits=5, decimal_places=2, default=2)
    msc_ceiling = models.DecimalField(max_digits=12, decimal_places=2, default=10000)
    low_high_threshold = models.DecimalField(max_digits=12, decimal_places=2, default=1500)

    class Meta:
        ordering = ['-effective_from']

    def __str__(self):
        return f'Pag-IBIG (eff {self.effective_from})'


class BIRTaxBracket(models.Model):
    class Period(models.TextChoices):
        DAILY = 'daily', 'Daily'
        WEEKLY = 'weekly', 'Weekly'
        SEMI_MONTHLY = 'semi_monthly', 'Semi-monthly'
        MONTHLY = 'monthly', 'Monthly'
        ANNUAL = 'annual', 'Annual'

    effective_from = models.DateField()
    period = models.CharField(max_length=20, choices=Period.choices)
    range_from = models.DecimalField(max_digits=14, decimal_places=2)
    range_to = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    base_tax = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    rate_on_excess_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    excess_over = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ['-effective_from', 'period', 'range_from']
        constraints = [
            models.UniqueConstraint(
                fields=['effective_from', 'period', 'range_from'],
                name='unique_bir_bracket_per_effective_period',
            ),
        ]

    def __str__(self):
        upper = f'{self.range_to}' if self.range_to else '+'
        return f'BIR-{self.period} [{self.range_from}-{upper}] (eff {self.effective_from})'
