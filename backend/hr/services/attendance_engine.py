from datetime import datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP

from hr.models import AttendanceRecord
from hr.services import holiday_engine
from hr.services import shift_engine
from hr.services import payrate_engine


CENTS = Decimal('0.01')


def _q(x):
    return Decimal(x).quantize(CENTS, rounding=ROUND_HALF_UP)


def _night_diff_window():
    return time(22, 0), time(6, 0)


def _is_in_night_window(dt):
    t = dt.time()
    start, end = _night_diff_window()
    if start > end:
        return t >= start or t < end
    return start <= t < end


def _compute_night_diff_minutes(time_in, time_out):
    start_night, end_night = _night_diff_window()
    total_minutes = 0
    current_date = time_in.date()
    end_date = time_out.date() if time_out.date() >= time_in.date() else time_in.date()
    while current_date <= end_date:
        night_start = datetime.combine(current_date, start_night)
        night_end = datetime.combine(current_date + timedelta(days=1), end_night)
        overlap_start = max(time_in, night_start)
        overlap_end = min(time_out, night_end)
        if overlap_end > overlap_start:
            total_minutes += (overlap_end - overlap_start).total_seconds() / 60
        current_date += timedelta(days=1)
    return max(total_minutes, 0)


def auto_compute(record):
    if record.time_out is None:
        return record

    shift = record.shift
    if shift is None:
        shift = shift_engine.get_employee_shift(record.employee, record.date)

    if shift is not None:
        record.shift = shift
        shift_start_dt = datetime.combine(record.date, shift.start_time)
        shift_end_dt = datetime.combine(record.date, shift.end_time)
        if shift_end_dt <= shift_start_dt:
            shift_end_dt += timedelta(days=1)

        total_minutes = (record.time_out - record.time_in).total_seconds() / 60
        net_minutes = total_minutes - shift.break_minutes
        net_minutes = max(net_minutes, 0)

        shift_duration_minutes = (shift_end_dt - shift_start_dt).total_seconds() / 60
        regular_minutes = min(net_minutes, shift_duration_minutes)
        record.hours_worked = _q(Decimal(str(regular_minutes / 60)))

        overtime_minutes = max(net_minutes - shift_duration_minutes, 0)
        record.overtime_hours = _q(Decimal(str(overtime_minutes / 60)))

        clock_in_with_grace = shift_start_dt + timedelta(minutes=shift.grace_period_minutes)
        if record.time_in > clock_in_with_grace:
            record.is_late = True
            record.late_minutes = int((record.time_in - shift_start_dt).total_seconds() / 60)
        else:
            record.is_late = False
            record.late_minutes = 0

        if record.time_out < shift_end_dt:
            record.is_undertime = True
            record.undertime_minutes = int((shift_end_dt - record.time_out).total_seconds() / 60)
        else:
            record.is_undertime = False
            record.undertime_minutes = 0
    else:
        total_minutes = (record.time_out - record.time_in).total_seconds() / 60
        record.hours_worked = _q(Decimal(str(total_minutes / 60)))
        record.overtime_hours = Decimal('0')
        record.is_late = False
        record.late_minutes = 0
        record.is_undertime = False
        record.undertime_minutes = 0

    holiday_obj = holiday_engine.is_holiday(record.date)
    if holiday_obj:
        record.is_holiday = True
        record.holiday_type = holiday_obj.holiday_type
    else:
        record.is_holiday = False
        record.holiday_type = ''

    if record.date.weekday() == 6:
        record.is_rest_day = True
    elif shift is not None and shift_engine.is_rest_day_for_shift(record.date, shift):
        record.is_rest_day = True
    else:
        record.is_rest_day = False

    night_minutes = _compute_night_diff_minutes(record.time_in, record.time_out)
    record.night_diff_hours = _q(Decimal(str(night_minutes / 60)))

    return record


