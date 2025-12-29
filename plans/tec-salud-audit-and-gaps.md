# Auditoría Integral: TecSalud - Sistema de Gestión Médica

**Fecha**: 2025-12-28
**Estado**: Análisis Completo
**Prioridad**: Alta

---

## 1. Resumen Ejecutivo

Se realizó una auditoría completa del sistema TecSalud analizando:
- 15+ tablas en Supabase
- Flujos de UI para pacientes y doctores
- Políticas RLS (Row Level Security)
- Integraciones entre componentes

### Hallazgos Críticos
| Severidad | Cantidad | Descripción |
|-----------|----------|-------------|
| 🚨 Crítico | 3 | Tablas inexistentes, RLS bloqueante, columna incorrecta |
| ⚠️ Alto | 2 | Flujos incompletos de vinculación paciente-doctor |
| ℹ️ Medio | 3 | Mejoras de UX y datos faltantes |

---

## 2. Diagrama de Entidades (ERD Simplificado)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   app_users     │     │    doctors      │     │  medical_units  │
│─────────────────│     │─────────────────│     │─────────────────│
│ id (uuid)       │────▶│ user_id (FK)    │     │ id (uuid)       │
│ email           │     │ profile_id      │     │ name            │
│ first_name      │     │ specialty       │     │ address_line    │
│ last_name       │     │ phone           │     │ city            │
│ role            │     │ email           │     │ operating_hours │
└─────────────────┘     └────────┬────────┘     └────────┬────────┘
                                 │                       │
                    ┌────────────┴────────────┐          │
                    │                         │          │
                    ▼                         ▼          ▼
          ┌─────────────────┐     ┌─────────────────────────────┐
          │    patients     │     │       doctor_units          │
          │─────────────────│     │─────────────────────────────│
          │ id (uuid)       │     │ doctor_id (FK)              │
          │ doctor_id (FK)  │     │ unit_id (FK)                │
          │ user_id (FK?)   │     │ role (owner/admin/staff)    │
          │ first_name      │     └─────────────────────────────┘
          │ email           │
          └────────┬────────┘
                   │
     ┌─────────────┴─────────────┐
     │                           │
     ▼                           ▼
┌─────────────────┐     ┌─────────────────────────────┐
│  appointments   │     │    doctor_patient_links     │
│─────────────────│     │─────────────────────────────│
│ id              │     │ doctor_id (FK)              │
│ doctor_id (FK)  │     │ patient_user_id (FK)        │
│ patient_id (FK) │     │ patient_id (FK)             │
│ appointment_date│     │ status (pending/accepted)   │
│ start_time      │     │ requested_by                │
│ end_time        │     └─────────────────────────────┘
│ status          │
└─────────────────┘

┌─────────────────┐
│    qr_links     │
│─────────────────│
│ doctor_id (FK)  │
│ campaign_type   │
│ redirect_url    │
│ short_code      │
│ expires_at      │
└─────────────────┘
```

---

## 3. Estado Actual de Datos

| Tabla | Registros | Estado |
|-------|-----------|--------|
| doctors | 2 | ✅ OK |
| patients | 6 | ✅ OK |
| appointments | 18 | ✅ OK |
| doctor_patient_links | 7 | ⚠️ Parcial (5 aceptados, 2 pendientes) |
| qr_links | 1 | ✅ OK |
| medical_units | 0 | 🚨 Vacío (RLS bloqueando) |
| doctor_units | 0 | 🚨 Vacío |
| qr_conversions | - | 🚨 NO EXISTE |
| patient_surveys | - | 🚨 NO EXISTE |

---

## 4. Análisis de Gaps Críticos

### 4.1 🚨 CRÍTICO: Tablas Inexistentes

**Problema**: El código intenta insertar en tablas que no existen.

**Archivos afectados**:
- `/app/patient/appointments/new/page.tsx:198` → `qr_conversions`
- `/app/patient/survey/page.tsx` → `patient_surveys`
- `/app/patient/profile/page.tsx` → `qr_conversions`

**Impacto**: Errores silenciosos, pérdida de tracking de conversiones QR.

**Solución**:
```sql
-- Crear tabla qr_conversions
CREATE TABLE qr_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_link_id UUID REFERENCES qr_links(id),
  patient_id UUID REFERENCES patients(id),
  converted_at TIMESTAMPTZ DEFAULT NOW(),
  conversion_type TEXT -- 'appointment', 'survey', 'profile'
);

-- Crear tabla patient_surveys
CREATE TABLE patient_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  doctor_id UUID REFERENCES doctors(id),
  responses JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4.2 🚨 CRÍTICO: RLS Bloqueando Consultorios

**Problema**: Al crear `medical_units`, falla con:
> "new row violates row-level security policy for table 'medical_units'"

