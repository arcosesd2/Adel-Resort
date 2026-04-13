from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import Payment, PaymentStatus, GCashConfig
from bookings.models import BookingStatus


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'booking_reference', 'guest_name', 'room_name',
        'gcash_reference', 'payment_type', 'amount', 'status', 'created_at',
    )
    list_filter = ('status', 'payment_type')
    search_fields = ('booking__reference_code', 'gcash_reference', 'booking__user__first_name', 'booking__user__last_name', 'booking__user__email')
    list_select_related = ('booking', 'booking__user', 'booking__room')
    ordering = ('-created_at',)
    fields = (
        'booking', 'gcash_reference', 'proof_of_payment', 'proof_of_payment_preview',
        'payment_type', 'amount', 'currency', 'status', 'created_at', 'updated_at',
    )
    readonly_fields = ('booking', 'gcash_reference', 'proof_of_payment_preview', 'payment_type', 'amount', 'currency', 'created_at', 'updated_at')

    @admin.display(description='Booking Ref')
    def booking_reference(self, obj):
        return obj.booking.reference_code

    @admin.display(description='Guest')
    def guest_name(self, obj):
        u = obj.booking.user
        full = f'{u.first_name} {u.last_name}'.strip()
        return full or u.username

    @admin.display(description='Room')
    def room_name(self, obj):
        return obj.booking.room.name

    @admin.display(description='Proof of Payment')
    def proof_of_payment_preview(self, obj):
        if obj.proof_of_payment:
            return format_html(
                '<a href="{}" target="_blank"><img src="{}" style="max-height:400px; max-width:100%;" /></a>',
                obj.proof_of_payment.url, obj.proof_of_payment.url,
            )
        return '-'

    def save_model(self, request, obj, form, change):
        """Sync booking status when payment status changes in Django admin."""
        if change:
            old_obj = Payment.objects.get(pk=obj.pk)
            old_status = old_obj.status
        else:
            old_status = None

        super().save_model(request, obj, form, change)

        if not change or old_status == obj.status:
            return

        booking = obj.booking
        if obj.status == PaymentStatus.SUCCEEDED and booking.status != BookingStatus.CONFIRMED:
            booking.status = BookingStatus.CONFIRMED
            booking.approved_at = timezone.now()
            booking.save(update_fields=['status', 'approved_at'])
        elif obj.status == PaymentStatus.FAILED and booking.status == BookingStatus.CONFIRMED:
            booking.status = BookingStatus.PENDING
            booking.approved_at = None
            booking.save(update_fields=['status', 'approved_at'])
        elif obj.status == PaymentStatus.REFUNDED:
            booking.status = BookingStatus.CANCELLED
            booking.save(update_fields=['status'])


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
            return format_html('<img src="{}" style="max-height:300px;" />', obj.qr_code.url)
        return '-'