def compute_record_pay(record, hourly_rate, daily_rate):
    if record.time_out is None:
        return {
            'overtime_pay': Decimal('0'),
            'holiday_pay': Decimal('0'),
            'rest_day_pay': Decimal('0'),
            'night_diff_pay': Decimal('0'),
            'late_deduction': Decimal('0'),
            'undertime_deduction': Decimal('0'),
        }

    is_rest = record.is_rest_day
    is_hol = record.is_holiday
    hol_type = record.holiday_type

    overtime_pay = Decimal('0')
    if record.overtime_hours > 0:
        overtime_pay = payrate_engine.compute_overtime_pay(
            record.overtime_hours, hourly_rate, is_rest, is_hol, hol_type, record.date
        )

    holiday_pay = Decimal('0')
    rest_day_pay = Decimal('0')
    if is_hol or is_rest:
        hol_pay, rd_pay = payrate_engine.compute_holiday_or_rest_day_pay(
            record.hours_worked, daily_rate, hourly_rate, is_rest, is_hol, hol_type, record.date
        )
        holiday_pay = hol_pay
        rest_day_pay = rd_pay

    night_diff_pay = Decimal('0')
    if record.night_diff_hours > 0:
        night_diff_pay = payrate_engine.compute_night_diff_pay(
            record.night_diff_hours, hourly_rate, is_rest, is_hol, record.date
        )

    late_deduction = Decimal('0')
    if record.late_minutes > 0:
        late_deduction = payrate_engine.compute_late_deduction(
            record.late_minutes, hourly_rate, record.date
        )

    undertime_deduction = Decimal('0')
    if record.undertime_minutes > 0:
        undertime_deduction = payrate_engine.compute_undertime_deduction(
            record.undertime_minutes, hourly_rate, record.date
        )

    return {
        'overtime_pay': overtime_pay,
        'holiday_pay': holiday_pay,
        'rest_day_pay': rest_day_pay,
        'night_diff_pay': night_diff_pay,
        'late_deduction': late_deduction,
        'undertime_deduction': undertime_deduction,
    }


def aggregate_for_period(employee, period):
    records = AttendanceRecord.objects.filter(
        employee=employee,
        date__gte=period.start_date,
        date__lte=period.end_date,
        is_approved=True,
        time_out__isnull=False,
    )

    comp = employee.current_compensation(period.end_date)
    if comp is None:
        return _empty_aggregate()

    hourly_rate = comp.computed_hourly_rate()
    daily_rate = comp.computed_daily_rate()

    total_days_worked = Decimal('0')
    total_overtime_pay = Decimal('0')
    total_holiday_pay = Decimal('0')
    total_rest_day_pay = Decimal('0')
    total_night_diff_pay = Decimal('0')
    total_late_deduction = Decimal('0')
    total_undertime_deduction = Decimal('0')
    total_overtime_hours = Decimal('0')
    total_night_diff_hours = Decimal('0')

    for record in records:
        pay = compute_record_pay(record, hourly_rate, daily_rate)
        total_days_worked += record.hours_worked / Decimal('8') if record.hours_worked else Decimal('0')
        total_overtime_pay += pay['overtime_pay']
        total_holiday_pay += pay['holiday_pay']
        total_rest_day_pay += pay['rest_day_pay']
        total_night_diff_pay += pay['night_diff_pay']
        total_late_deduction += pay['late_deduction']
        total_undertime_deduction += pay['undertime_deduction']
        total_overtime_hours += record.overtime_hours
        total_night_diff_hours += record.night_diff_hours

    has_attendance_data = records.exists()

    return {
        'has_attendance_data': has_attendance_data,
        'days_worked': _q(total_days_worked),
        'overtime_pay': _q(total_overtime_pay),
        'holiday_pay': _q(total_holiday_pay),
        'rest_day_pay': _q(total_rest_day_pay),
        'night_diff_pay': _q(total_night_diff_pay),
        'late_deduction': _q(total_late_deduction),
        'undertime_deduction': _q(total_undertime_deduction),
        'total_overtime_hours': _q(total_overtime_hours),
        'total_night_diff_hours': _q(total_night_diff_hours),
    }


def _empty_aggregate():
    return {
        'has_attendance_data': False,
        'days_worked': Decimal('0'),
        'overtime_pay': Decimal('0'),
        'holiday_pay': Decimal('0'),
        'rest_day_pay': Decimal('0'),
        'night_diff_pay': Decimal('0'),
        'late_deduction': Decimal('0'),
        'undertime_deduction': Decimal('0'),
        'total_overtime_hours': Decimal('0'),
        'total_night_diff_hours': Decimal('0'),
    }


def get_unapproved_count(period):
    return AttendanceRecord.objects.filter(
        date__gte=period.start_date,
        date__lte=period.end_date,
        is_approved=False,
        time_out__isnull=False,
        employee__is_active=True,
    ).count()


def get_missing_clock_out_count(period):
    return AttendanceRecord.objects.filter(
        date__gte=period.start_date,
        date__lte=period.end_date,
        time_out__isnull=True,
        employee__is_active=True,
    ).count()
