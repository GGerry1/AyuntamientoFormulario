"""URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from apps.accounts.views import OAuthSuccessView

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('accounts/', include('allauth.urls')),
    path('accounts/oauth-success/', OAuthSuccessView.as_view(), name='oauth-success'),  # ← AGREGA
    path('api/v1/', include([
        path('auth/', include('apps.accounts.urls')),
        path('courses/', include('apps.courses.urls')),
        path('diplomas/', include('apps.diplomas.urls')),
    ])),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
