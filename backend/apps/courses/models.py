"""
Courses Models - Updated
- Course (plantilla): max 10 per admin, only one active at a time
- CourseFormField: dynamic fields with es_campo_base flag (not deletable)
- FieldOption: options for select/radio/checkbox
- CourseRegistration: participant inscription (preserved on course delete)
- RegistrationAnswer: individual field answers
"""
import uuid
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


class Course(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    administrador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='courses'
    )
    titulo = models.CharField(max_length=300, verbose_name='Titulo de la plantilla')
    descripcion = models.TextField(blank=True)
    instructores = models.CharField(max_length=500, blank=True)
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_fin = models.DateField(null=True, blank=True)
    # Only one course per admin can be activo=True at a time
    activo = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Plantilla'
        verbose_name_plural = 'Plantillas'
        db_table = 'courses'
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f"{self.titulo} ({self.administrador.email})"

    def activate(self):
        """Activate this course and deactivate all others for this admin."""
        Course.objects.filter(administrador=self.administrador).update(activo=False)
        self.activo = True
        self.save(update_fields=['activo'])

    def deactivate(self):
        self.activo = False
        self.save(update_fields=['activo'])


class CourseFormField(models.Model):
    """
    Dynamic form field.
    es_campo_base=True: cannot be deleted, only edited.
    campo_clave: internal key used for statistics matching.
    """

    class FieldType(models.TextChoices):
        SHORT_TEXT = 'short_text', 'Texto corto'
        LONG_TEXT = 'long_text', 'Texto largo'
        EMAIL = 'email', 'Correo electronico'
        NUMBER = 'number', 'Numero'
        SELECT = 'select', 'Menu desplegable'
        RADIO = 'radio', 'Opcion unica'
        CHECKBOX = 'checkbox', 'Seleccion multiple'
        DATE = 'date', 'Fecha'
        TIME = 'time', 'Hora'
        DATETIME = 'datetime', 'Fecha y hora'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='form_fields')
    label = models.CharField(max_length=300)
    tipo = models.CharField(max_length=20, choices=FieldType.choices)
    obligatorio = models.BooleanField(default=True)
    orden = models.PositiveIntegerField(default=0)
    activo = models.BooleanField(default=True)
    placeholder = models.CharField(max_length=200, blank=True)
    ayuda = models.CharField(max_length=300, blank=True)
    # Base fields cannot be deleted, only edited
    es_campo_base = models.BooleanField(default=False)
    # Internal key for statistics (e.g. 'nombre_curso', 'sexo', 'edad')
    campo_clave = models.CharField(max_length=50, blank=True)
    # Validation config: {"max_digits": 2} or {"max_digits": 10}
    validacion = models.JSONField(null=True, blank=True)

    class Meta:
        verbose_name = 'Campo del formulario'
        verbose_name_plural = 'Campos del formulario'
        db_table = 'course_form_fields'
        ordering = ['orden']

    def __str__(self):
        return f"{self.label} ({self.get_tipo_display()})"


class FieldOption(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    field = models.ForeignKey(
        CourseFormField, on_delete=models.CASCADE, related_name='options'
    )
    valor = models.CharField(max_length=200)
    etiqueta = models.CharField(max_length=200)
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'field_options'
        ordering = ['orden']

    def __str__(self):
        return self.etiqueta


class CourseRegistration(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    administrador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='course_registrations'
    )
    # SET_NULL so registrations survive course deletion
    course = models.ForeignKey(
        Course,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='registrations'
    )
    email_participante = models.EmailField()
    nombre_participante = models.CharField(max_length=200, blank=True)
    # Snapshot: preserves course name even after course is deleted
    nombre_curso_snapshot = models.CharField(max_length=300, blank=True)
    curso_archivado = models.BooleanField(default=False)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    fecha_inscripcion = models.DateTimeField(auto_now_add=True)
    completado = models.BooleanField(default=False)
    fecha_completado = models.DateTimeField(null=True, blank=True)
    diploma_enviado = models.BooleanField(default=False)
    fecha_diploma = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'course_registrations'
        ordering = ['-fecha_inscripcion']

    def __str__(self):
        return f"{self.email_participante} -> {self.nombre_curso_snapshot}"


class RegistrationAnswer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    registration = models.ForeignKey(
        CourseRegistration, on_delete=models.CASCADE, related_name='answers'
    )
    field = models.ForeignKey(CourseFormField, on_delete=models.SET_NULL, null=True)
    # Snapshots preserve data even if field is deleted later
    campo_label_snapshot = models.CharField(max_length=300, blank=True)
    campo_clave_snapshot = models.CharField(max_length=50, blank=True)
    valor_texto = models.TextField(blank=True)
    valor_multiple = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'registration_answers'

    @property
    def value(self):
        if self.valor_multiple is not None:
            return self.valor_multiple
        return self.valor_texto
