from django.contrib import admin
from .models import Conversation, Message


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ('sender', 'content', 'is_staff_reply', 'is_read', 'created_at')


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('subject', 'customer', 'status', 'created_at', 'updated_at')
    list_filter = ('status',)
    search_fields = ('subject', 'customer__email', 'customer__first_name')
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('conversation', 'sender', 'is_staff_reply', 'is_read', 'created_at')
    list_filter = ('is_staff_reply', 'is_read')
