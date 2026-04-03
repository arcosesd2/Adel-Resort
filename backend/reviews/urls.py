from django.urls import path
from . import views

urlpatterns = [
    path('room/<int:room_id>/', views.room_reviews, name='room-reviews'),
    path('create/', views.create_review, name='create-review'),
    path('mine/', views.my_reviews, name='my-reviews'),
    path('admin/', views.admin_reviews, name='admin-reviews'),
    path('<int:pk>/toggle-approval/', views.toggle_approval, name='toggle-approval'),
]
