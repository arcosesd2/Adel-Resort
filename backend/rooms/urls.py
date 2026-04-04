from django.urls import path
from . import views

urlpatterns = [
    path('', views.RoomListView.as_view(), name='room-list'),
    path('all-availability/', views.all_rooms_availability, name='all-availability'),
    path('<int:pk>/', views.RoomDetailView.as_view(), name='room-detail'),
    path('<int:pk>/availability/', views.room_availability, name='room-availability'),
    path('<int:pk>/images/', views.upload_room_images, name='room-images-upload'),
    path('<int:pk>/images/reorder/', views.reorder_room_images, name='room-images-reorder'),
    path('<int:pk>/images/<int:image_pk>/', views.room_image_detail, name='room-image-detail'),

    # Admin Room CRUD
    path('admin/', views.admin_room_list, name='admin-room-list'),
    path('admin/create/', views.admin_room_create, name='admin-room-create'),
    path('admin/<int:pk>/', views.admin_room_detail, name='admin-room-detail'),
]
