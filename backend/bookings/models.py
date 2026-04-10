from django.db import models
from django.conf import settings


class BookingStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    CONFIRMED = 'confirmed', 'Confirmed'
    CANCELLED = 'cancelled', 'Cancelled'
    COMPLETED = 'completed', 'Completed'


class Booking(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookings')
    room = models.ForeignKey('rooms.Room', on_delete=models.PROTECT, related_name='bookings')
    check_in = models.DateField()
    check_out = models.DateField()
    guests = models.PositiveIntegerField(default=1)
    slots = models.JSONField(default=list)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=BookingStatus.choices, default=BookingStatus.PENDING)
    reference_code = models.CharField(max_length=20, unique=True, blank=True)

    special_requests = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.reference_code:
            year = self.created_at.year if self.created_at else 2026
            self.reference_code = f'ABR-{year}-{self.pk:04d}'
            Booking.objects.filter(pk=self.pk).update(reference_code=self.reference_code)

    def __str__(self):
        return f'{self.reference_code or f"Booking #{self.id}"} - {self.user.username} - {self.room.name}'

    @property
    def slots_summary(self):
        overnight_count = sum(1 for s in self.slots if s.get('slot') == 'overnight')
        if overnight_count:
            return f'{overnight_count} night{"s" if overnight_count != 1 else ""}'
        twenty_four_hr_count = sum(1 for s in self.slots if s.get('slot') == '24hr')
        if twenty_four_hr_count:
            return f'{twenty_four_hr_count} day{"s" if twenty_four_hr_count != 1 else ""} (24hr)'
        day_count = sum(1 for s in self.slots if s.get('slot') == 'day')
        night_count = sum(1 for s in self.slots if s.get('slot') == 'night')
        parts = []
        if day_count:
            parts.append(f'{day_count} day')
        if night_count:
            parts.append(f'{night_count} night')
        return ' + '.join(parts) or 'No slots'
