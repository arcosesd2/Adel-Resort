from django.contrib import admin
from .models import PageView, StaffVisitor


@admin.register(PageView)
class PageViewAdmin(admin.ModelAdmin):
    list_display = ('page_path', 'visitor_id', 'timestamp')
    list_filter = ('page_path', 'timestamp')
    search_fields = ('visitor_id', 'page_path')
    readonly_fields = ('visitor_id', 'page_path', 'timestamp')


@admin.register(StaffVisitor)
class StaffVisitorAdmin(admin.ModelAdmin):
    list_display = ('visitor_id', 'user', 'first_seen', 'last_seen')
    search_fields = ('visitor_id', 'user__username')
    readonly_fields = ('visitor_id', 'first_seen', 'last_seen')
