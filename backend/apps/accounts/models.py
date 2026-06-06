"""
Accounts Models
- Administrator (custom user, no password)
- QR token auto-generated
"""
import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.conf import settings


class AdministratorManager(BaseUserManager):
    def create_user(self, email, **extra_fields):
        if not email:
            raise ValueError('El correo es obligatorio')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_unusable_password()  # No passwords stored
        user.save(using=self._db)
        return user

    def create_superuser(self, email, **extra_fields):
        """Only for initial setup via management command, not exposed."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, **extra_fields)


class Administrator(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model for administrators.
    Auth is exclusively via OAuth — no passwords stored.
    """

    class OAuthProvider(models.TextChoices):
        GOOGLE = 'google', 'Google'
        MICROSOFT = 'microsoft', 'Microsoft'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, verbose_name='Correo electrónico')
    nombre = models.CharField(max_length=200, blank=True, verbose_name='Nombre completo')
    proveedor_oauth = models.CharField(
        max_length=20,
        choices=OAuthProvider.choices,
        blank=True,
        verbose_name='Proveedor OAuth'
    )
    qr_token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        verbose_name='Token QR'
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)

    # Required for Django admin compatibility
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    EMAIL_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = AdministratorManager()

    class Meta:
        verbose_name = 'Administrador'
        verbose_name_plural = 'Administradores'
        db_table = 'administrators'

    def __str__(self):
        return self.email

    @property
    def username(self):
        return self.email

    @property
    def qr_url(self):
        base = getattr(settings, 'SITE_BASE_URL', 'https://tusitio.com')
        return f"{base}/inscripcion/{self.qr_token}"

    @property
    def display_name(self):
        return self.nombre or self.email.split('@')[0]
