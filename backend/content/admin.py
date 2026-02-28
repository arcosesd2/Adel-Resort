from django.contrib import admin
from .models import Event, Promotion, Pricing


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'date', 'is_active')
    list_filter = ('is_active', 'date')
    list_editable = ('is_active',)
    search_fields = ('title',)


@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ('title', 'discount_info', 'valid_from', 'valid_until', 'is_active')
    list_filter = ('is_active',)
    list_editable = ('is_active',)
    search_fields = ('title',)


@admin.register(Pricing)
class PricingAdmin(admin.ModelAdmin):
    list_display = ('label', 'room_type', 'day_price', 'night_price', 'order')
    list_filter = ('room_type',)
    list_editable = ('day_price', 'night_price', 'order')
    ordering = ('order',)
