# Pasos para habilitar portal de usuario, roles y flujos de especialistas

Proyecto Supabase: `didbxinquugseweufvpr`

## 1) Aplicar migración SQL
1. Abre Supabase Studio → SQL Editor.
2. Copia el contenido de `db/20250304_user_portal_and_specialists.sql`.
3. Ejecuta el script completo (es aditivo, no borra datos).
4. Verifica que aparezcan las tablas nuevas: `app_users`, `patient_profiles`, `patient_baseline_forms`, `doctor_patient_links`, `specialties`, `doctor_specialties`, `specialist_questions`, `specialist_responses`, `lab_orders`, `lab_results`, `virtual_intern_runs`.

## 2) Semillas útiles (opcional)
Ejecuta en el SQL Editor para registrar especialidades base:
```sql
INSERT INTO public.specialties (id, name, description) VALUES
  (gen_random_uuid(), 'Endocrinología', 'Especialistas hormonales'),
  (gen_random_uuid(), 'Cardiología', 'Corazón y sistema circulatorio'),
  (gen_random_uuid(), 'Medicina Interna', 'Atención integral de adultos')
ON CONFLICT (name) DO NOTHING;
```

## 3) Bucket de Storage para laboratorios
1. Supabase Studio → Storage → New bucket → nombre `lab-results`, privacidad `Private`.
2. Opcional: política de acceso (RLS en Storage) para que usuarios autenticados puedan subir/leer sus propios archivos:
```sql
-- bucket name: lab-results
-- allow authenticated uploads
CREATE POLICY "upload lab results"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lab-results' AND auth.role() = 'authenticated');

-- allow authenticated read
CREATE POLICY "read lab results"
ON storage.objects FOR SELECT
USING (bucket_id = 'lab-results' AND auth.role() = 'authenticated');
```
3. El campo `lab_results.storage_path` debe guardar la ruta `lab-results/<uuid>.<ext>` que regrese el SDK de Storage.

## 4) Metadatos de usuario para rol inicial
- Los usuarios nuevos se crean con `role = 'user'` por defecto.
- Para provisionar un doctor directamente, asigna en `raw_user_meta_data` del signup:
```json
{
  "role": "doctor_admin",
  "first_name": "Nombre",
  "last_name": "Apellido",
  "specialty": "Cardiología"
}
```

## 5) Enlaces doctor-paciente
- Tabla `doctor_patient_links` administra solicitudes y aprobaciones (`status`: pending/accepted/rejected/revoked).
- `patient_user_id` referencia al usuario autenticado; `patient_id` puede vincularse al registro en `patients` cuando se cree/importe.
- `requested_by` indica si la solicitud la inició el doctor o el paciente (marketplace).

## 6) Formularios
- `patient_baseline_forms` almacena formulario médico base (general_info, vitals, lifestyle, conditions).
- `specialist_questions` define el cuestionario por especialidad (tipos de campo en `field_kind`).
- `specialist_responses` guarda respuestas por paciente + especialidad (opcionalmente ligadas a doctor).
- `medical_reports.specialist_context` puede guardar el snapshot del cuestionario usado en la consulta.

## 7) Laboratorios y pasante virtual
- `lab_orders` registra recomendaciones personalizadas; `status`: pending_upload → awaiting_review → reviewed.
- `lab_results` guarda la ruta del archivo subido.
- `virtual_intern_runs` almacena ejecuciones del LLM (“pasante virtual”) con referencias a paciente, laboratorio y especialidad.

## 8) RLS
- La migración deja RLS desactivado en las tablas nuevas para no bloquear el frontend actual.
- Cuando se active la vista de usuario, agregar políticas mínimas:
  - `app_users`: SELECT solo `id = auth.uid()`.
  - `patient_baseline_forms`, `specialist_responses`, `lab_orders`, `lab_results`, `virtual_intern_runs`: permitir acceso a `auth.uid()` coincidente o al doctor de la relación aprobada.

## 9) Validaciones rápidas post-migración
```sql
-- contar tablas clave
SELECT COUNT(*) FROM app_users;
SELECT COUNT(*) FROM specialties;
-- verificar columnas nuevas
SELECT column_name FROM information_schema.columns
WHERE table_name = 'medical_reports' AND column_name IN ('patient_user_id','specialty_id','specialist_context');
```

Listo. Con esto quedan los cimientos de roles (user/admin), portal de paciente, marketplace de especialistas, pedidos de laboratorio y ejecución del pasante virtual. Ajusta las políticas RLS según el flujo final de frontend antes de producción.
