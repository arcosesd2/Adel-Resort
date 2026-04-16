from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from hr.models import SSSBracket, PhilHealthRate, PagIbigRate, BIRTaxBracket


EFFECTIVE_FROM = date(2025, 1, 1)


# 2025 SSS contribution table (range_from, range_to, msc, ee, er, ec)
# Source: SSS Circular 2024-028 — 15% rate, effective Jan 2025.
# EE share = MSC * 5%, ER share = MSC * 10%. EC = 10 for MSC < 15000 else 30.
def _sss_rows():
    # MSC rungs from 5,000 to 35,000 in 500 increments per 2025 schedule.
    rows = []
    msc = Decimal('5000')
    step = Decimal('500')
    floor_range = Decimal('0')
    while msc <= Decimal('35000'):
        ee = (msc * Decimal('0.05')).quantize(Decimal('0.01'))
        er = (msc * Decimal('0.10')).quantize(Decimal('0.01'))
        ec = Decimal('10.00') if msc < Decimal('15000') else Decimal('30.00')
        if msc == Decimal('5000'):
            rf = Decimal('0')
            rt = Decimal('5249.99')
        elif msc == Decimal('35000'):
            rf = Decimal('34750')
            rt = Decimal('9999999.99')
        else:
            rf = msc - Decimal('250')
            rt = msc + Decimal('249.99')
        rows.append((rf, rt, msc, ee, er, ec))
        msc += step
    return rows


def _seed_sss():
    created = 0
    for rf, rt, msc, ee, er, ec in _sss_rows():
        obj, was_created = SSSBracket.objects.update_or_create(
            range_from=rf, effective_from=EFFECTIVE_FROM,
            defaults={
                'range_to': rt, 'msc': msc,
                'ee_contribution': ee, 'er_contribution': er, 'ec_contribution': ec,
            },
        )
        if was_created:
            created += 1
    return created


def _seed_philhealth():
    # PhilHealth: 5.0% premium, floor 10,000 ceiling 100,000, split 50/50
    obj, created = PhilHealthRate.objects.update_or_create(
        effective_from=EFFECTIVE_FROM,
        defaults={
            'premium_rate_percent': Decimal('5.00'),
            'salary_floor': Decimal('10000.00'),
            'salary_ceiling': Decimal('100000.00'),
            'employee_share_percent': Decimal('50.00'),
        },
    )
    return 1 if created else 0


def _seed_pagibig():
    obj, created = PagIbigRate.objects.update_or_create(
        effective_from=EFFECTIVE_FROM,
        defaults={
            'ee_rate_low_percent': Decimal('1.00'),
            'ee_rate_high_percent': Decimal('2.00'),
            'er_rate_percent': Decimal('2.00'),
            'msc_ceiling': Decimal('10000.00'),
            'low_high_threshold': Decimal('1500.00'),
        },
    )
    return 1 if created else 0


# BIR TRAIN Law (2023 onwards)
# Annual: (range_from, range_to, base_tax, rate_on_excess_percent, excess_over)
BIR_ANNUAL = [
    (Decimal('0'),        Decimal('250000'),    Decimal('0'),         Decimal('0'),  Decimal('0')),
    (Decimal('250000'),   Decimal('400000'),    Decimal('0'),         Decimal('15'), Decimal('250000')),
    (Decimal('400000'),   Decimal('800000'),    Decimal('22500'),     Decimal('20'), Decimal('400000')),
    (Decimal('800000'),   Decimal('2000000'),   Decimal('102500'),    Decimal('25'), Decimal('800000')),
    (Decimal('2000000'),  Decimal('8000000'),   Decimal('402500'),    Decimal('30'), Decimal('2000000')),
    (Decimal('8000000'),  Decimal('9999999999'),Decimal('2202500'),   Decimal('35'), Decimal('8000000')),
]

