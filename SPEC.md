# TODO - TecSalud / Zuli Health - Auditoría Completa

**Última actualización**: 2025-12-29
**Auditoría realizada por**: Claude Code Multi-Agent Review
**Referencia del plan**: `plans/complete-patient-doctor-ui-authorization.md`

---

## Resumen Ejecutivo

| Categoría | Estado | Completado |
|-----------|--------|------------|
| 1. Acceso y Seguridad | 🟢 COMPLETADO | 100% |
| 2. Consultorio Digital (Médico) | 🟡 PARCIAL | 75% |
| 3. Experiencia del Paciente | 🟢 COMPLETADO | 95% |
| 4. Inteligencia y Consultas | 🟢 AVANZADO | 90% |
| 5. Sistema QR (Gancho Comercial) | 🟡 PARCIAL | 80% |
| 6. Seguimiento y Comunicación | 🟢 COMPLETADO | 100% |

---

## 1. Acceso y Seguridad

### 1.1 Registro e Inicio de Sesión
**Estatus**: 🟢 COMPLETADO (100%)

| Funcionalidad | Estado | Archivo | Notas |
|---------------|--------|---------|-------|
| Login email/password | ✅ OK | `components/auth/login-form.tsx` | Funciona correctamente |
| Registro usuario | ✅ OK | `components/auth/login-form.tsx` | Con nombre/apellido |
| Login con Google | ✅ OK | `components/auth/login-form.tsx` | Botón implementado |
| Olvidé contraseña | ✅ OK | `app/auth/reset-password/page.tsx` | Página completa |
| Link forgot password | ✅ OK | `components/auth/login-form.tsx` | Link en formulario |
| OAuth callback | ✅ OK | `app/auth/callback/route.ts` | Maneja redirección correctamente |

**Tareas completadas:**
- [x] **P1-001**: Agregar botón de Google en login-form.tsx
- [x] **P1-002**: Crear página `/app/auth/reset-password/page.tsx` para restablecer contraseña
- [x] **P1-003**: Agregar link "Olvidé mi contraseña" en login-form.tsx

### 1.2 Perfiles de Usuario (Paciente y Médico)
**Estatus**: 🟢 OK / AVANZADO (95%)

| Funcionalidad | Estado | Archivo |
|---------------|--------|---------|
| Distinción doctor/paciente | ✅ OK | `hooks/use-app-user.ts`, `app_users.role` |
| Redirección por rol | ✅ OK | `app/(dashboard)/layout.tsx`, `app/auth/callback/route.ts` |
| Perfil médico completo | ✅ OK | `app/(dashboard)/perfil/page.tsx` |
| Perfil paciente (baseline) | ✅ OK | `app/user/perfil/page.tsx` |

---

## 2. El Consultorio Digital (Lado del Médico)

### 2.1 Perfil y Verificación Médica
**Estatus**: 🟢 AVANZADO (90%)

| Funcionalidad | Estado | Archivo | Notas |
|---------------|--------|---------|-------|
| Datos del doctor | ✅ OK | `app/(dashboard)/perfil/page.tsx` | Nombre, avatar, bio, credenciales |
| Selección de especialidad | ✅ OK | `components/doctor/doctor-specialty-setup.tsx` | Con 3 especialidades por defecto |
| Subir cédula profesional | ✅ OK | `app/(dashboard)/verificacion/page.tsx` | PDF/imagen a Supabase Storage |
| Subir certificado especialidad | ✅ OK | `app/(dashboard)/verificacion/page.tsx` | PDF/imagen |
| Estados de verificación | ✅ OK | DB: `doctor_verifications` | pending/submitted/under_review/verified/rejected |
| Panel admin verificación | ⚠️ MANUAL | - | Aprobación manual desde Supabase |

### 2.2 Gestión de Unidades Médicas (Clínicas)
**Estatus**: 🟢 IMPLEMENTADO (85%)

