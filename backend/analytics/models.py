from django.conf import settings
from django.db import models


class PageView(models.Model):
    visitor_id = models.CharField(max_length=36, db_index=True)
    page_path = models.CharField(max_length=500, db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f'{self.page_path} - {self.visitor_id[:8]} - {self.timestamp}'


class StaffVisitor(models.Model):
    """A visitor_id seen with an authenticated staff/admin/superadmin user.
    Tracks created from any visitor_id present in this table are dropped, and
    historical PageViews from these visitor_ids are excluded from public stats."""
    visitor_id = models.CharField(max_length=36, unique=True, db_index=True)
    first_seen = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='staff_visitor_marks',
    )

    class Meta:
        ordering = ['-last_seen']

    def __str__(self):
        return f'{self.visitor_id[:8]} ({self.user_id or "unlinked"})'
