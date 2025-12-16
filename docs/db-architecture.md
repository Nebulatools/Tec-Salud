# Arquitectura de datos (Supabase) – Proyecto `didbxinquugseweufvpr`

## Esquema público (tablas principales)

- `app_users` (auth.users → perfil app)
  - Campos: `id (PK, FK auth.users)`, `email`, `role (user|doctor_admin)`, `full_name`, `phone`, `metadata`, timestamps.
  - Relación: 1:1 con auth.users. Referenciada por casi todas las tablas vía `patient_user_id`/`user_id`.

- `doctors`
  - Campos: `id (PK)`, `user_id (FK app_users/auth.users)`, `email`, `first_name`, `last_name`, `specialty`, `doctor_role (admin|user)`, `is_specialist`, `profile_id (FK app_users)`, timestamps.
  - Relación: cada doctor apunta a un auth.user/app_user.

- `patients`
  - Campos: `id (PK)`, `doctor_id (FK doctors)`, `user_id (FK app_users, opcional)`, datos demográficos, timestamps.
  - Uso: pacientes “offline” del doctor; `user_id` conecta con paciente autenticado.

- `appointments`
  - Campos: `id`, `doctor_id (FK doctors)`, `patient_id (FK patients)`, `patient_user_id (FK app_users, opcional)`, fecha/hora, `status`, notas/diagnóstico/tratamiento, timestamps.

- `medical_reports`
  - Campos: `id`, `appointment_id (FK appointments)`, `patient_id (FK patients)`, `doctor_id (FK doctors)`, `patient_user_id (FK app_users)`, `specialty_id (FK specialties)`, `specialist_context JSONB`, `report_type`, `title`, `content`, `original_transcript`, `ai_suggestions text[]`, `compliance_status`, `medicamentos JSONB`, timestamps.

- `clinical_extractions`
  - Campos: `id`, `appointment_id`, `patient_id`, `doctor_id`, `patient_user_id`, snapshots/JSON de síntomas/diagnósticos/meds, timestamps.

- `patient_profiles`
  - Campos: `id (PK, FK app_users)`, `baseline_completed`, timestamps.

- `patient_baseline_forms`
  - Campos: `id`, `patient_user_id (FK app_users)`, `patient_id (FK patients)`, `general_info`, `vitals`, `lifestyle`, `conditions` (JSONB), timestamps, `version`, unique `patient_user_id`.

- `doctor_patient_links`
  - Campos: `id`, `doctor_id (FK doctors)`, `patient_user_id (FK app_users)`, `patient_id (FK patients, opcional)`, `status (pending|accepted|rejected|revoked)`, `requested_by (doctor|patient)`, timestamps, notas. Unique (doctor_id, patient_user_id).

- `specialties`
  - Campos: `id`, `name`, `description`, timestamps.

- `doctor_specialties`
  - Campos: `doctor_id (FK doctors)`, `specialty_id (FK specialties)`, `is_primary`, timestamps. PK compuesto.

- `specialist_questions`
  - Campos: `id`, `specialty_id (FK specialties)`, `created_by_doctor (FK doctors)`, `prompt`, `field_type (field_kind enum)`, `options JSONB`, `is_required`, `order_index`, `active`, timestamps.

- `specialist_responses`
  - Campos: `id`, `patient_user_id (FK app_users)`, `patient_id (FK patients)`, `doctor_id (FK doctors)`, `specialty_id (FK specialties)`, `question_id (FK specialist_questions)`, `answer JSONB`, timestamps.

- `lab_orders`
  - Campos: `id`, `patient_user_id (FK app_users)`, `patient_id (FK patients)`, `doctor_id (FK doctors)`, `specialty_id (FK specialties)`, `recommended_tests JSONB`, `notes`, `status (pending_upload|awaiting_review|reviewed)`, `recommended_at`, `reviewed_at`, `reviewed_by (FK doctors)`.

- `lab_results`
  - Campos: `id`, `lab_order_id (FK lab_orders)`, `storage_path`, `mime_type`, `uploaded_by (FK app_users)`, `uploaded_at`.

- `virtual_intern_runs`
  - Campos: `id`, `doctor_id (FK doctors)`, `patient_user_id (FK app_users)`, `patient_id (FK patients)`, `lab_order_id (FK lab_orders)`, `specialty_id (FK specialties)`, `status (pending|processing|succeeded|failed)`, `summary`, `suggestions text[]`, `error`, timestamps.

