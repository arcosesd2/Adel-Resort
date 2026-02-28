from django.db import models
from django.conf import settings


class BookingStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    CONFIRMED = 'confirmed', 'Confirmed'
    CANCELLED = 'cancelled', 'Cancelled'
    COMPLETED = 'completed', 'Completed'


class TourType(models.TextChoices):
    DAY = 'day', 'Day Tour (8AM – 5PM)'
    NIGHT = 'night', 'Night Tour (5PM – 8AM)'


class Booking(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookings')
    room = models.ForeignKey('rooms.Room', on_delete=models.PROTECT, related_name='bookings')
    check_in = models.DateField()
    check_out = models.DateField()
    guests = models.PositiveIntegerField(default=1)
    tour_type = models.CharField(max_length=10, choices=TourType.choices, default=TourType.DAY)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=BookingStatus.choices, default=BookingStatus.PENDING)

    special_requests = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Booking #{self.id} - {self.user.email} - {self.room.name}'

    @property
    def nights(self):
        return (self.check_out - self.check_in).days
