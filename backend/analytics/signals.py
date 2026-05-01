from django.core.cache import cache
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from bookings.models import Booking
from payments.models import Payment
from vouchers.models import VoucherUsage


def _bust_revenue_cache():
    cache.delete('revenue_insights:staff')
    cache.delete('revenue_insights:superadmin')


@receiver(post_save, sender=Booking)
@receiver(post_delete, sender=Booking)
def _booking_changed(sender, **kwargs):
    _bust_revenue_cache()


@receiver(post_save, sender=Payment)
@receiver(post_delete, sender=Payment)
def _payment_changed(sender, **kwargs):
    _bust_revenue_cache()


@receiver(post_save, sender=VoucherUsage)
@receiver(post_delete, sender=VoucherUsage)
def _voucher_usage_changed(sender, **kwargs):
    _bust_revenue_cache()
