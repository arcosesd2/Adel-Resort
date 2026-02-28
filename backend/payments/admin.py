from django.contrib import admin
from django.utils.safestring import mark_safe
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'booking', 'gcash_reference', 'amount', 'currency', 'status', 'created_at')
    list_filter = ('status', 'currency')
    fields = ('booking', 'gcash_reference', 'proof_of_payment', 'proof_of_payment_preview', 'amount', 'currency', 'status', 'created_at', 'updated_at')
    readonly_fields = ('booking', 'gcash_reference', 'proof_of_payment_preview', 'amount', 'currency', 'created_at', 'updated_at')

    @admin.display(description='Proof of Payment')
    def proof_of_payment_preview(self, obj):
        if obj.proof_of_payment:
            return mark_safe(f'<img src="{obj.proof_of_payment.url}" style="max-height:400px; max-width:100%;" />')
        return '-'
