# Cobertura de Especificaciones Técnicas Zuli (vs. codebase)

Leyenda: **OK** = implementado, **PARCIAL** = existe pero incompleto, **FALTA** = no se encontró implementación.

| Spec | Estado | Evidencia en el repo (ejemplos) | Notas / gaps principales |
|---|---|---|---|
| 4.1 Módulo de registro & auth | PARCIAL | `components/auth/login-form.tsx`, `hooks/use-auth.ts` | Login + signup manual con Supabase Auth. No vi OAuth Google/Apple ni pantallas/APIs para recover/reset password. |
| 4.2 Módulo de roles & permisos | PARCIAL | `hooks/use-app-user.ts`, `db/20250305_simplify_roles.sql` | Roles simples `user` vs `doctor_admin` + gating básico. No vi permisos granulares. |
| 4.4 Usuarios–pacientes–cuidadores (Mi Perfil & Mis Familias) | PARCIAL | `app/user/perfil/page.tsx`, `app/user/page.tsx`, `db/20250304_user_portal_and_specialists.sql` | “Mi Perfil” como cuestionario base (JSONB) y update. No vi “Mis Familias” ni cuidadores/relaciones familiares dedicadas. |
| 4.6 Catálogo de especialidades y profesionales | PARCIAL | `app/user/especialistas/page.tsx`, `lib/supabase.ts`, `db/20250304_user_portal_and_specialists.sql` | Tablas `specialties`, `doctor_specialties` + marketplace; precarga default si no hay especialidades. Falta módulo/admin formal para catálogo. |
| 4.7 Catálogo de tipos de unidades médicas | FALTA | — | No vi tablas/rutas/pantallas para “tipos de unidades médicas”. |
| 4.9 Usuarios–médicos (Mi Perfil Médico) | PARCIAL | `app/(dashboard)/perfil/page.tsx`, `components/doctor/doctor-specialty-setup.tsx` | Edición de perfil (metadata) + seteo de especialidades. No vi verificación con carga de archivos ni reglas de aprobación/rechazo. |
| 4.10 Unidades médicas | FALTA | — | No vi alta/verificación/aprobación/edición, ni búsqueda/filtros/export/impresión, ni “placeholders”. |
| 4.11 Citas, reservaciones & confirmaciones | PARCIAL | `components/appointments/appointment-calendar.tsx`, `components/appointments/add-appointment-form.tsx`, `app/(dashboard)/consultas/[appointmentId]/page.tsx`, `app/api/appointments/book/route.ts` | CRUD/agenda del médico y flujo de consulta por cita. Lado paciente: no vi “Mis Citas/Agendar/Reagendar/Confirmar/Cancelar” completo (sí hay “linking/solicitud”). |
| 4.12 Pendientes | FALTA | — | No vi módulo CRUD de pendientes con estados. |
| 4.13 Expediente médico | PARCIAL | `components/doctor/patient-records.tsx`, `db/20250304_user_portal_and_specialists.sql`, `app/api/clinical-extractions/route.ts`, `app/api/medical-reports/route.ts` | Datos tipo expediente distribuidos en `patient_baseline_forms`, `specialist_responses`, `lab_results`, `medical_reports`, `clinical_extractions`. No vi cifrado de PII a nivel columna/app. |
| 4.18 Home/Hub/Explore | PARCIAL | `app/user/especialistas/page.tsx` | Marketplace de especialistas con filtros/redirección. No vi hub genérico de “servicios disponibles”. |
| 4.19 Calificación/comentarios | FALTA | — | No vi tablas/rutas/pantallas de reseñas/puntajes. |
| 4.21 Notificaciones, recordatorios/alarmas | FALTA | — | No vi tablas/rutas/pantallas de notificaciones. |
| 4.27 IA | PARCIAL | `app/api/transcribe/route.ts`, `app/api/transcribe-diarized/route.ts`, `app/api/parse-transcript/route.ts`, `app/api/enrich-report/route.ts`, `app/api/virtual-intern/route.ts` | Transcripción (incl. diarización), extracción clínica, compliance/enriquecimiento y “pasante virtual”. No vi RAG/contexto premium tipo plugin OMS ni pantallas de configuración/chatbot dedicadas. |
| 4.28 Recetas | FALTA | — | No vi módulo/templates de recetas. |
| 4.29 Reportes | PARCIAL | `app/api/medical-reports/route.ts`, `components/appointments/consultation-steps/final-report.tsx` | Guardado/consulta de `medical_reports` y descarga como texto. No vi export XML/PDF/CSV real ni una vista/listado de reportes con filtros completa. |
| 4.31 Notificaciones (visualización) | FALTA | — | No vi UI de notificaciones de plataforma/correos automáticos. |
| 4.32 Mapa & favoritos | FALTA | — | No vi favoritos (likes) ni mapa. |
| 4.33 Dashboard | PARCIAL | `app/(dashboard)/dashboard/page.tsx`, `app/user/page.tsx`, `components/dashboard/*` | Dashboard doctor (stats/pendientes) y portal paciente (progreso). No vi “monitores/trackers” como módulo. |
| 4.34 Encuestas | PARCIAL | `app/user/cuestionario/page.tsx`, `lib/supabase.ts`, `db/20250304_user_portal_and_specialists.sql` | Cuestionario base + cuestionarios de especialidad (templates `specialist_questions` / respuestas `specialist_responses`) quedan ligados al paciente. Falta módulo genérico/admin de templates. |
| 4.35 Generación de códigos (QR) | FALTA | `plans/feat-ezyai-ui-improvements-linking-flow.md` | No vi generación/escaneo/deep linking implementado; aparece como fase futura. |
| 4.36 Consultas (presencial o teleconsulta) | PARCIAL | `components/appointments/consultation-flow.tsx`, `app/(dashboard)/consultas/[appointmentId]/page.tsx` | Flujo de consulta con grabación/transcripción/reporte. No vi videollamada integrada. |

