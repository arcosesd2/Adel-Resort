from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from hr.models import PhilHealthRate


def _round_peso(x):
    return Decimal(x).quantize(Decimal('1'), rounding=ROUND_HALF_UP)


def compute(monthly_basic, on_date=None):
    on_date = on_date or date.today()
    rate = PhilHealthRate.objects.filter(effective_from__lte=on_date).order_by('-effective_from').first()
    if rate is None:
        return {'employee': Decimal('0.00'), 'employer': Decimal('0.00'), 'total': Decimal('0.00')}
    salary = Decimal(monthly_basic)
    base = max(rate.salary_floor, min(salary, rate.salary_ceiling))
    premium = base * (rate.premium_rate_percent / Decimal('100'))
    premium = _round_peso(premium)
    ee_share = (premium * (rate.employee_share_percent / Decimal('100')))
    ee_share = _round_peso(ee_share)
    er_share = premium - ee_share
    return {
        'employee': Decimal(ee_share).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
        'employer': Decimal(er_share).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
        'total': Decimal(premium).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
    }