## Enums
- `app_role`: user, doctor_admin.
- `doctor_role`: admin, user.
- `doctor_patient_status`: pending, accepted, rejected, revoked.
- `field_kind`: short_text, long_text, number, date, boolean, single_select, multi_select.
- `lab_order_status`: pending_upload, awaiting_review, reviewed.
- `virtual_intern_status`: pending, processing, succeeded, failed.

## Trigger de provisión
- `handle_new_user` (AFTER INSERT ON auth.users):
  - Crea/actualiza `app_users` con role derivado de `raw_user_meta_data.role` (doctor_admin para doctor/doctor_admin/doctor).
  - Si es doctor_admin, upsert en `doctors` con `doctor_role=admin`, `is_specialist=true`, `profile_id=user_id`.

## RLS y políticas (resumen)
- `app_users`: self-read/update; `doctor_read_linked` permite al doctor leer pacientes con link `accepted`.
- `doctors`: lectura abierta (ajustable).
- `specialties`, `doctor_specialties`: lectura abierta.
- `doctor_patient_links`: paciente lee/crea los suyos; doctor lee/actualiza los suyos.
- `specialist_questions`: lectura abierta.
- `specialist_responses`: paciente lee/escribe las suyas; doctor lee si es su doctor o está vinculado.
- `lab_orders`: paciente CRUD de lo suyo; doctor CRUD si es el doctor o tiene vínculo aceptado.
- `lab_results`: paciente CRUD de lo suyo; doctor CRUD si es el doctor o tiene vínculo aceptado.
- Otras tablas (appointments, medical_reports, clinical_extractions, virtual_intern_runs, patients) en modo lectura abierta en este dump (ajustar a necesidad productiva).

## Storage (bucket `lab-results`, policies en storage.objects)
- Paciente: subir/leer solo si `split_part(name,'/',2)` = `lab_order_id` y `lab_orders.patient_user_id = auth.uid()`.
- Doctor: leer si `doctor_id` coincide o hay vínculo aceptado con el paciente de la orden.

## Flujos funcionales

1) Alta de usuarios
   - Signup paciente (role por defecto user) → se crea `app_users`.
   - Signup doctor con `raw_user_meta_data.role = doctor_admin` → trigger crea `app_users` + `doctors`.

2) Vínculo doctor-paciente
   - Paciente solicita (o doctor) → `doctor_patient_links` status pending.
   - Doctor acepta → status accepted.
   - Efectos: el doctor puede leer `app_users` del paciente (policy doctor_read_linked), ver respuestas y labs vinculados.

3) Cuestionario base
   - Paciente llena `patient_baseline_forms` (y `patient_profiles.baseline_completed`).

4) Cuestionario especializado
   - Preguntas en `specialist_questions` (por especialidad); si no hay, se insertan defaults en frontend.
   - Respuestas en `specialist_responses` (patient_user_id + specialty_id + doctor_id opcional).

5) Recomendación de labs
   - Front calcula `recommended_tests` y crea/upserta `lab_orders` con status `pending_upload`, specialty_id, doctor_id, patient_user_id.
   - Se guardan datos de proveedor/sucursal dentro de `recommended_tests`.

6) Subida de resultados
   - Paciente sube archivo a bucket `lab-results` → inserta fila en `lab_results` (lab_order_id) → status de `lab_orders` pasa a `awaiting_review`.
   - Doctor ve en “Fichas de Pacientes” (consulta `lab_orders` + `lab_results`) y puede descargar con signed URL.

7) Pasante virtual (opcional)
   - Usa `virtual_intern_runs` vinculando doctor, patient_user, lab_order, specialty.

## Relaciones clave (texto)
- auth.users → app_users (1:1); app_users → doctors (0/1); doctors → doctor_patient_links (doctor_id); app_users (paciente) → doctor_patient_links (patient_user_id).
- app_users (paciente) → lab_orders (patient_user_id); doctors → lab_orders (doctor_id); specialties → lab_orders (specialty_id); lab_orders → lab_results (lab_order_id).
- specialties → specialist_questions → specialist_responses (question_id, specialty_id); app_users (paciente) → specialist_responses (patient_user_id); doctors → specialist_responses (doctor_id opcional).
- app_users → patient_profiles/patient_baseline_forms; patients (offline) conectan con doctors y opcionalmente app_users.

