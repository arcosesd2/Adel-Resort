from django.contrib import admin
from .models import Room, RoomImage
from .forms import RoomAdminForm


class RoomImageInline(admin.TabularInline):
    model = RoomImage
    extra = 1


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    form = RoomAdminForm
    list_display = ('name', 'room_type', 'day_price', 'night_price', 'is_day_only', 'capacity', 'is_active')
    list_filter = ('room_type', 'is_active')
    search_fields = ('name',)
    inlines = [RoomImageInline]


@admin.register(RoomImage)
class RoomImageAdmin(admin.ModelAdmin):
    list_display = ('room', 'is_primary', 'order')
