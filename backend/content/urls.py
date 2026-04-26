from django.urls import path
from .views import (
    NewsListView, EventListView, PromotionListView, PricingListView,
    NewsDetailView, EventDetailView,
)
from . import views

urlpatterns = [
    # Public endpoints
    path('news/', NewsListView.as_view(), name='news-list'),
    path('news/<int:pk>/', NewsDetailView.as_view(), name='news-detail'),
    path('events/', EventListView.as_view(), name='event-list'),
    path('events/<int:pk>/', EventDetailView.as_view(), name='event-detail'),
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

    # Newsletter (public)
    path('newsletter/subscribe/', views.newsletter_subscribe, name='newsletter-subscribe'),
    path('newsletter/confirm/', views.newsletter_confirm, name='newsletter-confirm'),
    path('newsletter/unsubscribe/', views.newsletter_unsubscribe, name='newsletter-unsubscribe'),

    # Admin newsletter + broadcast
    path('admin/subscribers/', views.admin_subscribers_list, name='admin-subscribers-list'),
    path('admin/subscribers/<int:pk>/', views.admin_subscriber_delete, name='admin-subscriber-delete'),
    path('admin/events/<int:pk>/broadcast/', views.admin_event_broadcast, name='admin-event-broadcast'),
    path('admin/promotions/<int:pk>/broadcast/', views.admin_promotion_broadcast, name='admin-promotion-broadcast'),
]