**Análisis de RLS actual**:
```yaml
medical_units:
  SELECT: "EXISTS(SELECT 1 FROM doctor_units WHERE unit_id = id AND doctor_id = auth.uid())"
  INSERT: "with_check: true"  # Parece permitir, pero...
  UPDATE: "EXISTS(...role='owner')"
  DELETE: "EXISTS(...role='owner')"

doctor_units:
  # RLS probablemente requiere que el doctor ya esté en la unidad
  # para insertar en doctor_units - DEADLOCK
```

**Causa raíz**: Después de insertar en `medical_units`, se debe insertar en `doctor_units` para establecer ownership. Pero la RLS de `doctor_units` puede estar verificando permisos que aún no existen.

**Solución**: Crear función con SECURITY DEFINER:
```sql
CREATE OR REPLACE FUNCTION create_medical_unit_with_owner(
  p_name TEXT,
  p_address_line TEXT,
  p_city TEXT,
  p_state TEXT,
  p_country TEXT DEFAULT 'MX'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit_id UUID;
  v_doctor_id UUID;
BEGIN
  -- Obtener doctor_id del usuario actual
  SELECT id INTO v_doctor_id FROM doctors WHERE user_id = auth.uid();

  IF v_doctor_id IS NULL THEN
    RAISE EXCEPTION 'No doctor profile found for current user';
  END IF;

  -- Crear la unidad médica
  INSERT INTO medical_units (name, address_line, city, state, country)
  VALUES (p_name, p_address_line, p_city, p_state, p_country)
  RETURNING id INTO v_unit_id;

  -- Asignar al doctor como owner
  INSERT INTO doctor_units (doctor_id, unit_id, role)
  VALUES (v_doctor_id, v_unit_id, 'owner');

  RETURN v_unit_id;
END;
$$;
```

---

### 4.3 🚨 CRÍTICO: Columna Incorrecta en Query

**Archivo**: `/app/patient/appointments/new/page.tsx:116`

**Problema**:
```typescript
// Código actual (INCORRECTO)
.select('scheduled_time')

// Schema real
appointments: {
  appointment_date: string  // '2024-01-15'
  start_time: string        // '09:00:00'
  end_time: string          // '09:30:00'
}
```

**Solución**:
```typescript
.select('appointment_date, start_time')
```

---

### 4.4 ⚠️ ALTO: Flujo QR No Crea Vinculación

**Problema**: Cuando un paciente escanea un QR y completa el flujo, NO se crea entrada en `doctor_patient_links`.

**Archivos afectados**:
- `/app/patient/appointments/new/page.tsx` - Crea paciente + cita, NO vinculación
- `/app/patient/survey/page.tsx` - Crea paciente + encuesta, NO vinculación
- `/app/patient/profile/page.tsx` - Crea paciente, NO vinculación

**Impacto**:
- El doctor no ve al paciente en su lista de pacientes vinculados
- El paciente no puede ver sus citas correctamente
- Desconexión entre ambos sistemas

**Solución**: Agregar después de crear paciente:
```typescript
// Crear vinculación doctor-paciente
await supabase.from('doctor_patient_links').insert({
  doctor_id: doctorId,
  patient_user_id: user.id,  // Si está autenticado
  patient_id: patientId,
  status: 'pending',  // o 'accepted' si es automático
  requested_by: 'patient'
});
```

---

### 4.5 ⚠️ ALTO: Pacientes No Pueden Agendar Citas

**Archivo**: `/app/user/citas/page.tsx`

**Problema**: La página solo muestra citas existentes. No hay botón "Nueva Cita".

**UI Actual**:
```
┌─────────────────────────────────────┐
│  Mis Citas                          │
│                                     │
│  📭 No tienes citas programadas     │
│  Escanea el código QR de tu doctor  │
│  para agendar una cita.             │
│                                     │
└─────────────────────────────────────┘
```

**Solución propuesta**:
```
┌─────────────────────────────────────┐
│  Mis Citas                          │
│                                     │
│  [+ Nueva Cita]  ← Nuevo botón      │
│                                     │
│  📭 No tienes citas programadas     │
│                                     │
│  ─── O ───                          │
│  [📷 Escanear QR de Doctor]         │
│                                     │
└─────────────────────────────────────┘
```

El botón "Nueva Cita" mostraría lista de doctores vinculados (`doctor_patient_links` con status='accepted').

---

## 5. Flujo Actual vs Esperado

### Flujo Actual (INCOMPLETO)
```
Paciente escanea QR
        ↓
Crea registro en `patients`
        ↓
Crea cita/encuesta/perfil
        ↓
❌ NO crea `doctor_patient_links`
        ↓
❌ Doctor no ve paciente vinculado
❌ Paciente no puede agendar más citas
```

### Flujo Esperado (CORRECTO)
```
Paciente escanea QR
        ↓
Crea/actualiza registro en `patients`
        ↓
✅ Crea `doctor_patient_links` (status: pending)
        ↓
Doctor acepta vinculación (opcional, puede ser automático)
        ↓
✅ `doctor_patient_links.status = 'accepted'`
        ↓
Crea cita/encuesta/perfil
        ↓
✅ Registra conversión en `qr_conversions`
        ↓
✅ Paciente puede ver doctor en "Mis Doctores"
✅ Paciente puede agendar citas directamente
✅ Doctor ve paciente en su lista
```

