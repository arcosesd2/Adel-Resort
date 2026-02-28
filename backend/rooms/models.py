from django.db import models


class RoomType(models.TextChoices):
    SMALL_COTTAGE = 'small_cottage', 'Small Cottage'
    DOS_ANDANAS_DOWN = 'dos_andanas_down', 'Dos Andanas Cottage Down'
    DOS_ANDANAS_UP = 'dos_andanas_up', 'Dos Andanas Cottage Up'
    LARGE_COTTAGE = 'large_cottage', 'Large Cottage'
    DOS_ANDANAS_ROOM_SM = 'dos_andanas_room_sm', 'Dos Andanas Room w/ Cottage (Small)'
    DOS_ANDANAS_ROOM_LG = 'dos_andanas_room_lg', 'Dos Andanas Room w/ Cottage (Large)'
    LAVENDER_HOUSE = 'lavender_house', 'Lavender House'
    AC_KARAOKE = 'ac_karaoke', 'Air-Conditioned Karaoke Room'
    KUBO_WITH_TOILET = 'kubo_with_toilet', 'Kubo Room & Cottage w/ Toilet'
    KUBO_WITHOUT_TOILET = 'kubo_without_toilet', 'Kubo Room & Cottage w/o Toilet'
    FUNCTION_HALL = 'function_hall', 'Function Hall'
    TRAPAL_TABLE = 'trapal_table', 'Trapal Table'


class Room(models.Model):
    name = models.CharField(max_length=200)
    room_type = models.CharField(max_length=25, choices=RoomType.choices, default=RoomType.SMALL_COTTAGE)
    description = models.TextField()
    day_price = models.DecimalField(max_digits=10, decimal_places=2)
    night_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_day_only = models.BooleanField(default=False)
    capacity = models.PositiveIntegerField(default=2)
    size_sqm = models.PositiveIntegerField(null=True, blank=True)
    amenities = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['day_price']

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
