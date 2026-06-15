"""Courses Serializers - Updated"""
import re
from django.utils import timezone
from rest_framework import serializers
from .models import Course, CourseFormField, FieldOption, CourseRegistration, RegistrationAnswer

# Allowed email domains
ALLOWED_EMAIL_DOMAINS = {
    'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com',
    'icloud.com', 'live.com', 'hotmail.es', 'yahoo.es',
    'gob.mx', 'gobierno.mx',
}


def validate_email_domain(email):
    """Returns error string or None if valid."""
    if not email:
        return None
    parts = str(email).lower().split('@')
    if len(parts) != 2:
        return "Correo no valido."
    domain = parts[1]
    # Accept any subdomain of gob.mx (e.g. imss.gob.mx, sep.gob.mx)
    if domain.endswith('.gob.mx') or domain.endswith('.gobierno.mx'):
        return None
    if domain not in ALLOWED_EMAIL_DOMAINS:
        return ("Correo no valido. Usa un correo institucional (@gob.mx) "
                "o personal reconocido (Gmail, Hotmail, Outlook, Yahoo).")
    return None


# ─────────────────────────────────────────────
# FIELD OPTIONS
# ─────────────────────────────────────────────

class FieldOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FieldOption
        fields = ['id', 'valor', 'etiqueta', 'orden']


# ─────────────────────────────────────────────
# FORM FIELDS
# ─────────────────────────────────────────────

class CourseFormFieldSerializer(serializers.ModelSerializer):
    options = FieldOptionSerializer(many=True, read_only=True)

    class Meta:
        model = CourseFormField
        fields = [
            'id', 'label', 'tipo', 'obligatorio', 'orden',
            'activo', 'placeholder', 'ayuda', 'options',
            'es_campo_base', 'campo_clave', 'validacion',
        ]


class CourseFormFieldWriteSerializer(serializers.ModelSerializer):
    options = FieldOptionSerializer(many=True, required=False)

    class Meta:
        model = CourseFormField
        fields = [
            'label', 'tipo', 'obligatorio', 'orden',
            'activo', 'placeholder', 'ayuda', 'options',
            'es_campo_base', 'campo_clave', 'validacion',
        ]

    def validate(self, data):
        # Cannot change tipo of a base field
        instance = getattr(self, 'instance', None)
        if instance and instance.es_campo_base:
            data.pop('tipo', None)
        return data

    def create(self, validated_data):
        options_data = validated_data.pop('options', [])
        field = CourseFormField.objects.create(**validated_data)
        for i, opt in enumerate(options_data):
            opt['orden'] = opt.get('orden', i)
            FieldOption.objects.create(field=field, **opt)
        return field

    def update(self, instance, validated_data):
        options_data = validated_data.pop('options', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if options_data is not None:
            instance.options.all().delete()
            for i, opt in enumerate(options_data):
                opt['orden'] = opt.get('orden', i)
                FieldOption.objects.create(field=instance, **opt)
        return instance


# ─────────────────────────────────────────────
# COURSE (PLANTILLA)
# ─────────────────────────────────────────────

class CourseSerializer(serializers.ModelSerializer):
    form_fields = CourseFormFieldSerializer(many=True, read_only=True)
    total_inscritos = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
    'id',
    'titulo',
    'descripcion',
    'instructores',
    'fecha_inicio',
    'fecha_fin',
    'activo',
    'fecha_creacion',
    'form_fields',
    'total_inscritos',
]
        read_only_fields = ['id', 'fecha_creacion']

    def get_total_inscritos(self, obj):
        return obj.registrations.count()


class CourseWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ['titulo', 'descripcion', 'instructores', 'fecha_inicio', 'fecha_fin']


class CourseActivateSerializer(serializers.Serializer):
    activo = serializers.BooleanField()


# ─────────────────────────────────────────────
# PUBLIC FORM
# ─────────────────────────────────────────────

class PublicFormSerializer(serializers.ModelSerializer):
    form_fields_data = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'titulo', 'descripcion', 'instructores', 'form_fields_data']

    def get_form_fields_data(self, obj):
        active_fields = obj.form_fields.filter(activo=True).order_by('orden')
        return CourseFormFieldSerializer(active_fields, many=True).data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['fields'] = data.pop('form_fields_data')
        return data


# ─────────────────────────────────────────────
# REGISTRATION SUBMIT
# ─────────────────────────────────────────────

class AnswerSubmitSerializer(serializers.Serializer):
    field_id = serializers.UUIDField()
    value = serializers.JSONField()


