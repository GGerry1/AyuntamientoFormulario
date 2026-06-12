from django.conf import settings


def public_site(request):
    return {
        'site_base_url': settings.SITE_BASE_URL.rstrip('/'),
    }
