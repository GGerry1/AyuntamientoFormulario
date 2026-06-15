"""Accounts URLs"""
from django.urls import path
from . import views
from .views import OAuthSuccessView

urlpatterns = [
    path('me/', views.MeView.as_view(), name='me'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('csrf/', views.CsrfTokenView.as_view(), name='csrf-token'),
    path('token/refresh/', views.CookieTokenRefreshView.as_view(), name='token-refresh'),
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
    path('oauth-success/', OAuthSuccessView.as_view(), name='oauth-success'),
]


