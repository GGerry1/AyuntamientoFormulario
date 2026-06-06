from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Corrige el dominio del Sites Framework'

    def handle(self, *args, **options):
        from django.contrib.sites.models import Site
        Site.objects.update_or_create(
            id=1,
            defaults={
                'domain': 'ayuntamientoformulario-1.onrender.com',
                'name': 'CursoGov'
            }
        )
        self.stdout.write(self.style.SUCCESS('Dominio corregido: ayuntamientoformulario-1.onrender.com'))