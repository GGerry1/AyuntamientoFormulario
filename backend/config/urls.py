"""URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Django admin (optional, can be disabled in production)
    path('django-admin/', admin.site.urls),

    # OAuth / allauth
    path('accounts/', include('allauth.urls')),

    # API
    path('api/v1/', include([
        path('auth/', include('apps.accounts.urls')),
        path('courses/', include('apps.courses.urls')),
        path('diplomas/', include('apps.diplomas.urls')),
    ])),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
