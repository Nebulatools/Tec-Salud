# Plan de Corrección: Bugs en Expedientes y UI de TecSalud

## Resumen del Problema

Se identificaron 5 problemas en el sistema:

1. **Cuestionario Base**: Muestra `[object Object]` para campos con datos anidados (family_history, surgeries, medications, personal_history)
2. **Cuestionario Especialidad (Doctor)**: Muestra 60+ respuestas duplicadas para Cardiología y 20+ para Endocrinología
3. **Reportes**: Los títulos de reportes muestran nombres incorrectos (el filtro SQL es correcto, el problema es que los títulos se guardaron con nombres de otros pacientes)
4. **Sidebar Usuario**: "Mi Perfil" debe moverse al fondo del sidebar
5. **Cuestionario Especialidad (Usuario)**: Duplicados históricos en la BD

---

## Análisis de Base de Datos

### Hallazgos Clave

| Tabla | Registros | Problema |
|-------|-----------|----------|
| `specialist_responses` | 165 | Duplicados históricos por paciente/especialidad |
| `patient_baseline_forms` | 4 | Campos JSONB con objetos anidados |
| `medical_reports` | 21 | Títulos con nombres incorrectos |

### Datos de Prueba
- **Paciente**: jose angelo (`2d7042b2-6db5-4c01-afab-80057c36998c`)
- **Doctor**: ventas@jacoagency.io (`c164fceb-d5c5-4edd-b586-84bd99de91dc`)
- **Usuario vinculado**: jaco.12.94@gmail.com (`26ad8d0d-6617-457d-b8f7-64f917927582`)

---

## Plan de Corrección

### Bug 1: `[object Object]` en Cuestionario Base

**Archivo**: `app/(dashboard)/expedientes/[patientId]/page.tsx`

**Problema**: Líneas ~773-889 usan `String(value)` para renderizar campos, pero algunos valores son objetos/arrays.

**Solución**:
```typescript
// Crear función helper para formatear valores
const formatFieldValue = (value: unknown): string => {
  if (value === null || value === undefined) return "No especificado"
  if (typeof value === "boolean") return value ? "Sí" : "No"
  if (typeof value === "string") return value || "No especificado"
  if (Array.isArray(value)) {
    if (value.length === 0) return "Ninguno"
    // Para arrays de objetos (medications, surgeries)
    return value.map(item => {
      if (typeof item === "object" && item !== null) {
        // Extraer campos relevantes
        return Object.entries(item)
          .filter(([k]) => k !== "id")
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")
      }
      return String(item)
    }).join(" | ")
  }
  if (typeof value === "object") {
    // Para objetos simples (family_history)
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ")
  }
  return String(value)
}
```

**Cambios requeridos**:
1. Agregar función `formatFieldValue` al componente
2. Reemplazar `String(value)` con `formatFieldValue(value)` en las líneas de renderizado

---

### Bug 2: Duplicados en Cuestionario Especialidad (Vista Doctor)

**Archivo**: `app/(dashboard)/expedientes/[patientId]/page.tsx`

**Problema**: El query de `specialist_responses` (líneas ~362-388) trae TODAS las respuestas sin deduplicar.

**Solución**:
```typescript
// Cambiar el query para obtener solo la respuesta más reciente por pregunta
const { data: specialistResponses } = await supabase
  .from("specialist_responses")
  .select(`
    id,
    question_id,
    answer,
    submitted_at,
    specialty_id,
    specialist_questions!inner(prompt, field_type)
  `)
  .eq("patient_user_id", patient?.user_id)
  .order("submitted_at", { ascending: false })

// Deduplicar por question_id + specialty_id (mantener solo la más reciente)
const uniqueResponses = specialistResponses?.reduce((acc, response) => {
  const key = `${response.specialty_id}-${response.question_id}`
  if (!acc.has(key)) {
    acc.set(key, response)
  }
  return acc
}, new Map())

const deduplicatedResponses = Array.from(uniqueResponses?.values() || [])
```

