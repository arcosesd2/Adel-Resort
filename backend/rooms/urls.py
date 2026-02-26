from django.urls import path
from . import views

urlpatterns = [
    path('', views.RoomListView.as_view(), name='room-list'),
    path('all-availability/', views.all_rooms_availability, name='all-availability'),
    path('<int:pk>/', views.RoomDetailView.as_view(), name='room-detail'),
    path('<int:pk>/availability/', views.room_availability, name='room-availability'),
]
