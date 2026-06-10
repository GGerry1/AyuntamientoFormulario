from django.db import migrations


def update_existing_form_fields(apps, schema_editor):
    CourseFormField = apps.get_model('courses', 'CourseFormField')
    FieldOption = apps.get_model('courses', 'FieldOption')

    course_name_fields = CourseFormField.objects.filter(
        campo_clave='nombre_curso',
    )
    FieldOption.objects.filter(
        field__in=course_name_fields,
        valor__iexact='otro',
    ).delete()
    CourseFormField.objects.filter(campo_clave='nombre_curso_otro').delete()

    validation = {'exact_digits': 10, 'max_digits': 10}
    CourseFormField.objects.filter(
        campo_clave__in=['telefono', 'numero_empleado'],
    ).update(validacion=validation)


class Migration(migrations.Migration):
    dependencies = [
        ('courses', '0006_registration_owner_remove_template_archive'),
    ]

    operations = [
        migrations.RunPython(
            update_existing_form_fields,
            migrations.RunPython.noop,
        ),
    ]
