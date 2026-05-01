from django.urls import path
from . import views

urlpatterns = [
    path('track/', views.track_page_view, name='track-page-view'),
    path('stats/', views.public_stats, name='public-stats'),
    path('dashboard/', views.admin_dashboard, name='admin-dashboard'),
    path('revenue-insights/', views.revenue_insights, name='revenue-insights'),
    path('export/bookings/', views.export_bookings_csv, name='export-bookings-csv'),
    path('export/revenue/', views.export_revenue_csv, name='export-revenue-csv'),
    path('export/breakdowns/', views.export_breakdowns_csv, name='export-breakdowns-csv'),
    path('export/vouchers/', views.export_vouchers_csv, name='export-vouchers-csv'),
    path('export/cancellations/', views.export_cancellations_csv, name='export-cancellations-csv'),
    path('export/top-guests/', views.export_top_guests_csv, name='export-top-guests-csv'),
]