| Funcionalidad | Estado | Archivo | Notas |
|---------------|--------|---------|-------|
| Listar consultorios | ✅ OK | `app/(dashboard)/consultorios/page.tsx` | Con rol (owner/admin/staff) |
| Crear consultorio | ✅ OK | `app/(dashboard)/consultorios/nuevo/page.tsx` | Usa RPC `create_medical_unit_with_owner` |
| Datos: nombre, dirección, teléfono, email | ✅ OK | DB: `medical_units` | |
| Logo de clínica | ⚠️ PARCIAL | DB: `logo_url` existe | **Campo en DB pero NO hay upload UI** |
| Horarios de operación | ⚠️ PARCIAL | DB: `operating_hours` JSONB | **Campo en DB pero NO hay UI para editar** |
| Datos de facturación | ⚠️ PARCIAL | DB: `billing_info` JSONB | **Campo en DB pero NO hay UI para editar** |
| Editar consultorio existente | ❌ FALTA | - | **Solo se puede crear, no editar** |

**Tareas pendientes:**
- [ ] **P2-002**: Crear página de edición de consultorio `/consultorios/[id]/editar`
- [ ] **P2-003**: Agregar UI para subir logo de clínica
- [ ] **P2-004**: Agregar UI para configurar horarios de operación
- [ ] **P2-005**: Agregar UI para datos de facturación

### 2.3 Generador de Recetas
**Estatus**: 🟢 COMPLETADO (95%)

| Funcionalidad | Estado | Archivo | Notas |
|---------------|--------|---------|-------|
| Listar recetas | ✅ OK | `app/(dashboard)/recetas/page.tsx` | Filtros por estado |
| Crear receta (borrador) | ✅ OK | `app/(dashboard)/recetas/nueva/page.tsx` | Selección paciente + medicamentos |
| Agregar medicamentos | ✅ OK | `components/prescriptions/prescription-form.tsx` | Dinámico, múltiples meds |
| Firmar receta | ✅ OK | `app/api/prescriptions/[id]/sign/route.ts` | Cambia status a 'signed' |
| Vista previa PDF | ✅ OK | `components/prescriptions/prescription-pdf.tsx` | react-pdf |
| Descargar PDF | ✅ OK | `app/(dashboard)/recetas/[id]/page.tsx` | |
| Estados: draft/signed/delivered/cancelled | ✅ OK | DB: `prescriptions.status` | |

**Base de datos**: `prescriptions` - Estructura completa con medications JSONB

---

## 3. La Experiencia del Paciente

### 3.1 Marketplace de Especialistas (Buscador)
**Estatus**: 🟢 OK (90%)

| Funcionalidad | Estado | Archivo |
|---------------|--------|---------|
| Buscar doctores | ✅ OK | `app/user/especialistas/page.tsx` |
| Filtrar por especialidad | ✅ OK | Pills con toggle |
| Ver info del doctor | ✅ OK | Cards con avatar, especialidad, rating real |
| Solicitar consulta | ✅ OK | Navega a `/user/cuestionario` |

### 3.2 Gestión de Familiares
**Estatus**: 🟢 COMPLETADO (95%)

| Funcionalidad | Estado | Archivo | Notas |
|---------------|--------|---------|-------|
| Tabla family_groups | ✅ OK | DB: `family_groups` | Esquema completo |
| Tabla family_members | ✅ OK | DB: `family_members` | Con relationships: self/spouse/child/parent/etc |
| RLS policies | ✅ OK | Migración aplicada | Acceso por owner o miembro |
| UI para agregar familiar | ✅ OK | `app/user/familia/page.tsx` | Modal completo |
| UI para ver familiares | ✅ OK | `app/user/familia/page.tsx` | Cards con acciones |
| Cambiar entre perfiles | ✅ OK | `components/user/user-header.tsx` | Dropdown en header |
| Hook gestión perfil | ✅ OK | `hooks/use-family-profile.ts` | Persiste selección en localStorage |

**Tareas completadas:**
- [x] **P3-001**: Crear página `/user/familia/page.tsx` para gestión de familiares
- [x] **P3-002**: Agregar modal "Agregar familiar" con campos: nombre, relación, fecha nacimiento
- [x] **P3-003**: Selector de perfil en header para cambiar entre familiares

### 3.3 Mis Citas (Panel del Paciente)
**Estatus**: 🟢 COMPLETADO (100%)