BIR_MONTHLY = [
    (Decimal('0'),        Decimal('20833'),     Decimal('0'),         Decimal('0'),  Decimal('0')),
    (Decimal('20833'),    Decimal('33333'),     Decimal('0'),         Decimal('15'), Decimal('20833')),
    (Decimal('33333'),    Decimal('66667'),     Decimal('1875'),      Decimal('20'), Decimal('33333')),
    (Decimal('66667'),    Decimal('166667'),    Decimal('8541.80'),   Decimal('25'), Decimal('66667')),
    (Decimal('166667'),   Decimal('666667'),    Decimal('33541.80'),  Decimal('30'), Decimal('166667')),
    (Decimal('666667'),   Decimal('9999999999'),Decimal('183541.80'), Decimal('35'), Decimal('666667')),
]

BIR_SEMI_MONTHLY = [
    (Decimal('0'),        Decimal('10417'),     Decimal('0'),         Decimal('0'),  Decimal('0')),
    (Decimal('10417'),    Decimal('16667'),     Decimal('0'),         Decimal('15'), Decimal('10417')),
    (Decimal('16667'),    Decimal('33333'),     Decimal('937.50'),    Decimal('20'), Decimal('16667')),
    (Decimal('33333'),    Decimal('83333'),     Decimal('4270.70'),   Decimal('25'), Decimal('33333')),
    (Decimal('83333'),    Decimal('333333'),    Decimal('16770.70'),  Decimal('30'), Decimal('83333')),
    (Decimal('333333'),   Decimal('9999999999'),Decimal('91770.70'),  Decimal('35'), Decimal('333333')),
]

BIR_WEEKLY = [
    (Decimal('0'),        Decimal('4808'),      Decimal('0'),         Decimal('0'),  Decimal('0')),
    (Decimal('4808'),     Decimal('7692'),      Decimal('0'),         Decimal('15'), Decimal('4808')),
    (Decimal('7692'),     Decimal('15385'),     Decimal('432.60'),    Decimal('20'), Decimal('7692')),
    (Decimal('15385'),    Decimal('38462'),     Decimal('1971.20'),   Decimal('25'), Decimal('15385')),
    (Decimal('38462'),    Decimal('153846'),    Decimal('7740.45'),   Decimal('30'), Decimal('38462')),
    (Decimal('153846'),   Decimal('9999999999'),Decimal('42355.65'),  Decimal('35'), Decimal('153846')),
]

BIR_DAILY = [
    (Decimal('0'),        Decimal('685'),       Decimal('0'),         Decimal('0'),  Decimal('0')),
    (Decimal('685'),      Decimal('1096'),      Decimal('0'),         Decimal('15'), Decimal('685')),
    (Decimal('1096'),     Decimal('2192'),      Decimal('61.65'),     Decimal('20'), Decimal('1096')),
    (Decimal('2192'),     Decimal('5479'),      Decimal('280.85'),    Decimal('25'), Decimal('2192')),
    (Decimal('5479'),     Decimal('21918'),     Decimal('1102.60'),   Decimal('30'), Decimal('5479')),
    (Decimal('21918'),    Decimal('9999999999'),Decimal('6034.30'),   Decimal('35'), Decimal('21918')),
]


def _seed_bir():
    tables = {
        'annual': BIR_ANNUAL,
        'monthly': BIR_MONTHLY,
        'semi_monthly': BIR_SEMI_MONTHLY,
        'weekly': BIR_WEEKLY,
        'daily': BIR_DAILY,
    }
    created = 0
    for period, rows in tables.items():
        for rf, rt, base, rate, excess in rows:
            obj, was_created = BIRTaxBracket.objects.update_or_create(
                period=period, range_from=rf, effective_from=EFFECTIVE_FROM,
                defaults={
                    'range_to': rt,
                    'base_tax': base,
                    'rate_on_excess_percent': rate,
                    'excess_over': excess,
                },
            )
            if was_created:
                created += 1
    return created


class Command(BaseCommand):
    help = 'Seed or refresh statutory contribution reference tables (SSS, PhilHealth, Pag-IBIG, BIR).'

    @transaction.atomic
    def handle(self, *args, **options):
        sss = _seed_sss()
        ph = _seed_philhealth()
        pi = _seed_pagibig()
        bir = _seed_bir()
        self.stdout.write(self.style.SUCCESS(
            f'Seeded: SSS brackets={sss} (new), PhilHealth={ph}, Pag-IBIG={pi}, BIR brackets={bir} (new). '
            f'Effective from {EFFECTIVE_FROM.isoformat()}.'
        ))
