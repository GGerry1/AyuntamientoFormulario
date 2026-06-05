"""
seed_estadisticas.py
Genera 100 inscripciones ficticias repartidas en 5 cursos
para probar el modulo de estadisticas.

Uso:
    python manage.py shell < seed_estadisticas.py
    -- o --
    python manage.py shell -c "exec(open('seed_estadisticas.py').read())"
"""
import random
import uuid
from datetime import datetime, timedelta
from django.utils import timezone

from apps.accounts.models import Administrator
from apps.courses.models import (
    Course, CourseFormField, FieldOption,
    CourseRegistration, RegistrationAnswer
)

# ─── Config ───────────────────────────────────────────────────────────────────

ADMIN_EMAIL = 'admin@test.com'

CURSOS = ['Excel', 'Word', 'PowerPoint', 'Python', 'JavaScript']

# Distribucion: total = 100
DIST = {'Excel': 28, 'Word': 22, 'PowerPoint': 18, 'Python': 20, 'JavaScript': 12}

# Opciones de campos base
SEXOS          = ['Masculino', 'Femenino']
PESOS_SEXO     = [55, 45]

PUESTOS        = ['Administrativo', 'Operativo', 'Funcionario', 'Tecnico']
PESOS_PUESTO   = [40, 30, 20, 10]

TIPOS_EMP      = ['Sindicalizado', 'Supernumerario', 'Confianza', 'Eventual']
PESOS_TIPO     = [45, 25, 20, 10]

NIVELES        = ['Secundaria', 'Preparatoria', 'Tecnico', 'Licenciatura', 'Maestria']
PESOS_NIVEL    = [10, 20, 15, 45, 10]

NOMBRES_M = ['Carlos','Miguel','Jose','Luis','Juan','Pedro','Roberto','Fernando',
             'Alejandro','Ricardo','Eduardo','Jorge','Andres','Francisco','Antonio']
NOMBRES_F = ['Maria','Ana','Laura','Sofia','Carmen','Rosa','Patricia','Monica',
             'Gabriela','Diana','Claudia','Veronica','Sandra','Elizabeth','Jessica']
APELLIDOS = ['Garcia','Lopez','Martinez','Hernandez','Gonzalez','Perez','Rodriguez',
             'Sanchez','Ramirez','Torres','Flores','Rivera','Diaz','Cruz','Morales',
             'Reyes','Gutierrez','Ortiz','Chavez','Romero']

DOMINIOS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'gob.mx']

# ─── Helpers ──────────────────────────────────────────────────────────────────

def rand_name(sexo):
    pool = NOMBRES_M if sexo == 'Masculino' else NOMBRES_F
    return f"{random.choice(pool)} {random.choice(APELLIDOS)} {random.choice(APELLIDOS)}"

def rand_email(nombre):
    clean = nombre.lower().replace(' ', '.').replace('á','a').replace('é','e')\
            .replace('í','i').replace('ó','o').replace('ú','u')
    parts = clean.split('.')
    user = f"{parts[0]}.{parts[-1]}{random.randint(10,99)}"
    return f"{user}@{random.choice(DOMINIOS)}"

def rand_date_in_last_6_months():
    days_ago = random.randint(0, 180)
    return timezone.now() - timedelta(days=days_ago, hours=random.randint(0,23))

def wrand(options, weights):
    return random.choices(options, weights=weights, k=1)[0]

# ─── Main ─────────────────────────────────────────────────────────────────────

print("=== SEED ESTADISTICAS ===")

# 1. Get admin
try:
    admin = Administrator.objects.get(email=ADMIN_EMAIL)
    print(f"Admin encontrado: {admin.email}")
except Administrator.DoesNotExist:
    print(f"ERROR: No existe admin con email {ADMIN_EMAIL}")
    print("Admins disponibles:")
    for a in Administrator.objects.all():
        print(f"  - {a.email}")
    raise SystemExit(1)

# 2. Get or use the first active plantilla (we'll reuse its fields)
plantilla = Course.objects.filter(administrador=admin).first()
if not plantilla:
    print("ERROR: No hay plantillas. Crea una desde el admin primero.")
    raise SystemExit(1)

