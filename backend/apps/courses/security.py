import requests
from django.conf import settings


def verify_recaptcha(token, remote_ip=None):
    if not settings.RECAPTCHA_ENABLED:
        return True
    if not token or not settings.RECAPTCHA_SECRET_KEY:
        return False

    response = requests.post(
        'https://www.google.com/recaptcha/api/siteverify',
        data={
            'secret': settings.RECAPTCHA_SECRET_KEY,
            'response': token,
            'remoteip': remote_ip or '',
        },
        timeout=5,
    )
    response.raise_for_status()
    return bool(response.json().get('success'))
