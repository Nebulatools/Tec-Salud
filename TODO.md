# TODO - TecSalud Seguimiento

**Última actualización**: 2025-12-28
**Referencia completa**: `plans/tec-salud-audit-and-gaps.md`

---

## Estado de Flujos de Vinculación

| Flujo | Crea Link? | Estado | Archivo |
|-------|------------|--------|---------|
| QR → Encuesta | ❌ NO | Gap crítico | `/app/patient/survey/page.tsx` |
| QR → Perfil | ❌ NO | Gap crítico | `/app/patient/profile/page.tsx` |
| QR → Cita | ❌ NO | Gap crítico | `/app/patient/appointments/new/page.tsx` |
| Código manual | ✅ SÍ | Funciona | `/app/user/citas/page.tsx` (auto-acepta) |
| Marketplace | ✅ SÍ | Funciona | `/app/api/appointments/book/route.ts` (pending) |

---

## Tareas Pendientes

### FASE 1: CRÍTICO (Hacer primero)

- [ ] **1.1** Crear tabla `qr_conversions` en Supabase
  ```sql
  CREATE TABLE qr_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_link_id UUID REFERENCES qr_links(id),
    patient_id UUID REFERENCES patients(id),
    converted_at TIMESTAMPTZ DEFAULT NOW(),
    conversion_type TEXT
  );
  ```

- [x] **1.2** ~~Crear tabla `patient_surveys`~~ **NO NECESARIA**
  - Ya existe `patient_baseline_forms` (cuestionario base)
  - Ya existe `specialist_responses` (145 rows - cuestionarios de especialidad)
  - **FIX NECESARIO**: Cambiar `/app/patient/survey/page.tsx` para usar `specialist_responses` en lugar de `patient_surveys`

- [x] **1.3** ~~Fix bug columna incorrecta~~ **COMPLETADO**
  - Cambiado de `scheduled_time` a `appointment_date, start_time`
  - Agregado Suspense boundary para `useSearchParams()` (requerido por Next.js 16)

- [x] **1.4** ~~Crear función `create_medical_unit_with_owner` (RLS fix)~~ **COMPLETADO**
  - Migración aplicada: `fix_medical_units_rls`
  - Función `create_medical_unit_with_owner()` creada con SECURITY DEFINER
  - Política buggy de `doctor_units` corregida
  - Frontend actualizado en `/app/(dashboard)/consultorios/nuevo/page.tsx`

### FASE 2: VINCULACIÓN (Alta prioridad)

- [ ] **2.1** Agregar `doctor_patient_links` en `/app/patient/survey/page.tsx`
  - Después de crear paciente, insertar link con `status: 'pending'`

- [ ] **2.2** Agregar `doctor_patient_links` en `/app/patient/profile/page.tsx`
  - Mismo patrón que 2.1

- [ ] **2.3** Agregar `doctor_patient_links` en `/app/patient/appointments/new/page.tsx`
  - Mismo patrón que 2.1

- [ ] **2.4** Agregar insert a `qr_conversions` en los 3 flujos anteriores

### FASE 3: UX PACIENTE (Media prioridad)

- [ ] **3.1** Botón "Nueva Cita" ya implementado en `/user/citas` ✅
- [ ] **3.2** Verificar que selector de doctores funcione correctamente
- [ ] **3.3** Verificar formulario de nueva cita

### FASE 4: MEJORAS (Cuando haya tiempo)

- [ ] **4.1** Panel de solicitudes pendientes en dashboard doctor
- [ ] **4.2** Métricas de conversión QR en dashboard

---

## Bugs Conocidos

| Bug | Archivo | Línea | Estado |
|-----|---------|-------|--------|
| Calendar renderiza números | `/app/user/citas/page.tsx` | varios | ✅ FIXED |
| Query usa `scheduled_time` | `/app/patient/appointments/new/page.tsx` | 192-197 | ✅ FIXED |
| RLS bloquea medical_units | Supabase | - | ✅ FIXED |
| useSearchParams sin Suspense | `/app/patient/appointments/new/page.tsx` | 83 | ✅ FIXED |

---

## Validación Post-Fix

- [ ] Crear consultorio funciona sin error RLS
- [ ] QR encuesta crea `doctor_patient_links`
- [ ] QR perfil crea `doctor_patient_links`
- [ ] QR cita crea `doctor_patient_links`
- [ ] Conversiones se registran en `qr_conversions`
- [ ] Paciente puede agendar cita con doctor vinculado
- [ ] Doctor ve solicitudes pendientes

---

## Notas Técnicas

### Flujo esperado de vinculación via QR:
```
1. Paciente escanea QR
2. Si no tiene cuenta → crear cuenta
3. Completa encuesta/perfil/cita
4. AL COMPLETAR → crear doctor_patient_links (status: pending)
5. Registrar en qr_conversions
6. Doctor puede aceptar/rechazar
7. Paciente ve doctor en "Mis Doctores"
```

### Tablas clave:
- `doctor_patient_links` - Vinculación paciente-doctor
  - `status`: pending | accepted | rejected | revoked
  - `requested_by`: patient | doctor
- `qr_links` - Códigos QR del doctor
  - `short_code` - Código de 6 caracteres para vincular sin QR
  - `campaign_type`: specialty_survey | quick_profile | appointment
- `qr_conversions` - Tracking de conversiones (NO EXISTE AÚN)
- `patient_surveys` - Respuestas de encuestas (NO EXISTE AÚN)