| Funcionalidad | Estado | Archivo | Notas |
|---------------|--------|---------|-------|
| Ver citas próximas | ✅ OK | `app/user/citas/page.tsx` | Tab "Próximas" |
| Ver historial | ✅ OK | `app/user/citas/page.tsx` | Tab "Historial" |
| Agendar nueva cita | ✅ OK | Dialog con calendario + slots | |
| Cancelar cita | ✅ OK | Botón con confirmación | |
| Reagendar cita | ✅ OK | `app/user/citas/page.tsx` | Dialog con nuevo horario |
| Vincular doctor por código | ✅ OK | Input código QR manual | |

**Tareas completadas:**
- [x] **P3-004**: Agregar botón "Reagendar" que permita cambiar fecha/hora

### 3.4 Mis Recetas (Vista Paciente)
**Estatus**: 🟢 IMPLEMENTADO (80%)

| Funcionalidad | Estado | Archivo | Notas |
|---------------|--------|---------|-------|
| Ver lista de recetas | ✅ OK | `app/user/recetas/page.tsx` | Cards expandibles |
| Ver detalle de medicamentos | ✅ OK | Expandir card | Nombre, dosis, frecuencia, duración |
| Descargar PDF | ⚠️ PARCIAL | - | **Botón existe pero muestra "Próximamente"** |
| Filtrar por estado/fecha | ❌ FALTA | - | |

**Tareas pendientes:**
- [ ] **P3-005**: Implementar descarga real de PDF en `/user/recetas`

---

## 4. Inteligencia y Consultas

### 4.1 Asistente con IA (Pasante Virtual)
**Estatus**: 🟢 AVANZADO (95%)

| Funcionalidad | Estado | Archivo |
|---------------|--------|---------|
| Grabar consulta | ✅ OK | `components/appointments/consultation-steps/consultation-recording.tsx` |
| Transcribir audio | ✅ OK | `app/api/transcribe/route.ts`, `app/api/transcribe-diarized/route.ts` |
| Extraer datos clínicos | ✅ OK | `app/api/parse-transcript/route.ts` |
| Generar resumen SOAP | ✅ OK | `app/api/enrich-report/route.ts` |
| Sugerencias IA | ✅ OK | `app/api/get-clinical-suggestions/route.ts` |
| Validar transcripción | ✅ OK | `components/transcription-validation/transcription-validator.tsx` |
| Virtual Intern analysis | ✅ OK | `app/api/virtual-intern/route.ts`, DB: `virtual_intern_runs` |

**Base de datos**:
- `clinical_extractions` - Síntomas, diagnósticos, medicamentos extraídos
- `medical_reports` - Reportes generados
- `virtual_intern_runs` - Análisis de pasante virtual

### 4.2 Expediente Médico Digital
**Estatus**: 🟡 PARCIAL (60%)

| Funcionalidad | Estado | Archivo | Notas |
|---------------|--------|---------|-------|
| Guardar datos clínicos | ✅ OK | `clinical_extractions` | Con structured_diagnoses ICD-11 |
| Historial de consultas | ✅ OK | `medical_reports` | |
| Vista timeline | ❌ FALTA | - | **Datos existen pero NO hay UI de línea de tiempo** |
| Expediente unificado | ⚠️ PARCIAL | `app/(dashboard)/expedientes/page.tsx` | **Redirige a /especialistas** |

**Tareas pendientes:**
- [ ] **P4-001**: Crear vista de timeline del expediente médico
- [ ] **P4-002**: Implementar `/expedientes/[patientId]` con historial visual

### 4.3 Encuestas de Especialidad
**Estatus**: 🟢 OK (90%)

| Funcionalidad | Estado | Archivo |
|---------------|--------|---------|
| Preguntas por especialidad | ✅ OK | `specialist_questions` |
| Respuestas paciente | ✅ OK | `specialist_responses` |
| Cuestionario dinámico | ✅ OK | `app/user/cuestionario/page.tsx` |
| Cardiología, Endocrinología, Medicina Interna | ✅ OK | 3 especialidades configuradas |

---

## 5. El Gancho Comercial (QR)

### 5.1 Sistema de Captación por QR
**Estatus**: 🟢 IMPLEMENTADO (85%)

