from zoneinfo import ZoneInfo

from django.utils import timezone


BUSINESS_TIME_ZONE = ZoneInfo('Asia/Manila')


def get_voucher_validity_status(voucher, reference_time=None):
    reference_time = reference_time or timezone.now()
    current_date = timezone.localtime(reference_time, BUSINESS_TIME_ZONE).date()
    valid_from_date = timezone.localtime(voucher.valid_from, BUSINESS_TIME_ZONE).date()
    valid_until_date = timezone.localtime(voucher.valid_until, BUSINESS_TIME_ZONE).date()

    if current_date < valid_from_date:
        return 'not_yet_valid'
    if current_date > valid_until_date:
        return 'expired'
    return 'valid'

