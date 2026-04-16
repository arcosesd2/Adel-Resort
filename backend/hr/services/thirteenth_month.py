from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Sum

from hr.models import Payslip


THIRTEENTH_MONTH_TAX_EXEMPT_CEILING = Decimal('90000.00')


def compute_for_employee(employee, year):
    """Sum of gross_basic earned by employee in the calendar year, divided by 12."""
    total = (
        Payslip.objects
        .filter(employee=employee, run__period__year=year)
        .exclude(run__status='voided')
        .aggregate(t=Sum('gross_basic'))
        ['t']
        or Decimal('0')
    )
    base = (Decimal(total) / Decimal('12')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    exempt = min(base, THIRTEENTH_MONTH_TAX_EXEMPT_CEILING)
    taxable = (base - exempt).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    return {
        'total_basic_earned': Decimal(total).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
        'thirteenth_month': base,
        'exempt_portion': exempt,
        'taxable_portion': taxable,
    }
