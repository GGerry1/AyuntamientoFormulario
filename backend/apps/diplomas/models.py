"""Diplomas Models"""
import uuid
from django.db import models


def diploma_upload_path(instance, filename):
    ext = filename.split('.')[-1]
    return f"diplomas/{instance.registration.course.administrador.id}/{instance.registration.id}.{ext}"


class Diploma(models.Model):
    ALLOWED_TYPES = ['pdf', 'jpg', 'jpeg', 'png']

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    registration = models.OneToOneField(
        'courses.CourseRegistration',
        on_delete=models.CASCADE,
        related_name='diploma'
    )
    archivo = models.FileField(upload_to=diploma_upload_path)
    tipo_archivo = models.CharField(max_length=10)
    fecha_subida = models.DateTimeField(auto_now_add=True)
    enviado = models.BooleanField(default=False)
    fecha_envio = models.DateTimeField(null=True, blank=True)
    error_envio = models.TextField(blank=True)

    class Meta:
        db_table = 'diplomas'

    def __str__(self):
        return f"Diploma — {self.registration.email_participante}"