print(f"Usando plantilla: {plantilla.titulo} ({plantilla.id})")

# 3. Get base fields
fields = {f.campo_clave: f for f in plantilla.form_fields.filter(es_campo_base=True)}
print(f"Campos base encontrados: {list(fields.keys())}")

required_keys = ['nombre_curso','nombre','correo','sexo','edad','telefono',
                 'numero_empleado','puesto','tipo_empleado','nivel_estudios','antiguedad']
missing = [k for k in required_keys if k not in fields]
if missing:
    print(f"ADVERTENCIA: Faltan campos clave: {missing}")
    print("Se crearan answers solo para los campos encontrados.")

# 4. Delete previous seed data (optional - comment out to keep)
prev = CourseRegistration.objects.filter(course=plantilla)
if prev.exists():
    print(f"Eliminando {prev.count()} registros previos de esta plantilla...")
    prev.delete()

# 5. Create registrations
created = 0
for curso_nombre, cantidad in DIST.items():
    print(f"\n  Creando {cantidad} inscritos para '{curso_nombre}'...")
    for i in range(cantidad):
        sexo   = wrand(SEXOS, PESOS_SEXO)
        nombre = rand_name(sexo)
        email  = rand_email(nombre)
        edad   = random.randint(20, 58)
        antiguedad = random.randint(1, 25)
        telefono = f"74{random.randint(10000000, 99999999)}"
        num_emp  = str(random.randint(1000, 9999))
        puesto   = wrand(PUESTOS, PESOS_PUESTO)
        tipo_emp = wrand(TIPOS_EMP, PESOS_TIPO)
        nivel    = wrand(NIVELES, PESOS_NIVEL)
        completado = random.random() < 0.72  # 72% completados

        # Registration
        reg_date = rand_date_in_last_6_months()
        reg = CourseRegistration(
            id=uuid.uuid4(),
            course=plantilla,
            email_participante=email,
            nombre_participante=nombre,
            nombre_curso_snapshot=curso_nombre,
            completado=completado,
        )
        reg.save()

        # Fix fecha manually (auto_now_add can't be overridden directly)
        CourseRegistration.objects.filter(id=reg.id).update(
            fecha_inscripcion=reg_date
        )

        # Answers map
        answers_data = {
            'nombre_curso':    (curso_nombre,  'Nombre del Curso'),
            'nombre':          (nombre,         'Nombre'),
            'correo':          (email,          'Correo Electronico'),
            'sexo':            (sexo,           'Sexo'),
            'edad':            (str(edad),      'Edad'),
            'telefono':        (telefono,       'Numero de Telefono'),
            'numero_empleado': (num_emp,        'Numero de Empleado'),
            'puesto':          (puesto,         'Puesto Actual'),
            'tipo_empleado':   (tipo_emp,       'Tipo de Empleado'),
            'nivel_estudios':  (nivel,          'Nivel de Estudios'),
            'antiguedad':      (str(antiguedad),'Antiguedad Laboral'),
        }

        answers_to_create = []
        for clave, (valor, label_default) in answers_data.items():
            field_obj = fields.get(clave)
            answers_to_create.append(RegistrationAnswer(
                id=uuid.uuid4(),
                registration=reg,
                field=field_obj,
                campo_label_snapshot=field_obj.label if field_obj else label_default,
                campo_clave_snapshot=clave,
                valor_texto=valor,
            ))

        RegistrationAnswer.objects.bulk_create(answers_to_create)
        created += 1

print(f"\n=== COMPLETADO: {created} inscripciones creadas ===")
print("\nDistribucion final:")
for curso, n in DIST.items():
    completados = CourseRegistration.objects.filter(
        course=plantilla,
        nombre_curso_snapshot=curso,
        completado=True
    ).count()
    print(f"  {curso:15} {n:3} inscritos  |  {completados} completados")

print(f"\nTotal: {CourseRegistration.objects.filter(course=plantilla).count()} registros en BD")
