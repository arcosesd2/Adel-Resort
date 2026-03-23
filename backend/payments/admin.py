from django.contrib import admin
from django.utils.safestring import mark_safe
from .models import Payment, GCashConfig


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'booking', 'gcash_reference', 'payment_type', 'amount', 'currency', 'status', 'created_at')
    list_filter = ('status', 'payment_type', 'currency')
    fields = ('booking', 'gcash_reference', 'proof_of_payment', 'proof_of_payment_preview', 'payment_type', 'amount', 'currency', 'status', 'created_at', 'updated_at')
    readonly_fields = ('booking', 'gcash_reference', 'proof_of_payment_preview', 'payment_type', 'amount', 'currency', 'created_at', 'updated_at')

    @admin.display(description='Proof of Payment')
    def proof_of_payment_preview(self, obj):
        if obj.proof_of_payment:
            return mark_safe(f'<img src="{obj.proof_of_payment.url}" style="max-height:400px; max-width:100%;" />')
        return '-'


@admin.register(GCashConfig)
class GCashConfigAdmin(admin.ModelAdmin):
    list_display = ('account_name', 'gcash_number', 'updated_at')
    fields = ('gcash_number', 'account_name', 'qr_code', 'qr_code_preview', 'updated_at')
    readonly_fields = ('qr_code_preview', 'updated_at')

    def has_add_permission(self, request):
        return not GCashConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description='QR Code Preview')
    def qr_code_preview(self, obj):
        if obj.qr_code:
            return mark_safe(f'<img src="{obj.qr_code.url}" style="max-height:300px;" />')
        return '-'
