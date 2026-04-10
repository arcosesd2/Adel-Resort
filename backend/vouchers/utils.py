from zoneinfo import ZoneInfo

from django.utils import timezone


BUSINESS_TIME_ZONE = ZoneInfo('Asia/Manila')


def _get_voucher_date_range(voucher):
    valid_from_date = timezone.localtime(voucher.valid_from, BUSINESS_TIME_ZONE).date()
    valid_until_date = timezone.localtime(voucher.valid_until, BUSINESS_TIME_ZONE).date()
    return valid_from_date, valid_until_date


def get_voucher_validity_status(voucher, reference_time=None):
    reference_time = reference_time or timezone.now()
    current_date = timezone.localtime(reference_time, BUSINESS_TIME_ZONE).date()
    valid_from_date, valid_until_date = _get_voucher_date_range(voucher)

    if current_date < valid_from_date:
        return 'not_yet_valid'
    if current_date > valid_until_date:
        return 'expired'
    return 'valid'


def get_booking_voucher_validity_status(voucher, booking_dates):
    if not booking_dates:
        return 'valid'

    valid_from_date, valid_until_date = _get_voucher_date_range(voucher)
    earliest_booking_date = min(booking_dates)
    latest_booking_date = max(booking_dates)

    if earliest_booking_date < valid_from_date:
        return 'not_yet_valid'
    if latest_booking_date > valid_until_date:
        return 'expired'
    return 'valid'
