from django.urls import path
from . import views

urlpatterns = [
    path('', views.BookingListCreateView.as_view(), name='booking-list-create'),
    path('onsite/', views.onsite_booking, name='onsite-booking'),
    path('<int:pk>/', views.BookingDetailView.as_view(), name='booking-detail'),
]
