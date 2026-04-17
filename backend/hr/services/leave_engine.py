from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone

from hr.models import LeaveType, LeaveBalance, LeaveRequest
from hr.services import holiday_engine


CENTS = Decimal('0.01')


def _q(x):
    return Decimal(x).quantize(CENTS, rounding=ROUND_HALF_UP)


def compute_leave_days(start_date, end_date, half_day='none'):
    working_days = Decimal('0')
    current = start_date
    while current <= end_date:
        if current.weekday() < 6:
            hol = holiday_engine.is_holiday(current)
            if not hol or hol.holiday_type == 'special_working':
                working_days += Decimal('1')
        current += timedelta(days=1)

    if half_day == 'first_half' or half_day == 'second_half':
        if start_date == end_date:
            working_days = _q(working_days / Decimal('2'))

    return working_days


@transaction.atomic
def approve_leave(leave_request, reviewer):
    if leave_request.status != LeaveRequest.Status.PENDING:
        raise ValueError('Only pending requests can be approved.')

    days = compute_leave_days(
        leave_request.start_date, leave_request.end_date, leave_request.half_day
    )

    year = leave_request.start_date.year
    balance, _ = LeaveBalance.objects.get_or_create(
        employee=leave_request.employee,
        leave_type=leave_request.leave_type,
        year=year,
        defaults={'total_credits': leave_request.leave_type.default_credits},
    )

    balance.used = _q(balance.used + days)
    balance.save(update_fields=['used'])

    leave_request.status = LeaveRequest.Status.APPROVED
    leave_request.reviewed_by = reviewer
    leave_request.reviewed_at = timezone.now()
    leave_request.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])
    return leave_request


def reject_leave(leave_request, reviewer, notes=''):
    if leave_request.status != LeaveRequest.Status.PENDING:
        raise ValueError('Only pending requests can be rejected.')
    leave_request.status = LeaveRequest.Status.REJECTED
    leave_request.reviewed_by = reviewer
    leave_request.reviewed_at = timezone.now()
    leave_request.review_notes = notes
    leave_request.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'review_notes'])
    return leave_request


@transaction.atomic
def cancel_leave(leave_request):
    if leave_request.status not in (LeaveRequest.Status.PENDING, LeaveRequest.Status.APPROVED):
        raise ValueError('Only pending or approved requests can be cancelled.')

    if leave_request.status == LeaveRequest.Status.APPROVED:
        days = compute_leave_days(
            leave_request.start_date, leave_request.end_date, leave_request.half_day
        )
        year = leave_request.start_date.year
        try:
            balance = LeaveBalance.objects.get(
                employee=leave_request.employee,
                leave_type=leave_request.leave_type,
                year=year,
            )
            balance.used = _q(balance.used - days)
            balance.save(update_fields=['used'])
        except LeaveBalance.DoesNotExist:
            pass

    leave_request.status = LeaveRequest.Status.CANCELLED
    leave_request.save(update_fields=['status'])
    return leave_request


def initialize_leave_balances(employee, year):
    leave_types = LeaveType.objects.filter(is_active=True)
    created = []
    for lt in leave_types:
        balance, was_created = LeaveBalance.objects.get_or_create(
            employee=employee,
            leave_type=lt,
            year=year,
            defaults={'total_credits': lt.default_credits},
        )
        if was_created:
            created.append(balance)
    return created


def get_leave_for_period(employee, period):
    approved_leaves = LeaveRequest.objects.filter(
        employee=employee,
        status=LeaveRequest.Status.APPROVED,
        start_date__lte=period.end_date,
        end_date__gte=period.start_date,
        leave_type__is_paid=True,
    )

    paid_leave_days = Decimal('0')
    unpaid_leave_days = Decimal('0')

    for lr in approved_leaves:
        overlap_start = max(lr.start_date, period.start_date)
        overlap_end = min(lr.end_date, period.end_date)
        days = compute_leave_days(overlap_start, overlap_end, lr.half_day)
        if lr.leave_type.is_paid:
            paid_leave_days += days
        else:
            unpaid_leave_days += days

    unpaid_requests = LeaveRequest.objects.filter(
        employee=employee,
        status=LeaveRequest.Status.APPROVED,
        start_date__lte=period.end_date,
        end_date__gte=period.start_date,
        leave_type__is_paid=False,
    )
    for lr in unpaid_requests:
        overlap_start = max(lr.start_date, period.start_date)
        overlap_end = min(lr.end_date, period.end_date)
        days = compute_leave_days(overlap_start, overlap_end, lr.half_day)
        unpaid_leave_days += days

    return {
        'paid_leave_days': _q(paid_leave_days),
        'unpaid_leave_days': _q(unpaid_leave_days),
    }
