from django.contrib import admin
from django.utils.safestring import mark_safe
from .models import News, Event, Promotion, Pricing, HeroConfig, SiteSettings


@admin.register(News)
class NewsAdmin(admin.ModelAdmin):
    list_display = ('title', 'published_date', 'is_active')
    list_filter = ('is_active', 'published_date')
    list_editable = ('is_active',)
    search_fields = ('title',)


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


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'show_stats', 'show_testimonials', 'updated_at')

    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(HeroConfig)
class HeroConfigAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'updated_at')
    fields = ('video', 'poster', 'poster_preview', 'updated_at')
    readonly_fields = ('poster_preview', 'updated_at')

    def has_add_permission(self, request):
        return not HeroConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description='Poster Preview')
    def poster_preview(self, obj):
        if obj.poster:
            return mark_safe(f'<img src="{obj.poster.url}" style="max-height:200px;" />')
        return '-'

    class Media:
        # Allow large video uploads in admin
        pass