class RegistrationSubmitSerializer(serializers.Serializer):
    answers = AnswerSubmitSerializer(many=True)

    def get_identity(self, course):
        fields = {
            str(field.id): field
            for field in course.form_fields.filter(activo=True)
        }
        identity = {'email': '', 'course_name': course.titulo, 'employee_number': ''}
        for answer in self.validated_data['answers']:
            field = fields.get(str(answer['field_id']))
            if not field:
                continue
            value = str(answer['value']).strip()
            if field.tipo == 'email':
                identity['email'] = value.lower()
            if field.campo_clave == 'nombre_curso':
                identity['course_name'] = value
            if field.campo_clave == 'numero_empleado':
                identity['employee_number'] = value
        return identity

    def validate(self, data):
        course = self.context.get('course')
        if not course or not course.activo:
            raise serializers.ValidationError("Este curso no esta disponible.")

        answers_map = {str(a['field_id']): a['value'] for a in data['answers']}
        required_fields = course.form_fields.filter(activo=True, obligatorio=True)

        for field in required_fields:
            value = answers_map.get(str(field.id))
            if value is None or value == '' or value == []:
                raise serializers.ValidationError(
                    f"El campo '{field.label}' es obligatorio."
                )

        all_fields = {str(f.id): f for f in course.form_fields.filter(activo=True)}
        for answer in data['answers']:
            field = all_fields.get(str(answer['field_id']))
            if field:
                self._validate_field(field, answer['value'])

        return data

    def _validate_field(self, field, value):
        if not value and value != 0:
            return

        if field.tipo == 'email':
            if not re.match(r'^[^@]+@[^@]+\.[^@]+$', str(value)):
                raise serializers.ValidationError(
                    f"El campo '{field.label}' debe ser un correo valido."
                )
            err = validate_email_domain(str(value))
            if err:
                raise serializers.ValidationError(err)

        elif field.tipo == 'number':
            val_str = str(value).strip()
            if not val_str.isdigit():
                raise serializers.ValidationError(
                    f"El campo '{field.label}' debe ser un numero."
                )
            if field.validacion and 'exact_digits' in field.validacion:
                exact_d = field.validacion['exact_digits']
                if len(val_str) != exact_d:
                    raise serializers.ValidationError(
                        f"El campo '{field.label}' debe contener exactamente "
                        f"{exact_d} digitos."
                    )
            # Validate max_digits from validacion config
            if field.validacion and 'max_digits' in field.validacion:
                max_d = field.validacion['max_digits']
                if len(val_str) > max_d:
                    raise serializers.ValidationError(
                        f"El campo '{field.label}' permite maximo {max_d} digitos."
                    )

        elif field.tipo == 'checkbox':
            if not isinstance(value, list):
                raise serializers.ValidationError(
                    f"El campo '{field.label}' debe ser una lista."
                )
            valid_options = set(field.options.values_list('valor', flat=True))
            if any(str(item) not in valid_options for item in value):
                raise serializers.ValidationError(
                    f"El campo '{field.label}' contiene una opcion no disponible."
                )

        elif field.tipo in ('select', 'radio'):
            valid_options = set(field.options.values_list('valor', flat=True))
            if str(value) not in valid_options:
                raise serializers.ValidationError(
                    f"La opcion seleccionada en '{field.label}' ya no esta disponible."
                )

    def create_registration(self, course, request):
        answers_data = self.validated_data['answers']
        fields_map = {str(f.id): f for f in course.form_fields.filter(activo=True)}

        identity = self.get_identity(course)
        email = identity['email']
        nombre = ''
        nombre_curso = identity['course_name']

        for answer in answers_data:
            field = fields_map.get(str(answer['field_id']))
            if not field:
                continue
            if field.campo_clave == 'nombre':
                nombre = str(answer['value'])

        ip = (request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
              or request.META.get('REMOTE_ADDR'))

        registration = CourseRegistration.objects.create(
            administrador=course.administrador,
            course=course,
            email_participante=email,
            nombre_participante=nombre,
            nombre_curso_snapshot=nombre_curso or course.titulo,
            ip_address=ip or None,
        )

        for answer in answers_data:
            field = fields_map.get(str(answer['field_id']))
            if not field:
                continue
            value = answer['value']
            RegistrationAnswer.objects.create(
                registration=registration,
                field=field,
                campo_label_snapshot=field.label,
                campo_clave_snapshot=field.campo_clave,
                valor_multiple=value if isinstance(value, list) else None,
                valor_texto='' if isinstance(value, list) else str(value) if value is not None else '',
            )

        return registration


