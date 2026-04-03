from django.urls import path
from .views import NewsListView, EventListView, PromotionListView, PricingListView
from . import views

urlpatterns = [
    path('news/', NewsListView.as_view(), name='news-list'),
    path('events/', EventListView.as_view(), name='event-list'),
    path('promotions/', PromotionListView.as_view(), name='promotion-list'),
    path('pricing/', PricingListView.as_view(), name='pricing-list'),
    path('settings/', views.site_settings, name='site-settings'),
    path('settings/update/', views.site_settings_update, name='site-settings-update'),
    path('hero/', views.hero_config, name='hero-config'),
    path('hero/update/', views.hero_config_update, name='hero-config-update'),
]
