from django.conf import settings
from django.core.files.storage import default_storage
from django.db import models
from rooms.models import RoomType


def _get_video_storage():
    if not settings.DEBUG:
        from cloudinary_storage.storage import VideoMediaCloudinaryStorage
        return VideoMediaCloudinaryStorage()
    return default_storage


class News(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    image = models.ImageField(upload_to='news/', blank=True, null=True)
    published_date = models.DateField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-published_date']
        verbose_name_plural = 'News'

    def __str__(self):
        return self.title


class Event(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    image = models.ImageField(upload_to='events/', blank=True, null=True)
    date = models.DateField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date']

    def __str__(self):
        return self.title


class Promotion(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    image = models.ImageField(upload_to='promotions/', blank=True, null=True)
    discount_info = models.CharField(max_length=200)
    valid_from = models.DateField()
    valid_until = models.DateField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-valid_from']

    def __str__(self):
        return self.title


class HeroConfig(models.Model):
    video = models.FileField(upload_to='hero/', blank=True, storage=_get_video_storage)
    poster = models.ImageField(upload_to='hero/', blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Homepage Intro'
        verbose_name_plural = 'Homepage Intro'

    def __str__(self):
        return 'Homepage Intro'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class Pricing(models.Model):
    room_type = models.CharField(max_length=25, choices=RoomType.choices)
    label = models.CharField(max_length=200)
    day_price = models.DecimalField(max_digits=10, decimal_places=2)
    night_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']
        verbose_name_plural = 'Pricing'

    def __str__(self):
        return f'{self.label} ({self.get_room_type_display()})'