| Funcionalidad | Estado | Archivo | Notas |
|---------------|--------|---------|-------|
| Crear código QR | ✅ OK | `app/(dashboard)/qr-codes/nuevo/page.tsx` | 3 tipos de campaña |
| Listar QR codes | ✅ OK | `app/(dashboard)/qr-codes/page.tsx` | Con contador de escaneos |
| Ver detalle QR | ✅ OK | `app/(dashboard)/qr-codes/[id]/page.tsx` | Descarga PNG, copiar link |
| Generar QR visual | ✅ OK | Canvas-based en cliente | |
| Expiración | ✅ OK | DB: `expires_at` | Con badge visual |
| API crear QR | ✅ OK | `app/api/qr/route.ts` | |
| Redirect handler | ✅ OK | `app/link/qr/[id]/route.ts` | Incrementa scan count |
| Landing encuesta | ✅ OK | `app/patient/survey/page.tsx` | Wizard multi-paso |
| Landing perfil rápido | ✅ OK | `app/patient/profile/page.tsx` | Formulario básico |
| Landing agendar cita | ✅ OK | `app/patient/appointments/new/page.tsx` | Calendario + slots |
| QR Scanner (paciente) | ✅ OK | `components/patient/qr-scanner.tsx` | html5-qrcode |
| Middleware sin auth | ✅ OK | `middleware.ts` | `/link/qr/*` y `/patient/*` públicos |

**Base de datos**: `qr_links` - Esquema completo con short_code

**Tareas pendientes:**
- [ ] **P5-002**: Crear tabla `qr_conversions` para analytics de conversión (SCOPE TBD)
- [ ] **P5-003**: Dashboard de métricas QR (escaneos vs conversiones) (SCOPE TBD)

---

## 6. Seguimiento y Comunicación

### 6.1 Notificaciones y Recordatorios
**Estatus**: 🟢 COMPLETADO (100%)

| Funcionalidad | Estado | Archivo | Notas |
|---------------|--------|---------|-------|
| Tabla notifications | ✅ OK | DB: `notifications` | Tipos, canales, estados |
| Tabla notification_preferences | ✅ OK | DB: `notification_preferences` | Por usuario |
| Tabla email_logs | ✅ OK | DB: `email_logs` | Tracking Resend |
| Recordatorio de cita (24h, 1h) | ✅ OK | `app/api/cron/appointment-reminders/route.ts` | Cron job |
| Email notifications | ✅ OK | `lib/email/resend.ts` | Templates HTML |
| API envío notificaciones | ✅ OK | `app/api/notifications/send/route.ts` | Multi-tipo |
| UI de preferencias | ✅ OK | `app/user/configuracion/page.tsx` | Email, push, SMS, timing |
| Link en sidebar | ✅ OK | `components/user/user-sidebar.tsx` | "Configuración" |
| Vercel Cron config | ✅ OK | `vercel.json` | Cada hora |

**Tareas completadas:**
- [x] **P6-001**: Crear tabla `notifications` con tipos y preferencias
- [x] **P6-002**: Implementar job de recordatorios (24h, 1h antes de cita)
- [x] **P6-003**: Integrar servicio de email (Resend)
- [x] **P6-004**: UI de preferencias de notificación en perfil

### 6.2 Calificaciones y Reseñas
**Estatus**: 🟢 COMPLETADO (100%)

| Funcionalidad | Estado | Archivo | Notas |
|---------------|--------|---------|-------|
| Tabla doctor_ratings | ✅ OK | DB: `doctor_ratings` | Múltiples categorías |
| Tabla doctor_reviews | ✅ OK | DB: `doctor_reviews` | Con moderación |
| UI para calificar doctor | ✅ OK | `components/ratings/rating-dialog.tsx` | 4 categorías |
| Promedio de rating | ✅ OK | `components/doctors/doctor-rating.tsx` | Rating real |
| Moderación de reseñas | ✅ OK | DB: `status` pending/approved/rejected | |
| Botón calificar post-consulta | ✅ OK | `app/user/citas/page.tsx` | En historial |

**Tareas completadas:**
- [x] **P6-005**: Crear tablas `doctor_ratings` y `doctor_reviews`
- [x] **P6-006**: UI post-consulta para calificar al doctor
- [x] **P6-007**: Mostrar rating real en marketplace

---

## Resumen de Base de Datos (Supabase)

### Tablas Principales (28+ total)

