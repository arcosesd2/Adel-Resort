from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),
    path('refresh/', views.refresh_token, name='token-refresh'),
    path('me/', views.me, name='me'),
    path('me/avatar/', views.upload_avatar, name='upload-avatar'),

    # Password
    path('change-password/', views.change_password, name='change-password'),
    path('forgot-password/', views.forgot_password, name='forgot-password'),
    path('reset-password/', views.reset_password, name='reset-password'),

    # Email verification
    path('send-verification-email/', views.send_verification_email_view, name='send-verification-email'),
    path('verify-email/', views.verify_email, name='verify-email'),

    # Account
    path('deactivate/', views.deactivate_account, name='deactivate-account'),

    # Favorites
    path('favorites/', views.favorite_list, name='favorite-list'),
    path('favorites/toggle/', views.toggle_favorite, name='toggle-favorite'),

    # Notifications
    path('notifications/', views.notification_list, name='notification-list'),
    path('notifications/unread-count/', views.notification_unread_count, name='notification-unread-count'),
    path('notifications/<int:pk>/read/', views.notification_read, name='notification-read'),
    path('notifications/read-all/', views.notification_read_all, name='notification-read-all'),
    path('notification-preferences/', views.notification_preferences, name='notification-preferences'),

    # Superadmin: User management
    path('users/', views.user_list, name='user-list'),
    path('users/<int:pk>/', views.user_detail, name='user-detail'),

    # Superadmin: Login activity & Activity log
    path('login-activity/', views.login_activity, name='login-activity'),
    path('activity-log/', views.activity_log, name='activity-log'),

    # Superadmin: Device management
    path('devices/', views.device_list, name='device-list'),
    path('devices/from-attempt/', views.device_from_attempt, name='device-from-attempt'),
    path('devices/<int:pk>/', views.device_detail, name='device-detail'),
]
