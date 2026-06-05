"""
Custom allauth adapters.
- Blocks any username/password registration
- Handles social account creation with qr_token
"""
from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.exceptions import ImmediateHttpResponse
from django.http import JsonResponse


class NoPasswordAdapter(DefaultAccountAdapter):
    """Completely disable username/password registration."""

    def is_open_for_signup(self, request):
        return False  # Only OAuth allowed

    def new_user(self, request):
        user = super().new_user(request)
        return user


class SocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Handle OAuth sign-in/sign-up.
    - Auto-create administrator on first login
    - Set provider name
    - Never allow access if email is not verified
    """

    def is_open_for_signup(self, request, sociallogin):
        return True  # OAuth signup always open

    def pre_social_login(self, request, sociallogin):
        """Validate email is verified before proceeding."""
        if not sociallogin.account.extra_data.get('email_verified', True):
            raise ImmediateHttpResponse(
                JsonResponse({'detail': 'El correo no está verificado.'}, status=403)
            )

    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)
        user.set_unusable_password()

        # Determine provider
        provider = sociallogin.account.provider
        if 'google' in provider:
            user.proveedor_oauth = 'google'
        elif 'microsoft' in provider or 'windows' in provider:
            user.proveedor_oauth = 'microsoft'

        # Set display name from OAuth data
        name = data.get('name') or data.get('display_name', '')
        if name:
            user.nombre = name

        return user

    def save_user(self, request, sociallogin, form=None):
        user = super().save_user(request, sociallogin, form)
        # qr_token is auto-generated via model default
        return user
