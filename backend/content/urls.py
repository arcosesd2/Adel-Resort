from django.urls import path
from .views import NewsListView, EventListView, PromotionListView, PricingListView
from . import views

urlpatterns = [
    # Public endpoints
    path('news/', NewsListView.as_view(), name='news-list'),
    path('events/', EventListView.as_view(), name='event-list'),
    path('promotions/', PromotionListView.as_view(), name='promotion-list'),
    path('pricing/', PricingListView.as_view(), name='pricing-list'),
    path('settings/', views.site_settings, name='site-settings'),
    path('settings/update/', views.site_settings_update, name='site-settings-update'),
    path('hero/', views.hero_config, name='hero-config'),
    path('hero/update/', views.hero_config_update, name='hero-config-update'),

    # Admin CRUD — News
    path('admin/news/', views.admin_news_list, name='admin-news-list'),
    path('admin/news/create/', views.admin_news_create, name='admin-news-create'),
    path('admin/news/<int:pk>/', views.admin_news_detail, name='admin-news-detail'),

    # Admin CRUD — Events
    path('admin/events/', views.admin_events_list, name='admin-events-list'),
    path('admin/events/create/', views.admin_events_create, name='admin-events-create'),
    path('admin/events/<int:pk>/', views.admin_events_detail, name='admin-events-detail'),

    # Admin CRUD — Promotions
    path('admin/promotions/', views.admin_promotions_list, name='admin-promotions-list'),
    path('admin/promotions/create/', views.admin_promotions_create, name='admin-promotions-create'),
    path('admin/promotions/<int:pk>/', views.admin_promotions_detail, name='admin-promotions-detail'),

    # Admin CRUD — Pricing
    path('admin/pricing/', views.admin_pricing_list, name='admin-pricing-list'),
    path('admin/pricing/create/', views.admin_pricing_create, name='admin-pricing-create'),
    path('admin/pricing/<int:pk>/', views.admin_pricing_detail, name='admin-pricing-detail'),
]
