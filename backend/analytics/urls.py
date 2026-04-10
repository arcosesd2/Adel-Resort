from django.urls import path
from . import views

urlpatterns = [
    path('track/', views.track_page_view, name='track-page-view'),
    path('stats/', views.public_stats, name='public-stats'),
    path('dashboard/', views.admin_dashboard, name='admin-dashboard'),
    path('export/bookings/', views.export_bookings_csv, name='export-bookings-csv'),
    path('export/revenue/', views.export_revenue_csv, name='export-revenue-csv'),
    path('debug-reset/', views.debug_reset, name='debug-reset'),
    path('backups/', views.backup_list, name='backup-list'),
    path('backups/create/', views.backup_create, name='backup-create'),
    path('backups/download/', views.backup_download, name='backup-download'),
    path('backups/restore/', views.backup_restore, name='backup-restore'),
]
