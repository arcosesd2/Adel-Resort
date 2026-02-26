from django.db import models


class RoomType(models.TextChoices):
    STANDARD = 'standard', 'Standard'
    DELUXE = 'deluxe', 'Deluxe'
    SUITE = 'suite', 'Suite'
    VILLA = 'villa', 'Villa'
    BUNGALOW = 'bungalow', 'Bungalow'


class Room(models.Model):
    name = models.CharField(max_length=200)
    room_type = models.CharField(max_length=20, choices=RoomType.choices, default=RoomType.STANDARD)
    description = models.TextField()
    price_per_night = models.DecimalField(max_digits=10, decimal_places=2)
    capacity = models.PositiveIntegerField(default=2)
    size_sqm = models.PositiveIntegerField(null=True, blank=True)
    amenities = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['price_per_night']

    def __str__(self):
        return f'{self.name} ({self.get_room_type_display()})'


class RoomImage(models.Model):
    room = models.ForeignKey(Room, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='rooms/')
    alt_text = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f'Image for {self.room.name}'
