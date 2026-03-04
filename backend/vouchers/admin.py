from django.contrib import admin
from .models import Voucher, VoucherUsage


@admin.register(Voucher)
class VoucherAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_type', 'discount_value', 'is_active', 'times_used', 'valid_from', 'valid_until')
    list_filter = ('is_active', 'discount_type')
    search_fields = ('code',)


@admin.register(VoucherUsage)
class VoucherUsageAdmin(admin.ModelAdmin):
    list_display = ('voucher', 'booking', 'user', 'discount_amount', 'created_at')
    list_filter = ('created_at',)
