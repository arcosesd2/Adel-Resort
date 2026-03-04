from django.contrib import admin
from .models import PageView


@admin.register(PageView)
class PageViewAdmin(admin.ModelAdmin):
    list_display = ('page_path', 'visitor_id', 'timestamp')
    list_filter = ('page_path', 'timestamp')
    search_fields = ('visitor_id', 'page_path')
    readonly_fields = ('visitor_id', 'page_path', 'timestamp')
