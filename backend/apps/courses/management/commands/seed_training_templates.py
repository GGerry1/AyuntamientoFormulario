"""Create the standard institutional training templates."""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import Administrator
from apps.courses.models import Course, FieldOption
from apps.courses.views import create_default_fields


TRAINING_TEMPLATES = [
    {
        'titulo': 'Gestion Administrativa',
        'descripcion': 'Capacitacion para fortalecer los procesos administrativos y la atencion institucional.',
        'instructores': 'Equipo de Capacitacion',
        'courses': [
            'Atencion Ciudadana',
            'Excel para la Gestion Publica',
            'Archivo y Transparencia',
        ],
    },
    {
        'titulo': 'Seguridad y Proteccion Civil',
        'descripcion': 'Formacion preventiva para la seguridad del personal y la atencion de emergencias.',
        'instructores': 'Equipo de Proteccion Civil',
        'courses': [
            'Proteccion Civil',
            'Primeros Auxilios',
            'Seguridad Laboral',
        ],
    },
    {
        'titulo': 'Transformacion Digital',
        'descripcion': 'Desarrollo de competencias digitales para el servicio publico.',
        'instructores': 'Equipo de Innovacion',
        'courses': [
            'Ciberseguridad',
            'Herramientas Colaborativas',
            'Gestion de Datos',
        ],
    },
    {
        'titulo': 'Desarrollo Humano',
        'descripcion': 'Fortalecimiento de habilidades personales y de colaboracion en el entorno laboral.',
        'instructores': 'Equipo de Desarrollo Organizacional',
        'courses': [
            'Liderazgo',
            'Comunicacion Efectiva',
            'Trabajo en Equipo',
        ],
    },
    {
        'titulo': 'Etica y Servicio Publico',
        'descripcion': 'Formacion para promover una administracion publica integra, incluyente y responsable.',
        'instructores': 'Equipo de Formacion Institucional',
        'courses': [
            'Etica e Integridad',
            'Derechos Humanos',
            'Igualdad y No Discriminacion',
        ],
    },
]

class Command(BaseCommand):
    help = 'Crea 5 plantillas institucionales con 3 opciones de curso en cada una.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--admin-email',
            help='Correo del administrador propietario de las plantillas.',
        )
        parser.add_argument(
            '--admin-name',
            help='Nombre del administrador propietario de las plantillas.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        admin = self._get_admin(
            email=options.get('admin_email'),
            name=options.get('admin_name'),
        )
        created_templates = 0

        for template_data in TRAINING_TEMPLATES:
            template, created = Course.objects.get_or_create(
                administrador=admin,
                titulo=template_data['titulo'],
                defaults={
                    'descripcion': template_data['descripcion'],
                    'instructores': template_data['instructores'],
                    'activo': False,
                },
            )
            if created:
                create_default_fields(template)
                created_templates += 1

            self._add_course_options(template, template_data['courses'])

        self.stdout.write(self.style.SUCCESS(
            f'Plantillas listas para {admin.email}: '
            f'{created_templates} plantillas nuevas, sin inscripciones.'
        ))

    def _get_admin(self, email=None, name=None):
        admins = Administrator.objects.filter(activo=True).order_by('fecha_creacion')
        if email:
            try:
                return admins.get(email__iexact=email)
            except Administrator.DoesNotExist as exc:
                raise CommandError(
                    f'No existe un administrador activo con correo {email}.'
                ) from exc
        if name:
            matches = admins.filter(nombre__iexact=name)
            if matches.count() == 1:
                return matches.first()
            if not matches.exists():
                raise CommandError(
                    f'No existe un administrador activo con nombre {name}.'
                )
            raise CommandError(
                f'Hay varios administradores activos con nombre {name}. '
                'Usa --admin-email.'
            )

        count = admins.count()
        if count == 1:
            return admins.first()
        if count == 0:
            raise CommandError('No existe ningun administrador activo.')
        raise CommandError(
            'Hay varios administradores. Usa --admin-email o --admin-name.'
        )

    def _add_course_options(self, template, course_names):
        field = template.form_fields.filter(campo_clave='nombre_curso').first()
        if not field:
            return
        for index, course_name in enumerate(course_names):
            FieldOption.objects.get_or_create(
                field=field,
                valor=course_name,
                defaults={'etiqueta': course_name, 'orden': index},
            )