---

## 6. Plan de Implementación

### Fase 1: Fixes Críticos (Inmediato)
| # | Tarea | Archivo | Esfuerzo |
|---|-------|---------|----------|
| 1.1 | Crear migración para `qr_conversions` | Supabase | 30 min |
| 1.2 | Crear migración para `patient_surveys` | Supabase | 30 min |
| 1.3 | Crear función `create_medical_unit_with_owner` | Supabase | 45 min |
| 1.4 | Corregir query `scheduled_time` → `appointment_date` | `/app/patient/appointments/new/page.tsx` | 15 min |

### Fase 2: Vinculación Paciente-Doctor (Alta Prioridad)
| # | Tarea | Archivo | Esfuerzo |
|---|-------|---------|----------|
| 2.1 | Agregar creación de `doctor_patient_links` en cita QR | `/app/patient/appointments/new/page.tsx` | 30 min |
| 2.2 | Agregar creación de `doctor_patient_links` en survey | `/app/patient/survey/page.tsx` | 30 min |
| 2.3 | Agregar creación de `doctor_patient_links` en profile | `/app/patient/profile/page.tsx` | 30 min |
| 2.4 | Agregar registro en `qr_conversions` | Todos los flujos QR | 45 min |

### Fase 3: UX Paciente (Media Prioridad)
| # | Tarea | Archivo | Esfuerzo |
|---|-------|---------|----------|
| 3.1 | Agregar botón "Nueva Cita" en `/user/citas` | `/app/user/citas/page.tsx` | 1h |
| 3.2 | Crear selector de doctores vinculados | Nuevo componente | 1.5h |
| 3.3 | Crear formulario de nueva cita para paciente | Nuevo componente | 2h |

### Fase 4: Dashboard Doctor (Mejoras)
| # | Tarea | Archivo | Esfuerzo |
|---|-------|---------|----------|
| 4.1 | Panel de solicitudes de vinculación pendientes | Dashboard | 2h |
| 4.2 | Métricas de conversión QR | Dashboard | 3h |

---

## 7. Políticas RLS Recomendadas

### qr_conversions
```sql
-- SELECT: Doctor puede ver sus conversiones
CREATE POLICY "Doctors can view their conversions"
ON qr_conversions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM qr_links
    WHERE qr_links.id = qr_conversions.qr_link_id
    AND qr_links.doctor_id IN (
      SELECT id FROM doctors WHERE user_id = auth.uid()
    )
  )
);

-- INSERT: Cualquiera puede registrar conversión (público)
CREATE POLICY "Anyone can record conversion"
ON qr_conversions FOR INSERT
WITH CHECK (true);
```

### patient_surveys
```sql
-- SELECT: Doctor puede ver encuestas de sus pacientes
CREATE POLICY "Doctors can view patient surveys"
ON patient_surveys FOR SELECT
USING (
  doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
);

-- INSERT: Pacientes autenticados o anónimos con QR válido
CREATE POLICY "Patients can submit surveys"
ON patient_surveys FOR INSERT
WITH CHECK (true);
```

---

## 8. Checklist de Validación Post-Fix

- [ ] Crear consultorio funciona sin error RLS
- [ ] Escanear QR de cita crea `doctor_patient_links`
- [ ] Escanear QR de encuesta crea `doctor_patient_links`
- [ ] Escanear QR de perfil crea `doctor_patient_links`
- [ ] Conversiones QR se registran en `qr_conversions`
- [ ] Paciente puede ver sus citas en `/user/citas`
- [ ] Paciente puede agendar nueva cita con doctor vinculado
- [ ] Doctor ve pacientes vinculados pendientes de aprobación
- [ ] Query de citas usa columnas correctas (`appointment_date`, `start_time`)

---

## 9. Recomendaciones Adicionales

### Seguridad
1. Agregar rate limiting a endpoints QR
2. Validar expiración de QR links antes de procesar
3. Audit log de todas las operaciones de vinculación

### UX
1. Notificaciones push cuando doctor acepta vinculación
2. Email de confirmación al agendar cita
3. Recordatorios de citas próximas

### Datos
1. Soft delete para pacientes (no borrar, marcar inactivo)
2. Histórico de cambios de estado en `doctor_patient_links`
3. Backup automático de encuestas médicas

---

## 10. Conclusión

El sistema tiene una arquitectura sólida pero con **3 gaps críticos** que deben resolverse antes de producción:

1. **Tablas faltantes** (`qr_conversions`, `patient_surveys`)
2. **RLS de consultorios** bloqueando creación
3. **Flujo QR incompleto** (no crea vinculación)

**Tiempo estimado total**: ~12-15 horas de desarrollo

**Prioridad recomendada**: Fase 1 → Fase 2 → Fase 3 → Fase 4
