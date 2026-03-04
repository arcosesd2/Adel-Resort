from django.urls import path
from . import views

urlpatterns = [
    path('track/', views.track_page_view, name='track-page-view'),
    path('dashboard/', views.admin_dashboard, name='admin-dashboard'),
]
