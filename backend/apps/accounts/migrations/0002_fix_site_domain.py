from django.db import migrations

def fix_site_domain(apps, schema_editor):
    Site = apps.get_model('sites', 'Site')
    Site.objects.update_or_create(
        id=1,
        defaults={
            'domain': 'ayuntamientoformulario-1.onrender.com',
            'name': 'CursoGov'
        }
    )

class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0001_initial'),
        ('sites', '0002_alter_domain_unique'),
    ]
    operations = [
        migrations.RunPython(fix_site_domain, migrations.RunPython.noop),
    ]