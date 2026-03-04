from django.db import models


class PageView(models.Model):
    visitor_id = models.CharField(max_length=36, db_index=True)
    page_path = models.CharField(max_length=500, db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f'{self.page_path} - {self.visitor_id[:8]} - {self.timestamp}'
