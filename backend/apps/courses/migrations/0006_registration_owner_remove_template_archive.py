from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def preserve_registration_ownership(apps, schema_editor):
    Course = apps.get_model('courses', 'Course')
    CourseRegistration = apps.get_model('courses', 'CourseRegistration')

    for registration in CourseRegistration.objects.select_related('course'):
        if registration.course_id:
            registration.administrador_id = registration.course.administrador_id
            registration.save(update_fields=['administrador'])

    for course in Course.objects.filter(archivado=True):
        CourseRegistration.objects.filter(course=course).update(curso_archivado=True)
        course.delete()


class Migration(migrations.Migration):
    # PostgreSQL must commit the data migration before dropping Course.archivado;
    # otherwise deletes leave pending trigger events that block ALTER TABLE.
    atomic = False

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('courses', '0005_courseregistration_curso_archivado'),
    ]

    operations = [
        migrations.AddField(
            model_name='courseregistration',
            name='administrador',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='course_registrations',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(
            preserve_registration_ownership,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='courseregistration',
            name='administrador',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='course_registrations',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RemoveField(
            model_name='course',
            name='archivado',
        ),
    ]