---

### Bug 3: Limpieza de Datos Duplicados en BD

**Acción**: Script SQL para limpiar duplicados históricos

```sql
-- Eliminar respuestas duplicadas, manteniendo solo la más reciente
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY patient_user_id, specialty_id, question_id
           ORDER BY submitted_at DESC
         ) as rn
  FROM specialist_responses
)
DELETE FROM specialist_responses
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
```

**Nota**: Ejecutar DESPUÉS de verificar que el código ya no crea duplicados (el código actual ya usa delete+insert, así que está bien).

---

### Bug 4: Sidebar Usuario - Mover "Mi Perfil"

**Archivo**: `components/user/user-sidebar.tsx`

**Cambio**: Líneas 8-16, reordenar el array `navigation`:

```typescript
const navigation = [
  { name: "Mi Portal", href: "/user", icon: Home, matchPrefix: false },
  { name: "Mis Citas", href: "/user/citas", icon: Calendar, matchPrefix: true },
  { name: "Mis Recetas", href: "/user/recetas", icon: FileText, matchPrefix: true },
  { name: "Mi Familia", href: "/user/familia", icon: Users, matchPrefix: true },
  { name: "Expediente", href: "/user/expediente", icon: ClipboardList, matchPrefix: true },
  { name: "Hub Médico", href: "/user/especialistas", icon: Stethoscope, matchPrefix: true },
  { name: "Mi Perfil", href: "/user/mi-perfil", icon: User, matchPrefix: true }, // Movido aquí
  { name: "Configuración", href: "/user/configuracion", icon: Settings, matchPrefix: true },
]
```

---

### Bug 5: Reportes con Títulos Incorrectos

**Análisis**: Los reportes se filtran correctamente por `patient_id`, pero los títulos fueron guardados con nombres incorrectos durante la creación del reporte.

**Solución Propuesta**:

Opción A (Recomendada): **No modificar títulos existentes** - Los reportes son correctos, solo el título muestra un nombre diferente. Esto es un problema de datos históricos.

Opción B: Script de corrección para actualizar títulos:
```sql
UPDATE medical_reports mr
SET title = 'Consulta - ' || p.first_name || ' ' || p.last_name || ' - ' || TO_CHAR(mr.created_at, 'MM/DD/YYYY')
FROM patients p
WHERE mr.patient_id = p.id
  AND mr.title LIKE 'Consulta -%';
```

---

## Orden de Implementación

1. **PRIMERO** - Bug 4: Sidebar (cambio trivial, sin riesgo)
2. **SEGUNDO** - Bug 1: formatFieldValue (mejora de UI, sin cambios de datos)
3. **TERCERO** - Bug 2: Deduplicación en frontend (mejora de UI)
4. **CUARTO** - Bug 3: Limpieza de BD (después de verificar que el código no crea más duplicados)
5. **OPCIONAL** - Bug 5: Corrección de títulos de reportes

---

## Archivos a Modificar

| Archivo | Tipo de Cambio |
|---------|----------------|
| `components/user/user-sidebar.tsx` | Reordenar array |
| `app/(dashboard)/expedientes/[patientId]/page.tsx` | Agregar función + deduplicar |

## Validación Post-Cambios

- [ ] Verificar que Cuestionario Base muestre datos formateados correctamente
- [ ] Verificar que Cuestionario Especialidad muestre solo respuestas únicas (1 por pregunta)
- [ ] Verificar que "Mi Perfil" esté antes de "Configuración" en sidebar
- [ ] Ejecutar script SQL de limpieza de duplicados
- [ ] Revisar si los títulos de reportes necesitan corrección

---

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Pérdida de datos al limpiar duplicados | Script mantiene la respuesta más reciente |
| Formateo incorrecto de objetos complejos | Función formatFieldValue maneja casos edge |
| Cambios afectan otros componentes | Cambios son localizados a archivos específicos |
