from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'booking', 'amount', 'currency', 'status', 'created_at')
    list_filter = ('status', 'currency')
    readonly_fields = ('stripe_payment_id', 'created_at', 'updated_at')
