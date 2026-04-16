from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from hr.models import SSSBracket


def lookup_bracket(salary, on_date=None):
    on_date = on_date or date.today()
    qs = SSSBracket.objects.filter(effective_from__lte=on_date).order_by('-effective_from', 'range_from')
    latest_eff = qs.values_list('effective_from', flat=True).first()
    if latest_eff is None:
        return None
    qs = SSSBracket.objects.filter(effective_from=latest_eff).order_by('range_from')
    for b in qs:
        if b.range_to is None and salary >= b.range_from:
            return b
        if b.range_from <= salary <= (b.range_to or salary):
            return b
    return qs.last()


def compute(monthly_basic, on_date=None, msc_override=None):
    """Returns dict with employee, employer, ec, msc — all Decimals."""
    salary = Decimal(monthly_basic)
    bracket = None
    if msc_override is not None:
        # Find the bracket whose MSC matches the override.
        on_date = on_date or date.today()
        latest = SSSBracket.objects.filter(effective_from__lte=on_date).order_by('-effective_from').values_list('effective_from', flat=True).first()
        if latest:
            bracket = SSSBracket.objects.filter(effective_from=latest, msc=msc_override).first()
    if bracket is None:
        bracket = lookup_bracket(salary, on_date)
    if bracket is None:
        return {
            'employee': Decimal('0.00'),
            'employer': Decimal('0.00'),
            'ec': Decimal('0.00'),
            'msc': Decimal('0.00'),
        }
    return {
        'employee': bracket.ee_contribution.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
        'employer': bracket.er_contribution.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
        'ec': bracket.ec_contribution.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
        'msc': bracket.msc.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
    }
