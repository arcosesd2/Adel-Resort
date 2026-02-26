from django.contrib import admin
from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'room', 'check_in', 'check_out', 'total_price', 'status')
    list_filter = ('status',)
    search_fields = ('user__email', 'room__name')
    readonly_fields = ('total_price', 'stripe_payment_intent_id', 'created_at')
