from django.db import migrations


ADMIN_EMAIL = 'jsc.designx@gmail.com'

TEMPLATES = [
    {
        'titulo': 'Gestion Administrativa',
        'descripcion': (
            'Capacitacion para fortalecer los procesos administrativos '
            'y la atencion institucional.'
        ),
        'instructores': 'Equipo de Capacitacion',
        'courses': [
            'Atencion Ciudadana',
            'Excel para la Gestion Publica',
            'Archivo y Transparencia',
        ],
    },
    {
        'titulo': 'Seguridad y Proteccion Civil',
        'descripcion': (
            'Formacion preventiva para la seguridad del personal '
            'y la atencion de emergencias.'
        ),
        'instructores': 'Equipo de Proteccion Civil',
        'courses': [
            'Proteccion Civil',
            'Primeros Auxilios',
            'Seguridad Laboral',
        ],
    },
    {
        'titulo': 'Transformacion Digital',
        'descripcion': (
            'Desarrollo de competencias digitales para el servicio publico.'
        ),
        'instructores': 'Equipo de Innovacion',
        'courses': [
            'Ciberseguridad',
            'Herramientas Colaborativas',
            'Gestion de Datos',
        ],
    },
    {
        'titulo': 'Desarrollo Humano',
        'descripcion': (
            'Fortalecimiento de habilidades personales y de colaboracion '
            'en el entorno laboral.'
        ),
        'instructores': 'Equipo de Desarrollo Organizacional',
        'courses': [
            'Liderazgo',
            'Comunicacion Efectiva',
            'Trabajo en Equipo',
        ],
    },
    {
        'titulo': 'Etica y Servicio Publico',
        'descripcion': (
            'Formacion para promover una administracion publica integra, '
            'incluyente y responsable.'
        ),
        'instructores': 'Equipo de Formacion Institucional',
        'courses': [
            'Etica e Integridad',
            'Derechos Humanos',
            'Igualdad y No Discriminacion',
        ],
    },
]

BASE_FIELDS = [
    {
        'label': 'Nombre del Curso',
        'tipo': 'select',
        'obligatorio': True,
        'orden': 1,
        'campo_clave': 'nombre_curso',
        'validacion': None,
        'options': [],
    },
    {
        'label': 'Nombre',
        'tipo': 'short_text',
        'obligatorio': True,
        'orden': 3,
        'campo_clave': 'nombre',
        'validacion': None,
        'options': [],
    },
    {
        'label': 'Correo Electronico',
        'tipo': 'email',
        'obligatorio': True,
        'orden': 4,
        'campo_clave': 'correo',
        'validacion': None,
        'options': [],
    },
    {
        'label': 'Sexo',
        'tipo': 'select',
        'obligatorio': True,
        'orden': 5,
        'campo_clave': 'sexo',
        'validacion': None,
        'options': [
            ('Hombre', 'Hombre', 0),
            ('Mujer', 'Mujer', 1),
        ],
    },
    {
        'label': 'Edad',
        'tipo': 'number',
        'obligatorio': True,
        'orden': 6,
        'campo_clave': 'edad',
        'validacion': {'max_digits': 2},
        'options': [],
    },
    {
        'label': 'Numero de Telefono',
        'tipo': 'number',
        'obligatorio': True,
        'orden': 7,
        'campo_clave': 'telefono',
        'validacion': {'exact_digits': 10, 'max_digits': 10},
        'options': [],
    },
    {
        'label': 'Numero de Empleado',
        'tipo': 'number',
        'obligatorio': True,
        'orden': 8,
        'campo_clave': 'numero_empleado',
        'validacion': {'exact_digits': 10, 'max_digits': 10},
        'options': [],
    },
    {
        'label': 'Puesto Actual',
        'tipo': 'radio',
        'obligatorio': True,
        'orden': 9,
        'campo_clave': 'puesto',
        'validacion': None,
        'options': [
            ('Administrativo', 'Administrativo', 0),
            ('Operativo', 'Operativo', 1),
            ('Funcionario', 'Funcionario', 2),
        ],
    },
    {
        'label': 'Tipo de Empleado',
        'tipo': 'select',
        'obligatorio': True,
        'orden': 10,
        'campo_clave': 'tipo_empleado',
        'validacion': None,
        'options': [
            ('Sindicalizado', 'Sindicalizado', 0),
            ('Supernumerario', 'Supernumerario', 1),
            ('Eventual', 'Eventual', 2),
            ('Confianza', 'Confianza', 3),
        ],
    },
    {
        'label': 'Nivel de Estudios',
        'tipo': 'select',
        'obligatorio': True,
        'orden': 11,
        'campo_clave': 'nivel_estudios',
        'validacion': None,
        'options': [
            ('Primaria', 'Primaria', 0),
            ('Secundaria', 'Secundaria', 1),
            ('Preparatoria', 'Preparatoria', 2),
            ('Licenciatura', 'Licenciatura', 3),
            ('Ingenieria', 'Ingenieria', 4),
            ('Maestria', 'Maestria', 5),
            ('Doctorado', 'Doctorado', 6),
        ],
    },
    {
        'label': 'Antiguedad Laboral (anos)',
        'tipo': 'number',
        'obligatorio': True,
        'orden': 12,
        'campo_clave': 'antiguedad',
        'validacion': {'max_digits': 2},
        'options': [],
    },
]


def create_templates(apps, schema_editor):
    Administrator = apps.get_model('accounts', 'Administrator')
    Course = apps.get_model('courses', 'Course')
    CourseFormField = apps.get_model('courses', 'CourseFormField')
    FieldOption = apps.get_model('courses', 'FieldOption')

    admin = Administrator.objects.filter(
        email__iexact=ADMIN_EMAIL,
        activo=True,
    ).first()
    if not admin:
        return

    for template_data in TEMPLATES:
        course, created = Course.objects.get_or_create(
            administrador=admin,
            titulo=template_data['titulo'],
            defaults={
                'descripcion': template_data['descripcion'],
                'instructores': template_data['instructores'],
                'activo': False,
            },
        )

        if created:
            for field_data in BASE_FIELDS:
                field = CourseFormField.objects.create(
                    course=course,
                    label=field_data['label'],
                    tipo=field_data['tipo'],
                    obligatorio=field_data['obligatorio'],
                    orden=field_data['orden'],
                    activo=True,
                    es_campo_base=True,
                    campo_clave=field_data['campo_clave'],
                    validacion=field_data['validacion'],
                )
                for value, label, order in field_data['options']:
                    FieldOption.objects.create(
                        field=field,
                        valor=value,
                        etiqueta=label,
                        orden=order,
                    )

        course_name_field = CourseFormField.objects.filter(
            course=course,
            campo_clave='nombre_curso',
        ).first()
        if not course_name_field:
            continue

        for order, course_name in enumerate(template_data['courses']):
            FieldOption.objects.get_or_create(
                field=course_name_field,
                valor=course_name,
                defaults={
                    'etiqueta': course_name,
                    'orden': order,
                },
            )


class Migration(migrations.Migration):
    dependencies = [
        ('courses', '0007_remove_other_course_and_require_ten_digits'),
    ]

    operations = [
        migrations.RunPython(
            create_templates,
            migrations.RunPython.noop,
        ),
    ]
