from django.core.management.base import BaseCommand
from django.contrib.sites.models import Site

class Command(BaseCommand):
    help = 'Actualiza el dominio del sitio para producción'

    def handle(self, *args, **options):
        site, created = Site.objects.get_or_create(id=1)
        site.domain = "ayuntamientoformulario-1.onrender.com"
        site.name = "AyuntamientoFormulario"
        site.save()
        self.stdout.write(self.style.SUCCESS(f'✅ Sitio actualizado a {site.domain}'))