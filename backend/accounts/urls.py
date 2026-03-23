from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),
    path('refresh/', views.refresh_token, name='token-refresh'),
    path('me/', views.me, name='me'),

    # Superadmin: User management
    path('users/', views.user_list, name='user-list'),
    path('users/<int:pk>/', views.user_detail, name='user-detail'),

    # Superadmin: Login activity
    path('login-activity/', views.login_activity, name='login-activity'),

    # Superadmin: Device management
    path('devices/', views.device_list, name='device-list'),
    path('devices/from-attempt/', views.device_from_attempt, name='device-from-attempt'),
    path('devices/<int:pk>/', views.device_detail, name='device-detail'),
]
