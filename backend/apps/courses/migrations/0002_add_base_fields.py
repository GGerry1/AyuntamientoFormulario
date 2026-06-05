from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0001_initial'),
    ]

    operations = [
        # New fields on CourseFormField
        migrations.AddField(
            model_name='courseformfield',
            name='es_campo_base',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='courseformfield',
            name='campo_clave',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='courseformfield',
            name='validacion',
            field=models.JSONField(blank=True, null=True),
        ),
        # New field on CourseRegistration
        migrations.AddField(
            model_name='courseregistration',
            name='nombre_curso_snapshot',
            field=models.CharField(blank=True, max_length=300),
        ),
        # New fields on RegistrationAnswer
        migrations.AddField(
            model_name='registrationanswer',
            name='campo_label_snapshot',
            field=models.CharField(blank=True, max_length=300),
        ),
        migrations.AddField(
            model_name='registrationanswer',
            name='campo_clave_snapshot',
            field=models.CharField(blank=True, max_length=50),
        ),
    ]
