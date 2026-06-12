from django.db import migrations


def update_seniority_label(apps, schema_editor):
    CourseFormField = apps.get_model('courses', 'CourseFormField')
    CourseFormField.objects.filter(
        campo_clave='antiguedad',
    ).update(label='Antigüedad Laboral (años)')


class Migration(migrations.Migration):
    dependencies = [
        ('courses', '0008_seed_institutional_templates'),
    ]

    operations = [
        migrations.RunPython(
            update_seniority_label,
            migrations.RunPython.noop,
        ),
    ]
