import django_filters
from .models import Room


class RoomFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name='price_per_night', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='price_per_night', lookup_expr='lte')
    min_capacity = django_filters.NumberFilter(field_name='capacity', lookup_expr='gte')

    class Meta:
        model = Room
        fields = ['room_type', 'min_price', 'max_price', 'min_capacity']
