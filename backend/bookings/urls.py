from django.urls import path
from . import views

urlpatterns = [
    path('', views.BookingListCreateView.as_view(), name='booking-list-create'),
    path('onsite/', views.onsite_booking, name='onsite-booking'),
    path('admin/', views.AdminBookingListView.as_view(), name='admin-booking-list'),
    path('admin/<int:pk>/', views.AdminBookingDetailView.as_view(), name='admin-booking-detail'),
    path('<int:pk>/', views.BookingDetailView.as_view(), name='booking-detail'),
]