| Tabla | RLS | Estado |
|-------|-----|--------|
| `app_users` | ✅ | OK |
| `doctors` | ✅ | OK |
| `patients` | ✅ | OK |
| `appointments` | ✅ | OK |
| `medical_reports` | ✅ | OK |
| `clinical_extractions` | ✅ | OK |
| `prescriptions` | ✅ | OK |
| `qr_links` | ✅ | OK |
| `medical_units` | ✅ | OK |
| `doctor_units` | ✅ | OK |
| `doctor_verifications` | ✅ | OK |
| `doctor_patient_links` | ✅ | OK |
| `doctor_specialties` | ✅ | OK |
| `specialties` | ✅ | OK |
| `specialist_questions` | ✅ | OK |
| `specialist_responses` | ✅ | OK |
| `patient_profiles` | ✅ | OK |
| `patient_baseline_forms` | ✅ | OK |
| `lab_orders` | ✅ | OK |
| `lab_results` | ✅ | OK |
| `virtual_intern_runs` | ✅ | OK |
| `family_groups` | ✅ | OK |
| `family_members` | ✅ | OK |
| `notifications` | ✅ | OK - NUEVO |
| `notification_preferences` | ✅ | OK - NUEVO |
| `email_logs` | ✅ | OK - NUEVO |
| `doctor_ratings` | ✅ | OK - NUEVO |
| `doctor_reviews` | ✅ | OK - NUEVO |

### Tablas Pendientes (Scope TBD)

| Tabla | Propósito | Prioridad |
|-------|-----------|-----------|
| `qr_conversions` | Analytics de QR | Scope TBD |

---

## Prioridad de Tareas Restantes

### 🟡 P2 - IMPORTANTE (Mejora significativa)

1. **P2-002**: Crear página de edición de consultorio `/consultorios/[id]/editar`
2. **P2-003**: Agregar UI para subir logo de clínica
3. **P2-004**: Agregar UI para configurar horarios de operación
4. **P2-005**: Agregar UI para datos de facturación
5. **P4-001**: Crear vista de timeline del expediente médico
6. **P4-002**: Implementar `/expedientes/[patientId]` con historial visual

### 🔵 P3 - MEJORAS (Nice to have)

7. **P3-005**: Implementar descarga real de PDF en `/user/recetas`
8. **P5-002**: Tabla qr_conversions (Scope TBD)
9. **P5-003**: Dashboard de métricas QR (Scope TBD)

---

## Funcionalidades Completadas (Esta Sesión)

### Autenticación
- Login con Google OAuth
- Página de reset password
- Link "Olvidé mi contraseña"

### Gestión de Familia
- Página `/user/familia` con CRUD de familiares
- Modal para agregar familiar
- Selector de perfil en header (dropdown)
- Hook `useFamilyProfile` con persistencia

### Citas
- Botón y dialog para reprogramar citas

### Notificaciones
- Sistema completo de notificaciones (DB + API + UI)
- Preferencias de notificación (email, push, SMS)
- Timing de recordatorios (24h, 1h)
- Cron job para envío automático (`vercel.json`)
- Integración con Resend para emails

### Calificaciones
- Tablas `doctor_ratings` y `doctor_reviews`
- Dialog para calificar doctor (4 categorías)
- Componente de rating real en marketplace
- Moderación de reseñas

---

## Notas Técnicas

### Stack Tecnológico
- **Framework**: Next.js 15 + React 19 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: OpenRouter (Gemini Flash), Replicate (Whisper)
- **Email**: Resend
- **Testing**: Vitest + Playwright + MSW
- **Cron**: Vercel Cron Jobs

### Patrones de Seguridad Implementados
- ✅ RLS en todas las tablas (28+ tablas)
- ✅ Middleware de autenticación
- ✅ Supabase Server Client en API routes
- ✅ Storage buckets privados con políticas por carpeta
- ✅ Cron secret para endpoints programados

### Arquitectura de Carpetas
```
app/
├── (dashboard)/    # Rutas protegidas doctor
├── user/           # Rutas protegidas paciente
├── patient/        # Rutas públicas (QR landing)
├── link/           # QR redirect handler
├── api/            # API routes
│   ├── cron/       # Cron jobs (appointment-reminders)
│   └── notifications/  # Sistema de notificaciones
└── auth/           # OAuth callback, reset password
```

### Environment Variables Requeridas
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
OPENROUTER_API_KEY=
REPLICATE_API_TOKEN=

# Email
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Cron
CRON_SECRET=
```
