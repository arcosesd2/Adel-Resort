from django.contrib import admin
from django.utils.safestring import mark_safe
from .models import Booking
from payments.models import Payment


class PaymentInline(admin.StackedInline):
    model = Payment
    extra = 0
    readonly_fields = ('gcash_reference', 'proof_of_payment_preview', 'amount', 'currency', 'created_at', 'updated_at')
    fields = ('gcash_reference', 'proof_of_payment_preview', 'amount', 'currency', 'status', 'created_at', 'updated_at')

    @admin.display(description='Proof of Payment')
    def proof_of_payment_preview(self, obj):
        if obj.proof_of_payment:
            return mark_safe(f'<img src="{obj.proof_of_payment.url}" style="max-height:400px; max-width:100%;" />')
        return '-'


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'room', 'check_in', 'check_out', 'total_price', 'status')
    list_filter = ('status',)
    list_editable = ('status',)
    search_fields = ('user__email', 'room__name')
    readonly_fields = ('total_price', 'created_at')
    inlines = [PaymentInline]