# ─────────────────────────────────────────────
# REGISTRATION DETAIL
# ─────────────────────────────────────────────

class RegistrationAnswerSerializer(serializers.ModelSerializer):
    field_id = serializers.SerializerMethodField()
    field_label = serializers.SerializerMethodField()
    field_tipo = serializers.SerializerMethodField()
    campo_clave = serializers.SerializerMethodField()
    obligatorio = serializers.SerializerMethodField()
    options = serializers.SerializerMethodField()
    validacion = serializers.SerializerMethodField()
    value = serializers.ReadOnlyField()

    class Meta:
        model = RegistrationAnswer
        fields = [
            'id', 'field_id', 'field_label', 'field_tipo', 'campo_clave',
            'obligatorio', 'options', 'validacion', 'value',
        ]

    def get_field_id(self, obj):
        return str(obj.field_id) if obj.field_id else None

    def get_field_label(self, obj):
        return obj.campo_label_snapshot or (obj.field.label if obj.field else '')

    def get_field_tipo(self, obj):
        return obj.field.tipo if obj.field else ''

    def get_campo_clave(self, obj):
        return obj.campo_clave_snapshot or (obj.field.campo_clave if obj.field else '')

    def get_obligatorio(self, obj):
        return obj.field.obligatorio if obj.field else False

    def get_options(self, obj):
        if not obj.field:
            return []
        return FieldOptionSerializer(obj.field.options.all(), many=True).data

    def get_validacion(self, obj):
        return obj.field.validacion if obj.field else None


class RegistrationAnswerUpdateSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    value = serializers.JSONField()


class RegistrationAdminUpdateSerializer(serializers.Serializer):
    answers = RegistrationAnswerUpdateSerializer(many=True, required=False)
    completado = serializers.BooleanField(required=False)

    def validate_answers(self, answers):
        registration = self.context['registration']
        answer_map = {
            str(answer.id): answer
            for answer in registration.answers.select_related('field').prefetch_related(
                'field__options'
            )
        }
        submitted_ids = [str(item['id']) for item in answers]

        if len(submitted_ids) != len(set(submitted_ids)):
            raise serializers.ValidationError('No se puede editar una respuesta dos veces.')

        validator = RegistrationSubmitSerializer()
        for item in answers:
            answer = answer_map.get(str(item['id']))
            if not answer:
                raise serializers.ValidationError(
                    'Una de las respuestas no pertenece a esta inscripcion.'
                )
            if answer.field:
                value = item['value']
                if answer.field.obligatorio and value in (None, '', []):
                    raise serializers.ValidationError(
                        f"El campo '{answer.field.label}' es obligatorio."
                    )
                validator._validate_field(answer.field, value)

        return answers

    def update(self, registration, validated_data):
        answer_map = {
            str(answer.id): answer
            for answer in registration.answers.select_related('field')
        }

        for item in validated_data.get('answers', []):
            answer = answer_map[str(item['id'])]
            value = item['value']
            answer.valor_multiple = value if isinstance(value, list) else None
            answer.valor_texto = (
                '' if isinstance(value, list)
                else str(value) if value is not None else ''
            )
            answer.save(update_fields=['valor_multiple', 'valor_texto'])

            key = answer.campo_clave_snapshot or (
                answer.field.campo_clave if answer.field else ''
            )
            if key == 'nombre':
                registration.nombre_participante = answer.valor_texto
            elif key == 'correo':
                registration.email_participante = answer.valor_texto
            elif key == 'nombre_curso':
                registration.nombre_curso_snapshot = answer.valor_texto

        if 'completado' in validated_data:
            registration.completado = validated_data['completado']
            registration.fecha_completado = (
                registration.fecha_completado or timezone.now()
                if registration.completado else None
            )

        registration.save()
        return registration


class RegistrationSerializer(serializers.ModelSerializer):
    answers = RegistrationAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = CourseRegistration
        fields = [
            'id', 'email_participante', 'nombre_participante',
            'nombre_curso_snapshot', 'fecha_inscripcion',
            'completado', 'fecha_completado', 'diploma_enviado', 'answers',
        ]
        read_only_fields = ['id', 'fecha_inscripcion']


class RegistrationListSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseRegistration
        fields = [
            'id', 'email_participante', 'nombre_participante',
            'nombre_curso_snapshot', 'fecha_inscripcion',
            'completado', 'diploma_enviado',
        ]


class MarkCompletedSerializer(serializers.Serializer):
    completado = serializers.BooleanField()
