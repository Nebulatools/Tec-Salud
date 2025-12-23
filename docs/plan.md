# Plan: Integración WHO ICD API en EzyAI

## Resumen Ejecutivo

Integrar la API de Clasificación Internacional de Enfermedades (ICD-11) de la OMS para convertir los diagnósticos de texto libre a códigos médicos estandarizados, enfocándose inicialmente en el wizard de consulta.

**Alcance inicial:** Solo wizard de consulta (autocodificación + selector + badges)
**Versión ICD:** ICD-11 (2024-01) con soporte español

---

## Flujo Human-in-the-Loop Actualizado

El sistema tiene dos tipos de validación separadas:

```
PASO 2: Grabación y Validación
┌─────────────────────────────────────────────────────────────────┐
│  1. Grabación → Transcripción (word-level data)                 │
│                     ↓                                           │
│  2. TranscriptionValidator (VALIDACIÓN ACÚSTICA)                │
│     • Doctor revisa términos médicos de baja confianza          │
│     • Corrige palabras mal transcritas                          │
│     • Escucha audio de cada palabra                             │
│     • DEBE revisar todos los términos flaggeados                │
│                     ↓                                           │
│  3. triggerParseAndPersist + ICD AUTOCODE ← NUEVO               │
│     • Gemini extrae diagnósticos como texto                     │
│     • ICD API autocodifica cada diagnóstico                     │
│     • Preview muestra: "bronquitis → J20.9 ✓ (94%)"             │
│                     ↓                                           │
│  4. Extraction Preview con ICD Editor (VALIDACIÓN SEMÁNTICA)    │
│     • Doctor ve códigos ICD sugeridos                           │
│     • Puede corregir/buscar si código incorrecto                │
│     • Marca diagnósticos como "verificados"                     │
│                     ↓                                           │
│  5. "Continuar con esta transcripción →"                        │
└─────────────────────────────────────────────────────────────────┘
```

**Separación de responsabilidades:**
- `TranscriptionValidator` = Precisión ACÚSTICA → "¿La IA escuchó bien?"
- `ICD Coding` = Clasificación SEMÁNTICA → "¿Qué código representa esto?"

---

## Fase 0: Credenciales WHO ICD API

### Credenciales obtenidas:
```
ClientId: bbd8a3af-159f-4949-98d3-b415a7e83a1e_e8c33080-38c9-4537-bc2c-a7fc723e0853
ClientSecret: 47u5nYnQeD74JM6eGUkuH0p5KyEKqObJ0TYNW3vSa1U=
```

---

## Fase 1: Infraestructura Base

### 1.1 Variables de Entorno
**Archivo:** `.env.local`
```
WHO_ICD_CLIENT_ID=bbd8a3af-159f-4949-98d3-b415a7e83a1e_e8c33080-38c9-4537-bc2c-a7fc723e0853
WHO_ICD_CLIENT_SECRET=47u5nYnQeD74JM6eGUkuH0p5KyEKqObJ0TYNW3vSa1U=
WHO_ICD_TOKEN_URL=https://icdaccessmanagement.who.int/connect/token
WHO_ICD_API_URL=https://id.who.int/icd
WHO_ICD_RELEASE=2024-01
```

### 1.2 Tipos TypeScript
**Crear:** `types/icd.ts`
```typescript
export interface StructuredDiagnosis {
  original_text: string
  icd11_code: string | null
  icd11_title: string | null
  icd11_uri: string | null
  confidence: number
  verified_by_doctor: boolean
  coded_at: string | null
}

export interface ICDSearchResult {
  code: string
  title: string
  uri: string
  matchScore: number
}

export interface ICDAutocodeResult {
  searchText: string
  entity: { code: string; title: string; uri: string } | null
  score: number
  isAmbiguous: boolean
}
```

### 1.3 Migración de Base de Datos
**Crear:** `supabase/migrations/20241219_add_icd_support.sql`

```sql
-- Tabla cache de códigos ICD
CREATE TABLE IF NOT EXISTS icd_codes_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icd_version VARCHAR(2) NOT NULL,
  code VARCHAR(20) NOT NULL,
  title TEXT NOT NULL,
  title_es TEXT,
  uri TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(icd_version, code)
);

CREATE INDEX IF NOT EXISTS idx_icd_codes_cache_code ON icd_codes_cache(code);

-- Nueva columna (mantiene diagnoses para backward compat)
ALTER TABLE clinical_extractions
ADD COLUMN IF NOT EXISTS structured_diagnoses JSONB[] DEFAULT '{}';
```

### 1.4 Actualizar Tipos Supabase
**Modificar:** `lib/supabase.ts`
- Agregar tipo `icd_codes_cache` a Database
- Agregar `structured_diagnoses?: StructuredDiagnosis[]` a `clinical_extractions`

---

## Fase 2: Servicios de API ICD

### 2.1 Gestor de Tokens OAuth
**Crear:** `lib/icd-token-manager.ts`
- Singleton con cache en memoria
- Refresh 5min antes de expiración
- Retry automático en 401

### 2.2 Cliente API ICD
**Crear:** `lib/icd-api-client.ts`
- `autocodeToICD11(text)` - Autocodificar texto a ICD-11
- `searchICD11(query)` - Buscar con autocomplete
- Cache local en Supabase

### 2.3 Endpoints API Next.js
**Crear:** `app/api/icd/autocode/route.ts`
```typescript
POST { text: string } → { result: ICDAutocodeResult, fallback: boolean }
```

**Crear:** `app/api/icd/search/route.ts`
```typescript
GET ?q=query&limit=10 → { results: ICDSearchResult[] }
```

---

## Fase 3: Pipeline de Extracción Mejorado

### 3.1 Integrar Autocodificación en parse-transcript
**Modificar:** `app/api/parse-transcript/route.ts`

```typescript
// Después de extracción Gemini...
const structuredDiagnoses = await Promise.all(
  sanitized.diagnoses.map(async (text) => {
    const icd = await autocodeToICD11(text)
    return {
      original_text: text,
      icd11_code: icd?.entity?.code || null,
      icd11_title: icd?.entity?.title || null,
      icd11_uri: icd?.entity?.uri || null,
      confidence: icd?.score || 0,
      verified_by_doctor: false,
      coded_at: new Date().toISOString(),
    }
  })
)

return {
  ...sanitized,
  diagnoses: sanitized.diagnoses,           // Legacy
  structuredDiagnoses: structuredDiagnoses, // Nuevo
}
```

### 3.2 Actualizar clinical-extractions
**Modificar:** `app/api/clinical-extractions/route.ts`
- Guardar `structured_diagnoses` junto con `diagnoses`

---

## Fase 4: Componentes UI

### 4.1 Badge de Diagnóstico
**Crear:** `components/diagnoses/diagnosis-badge.tsx`
- Badge con código ICD (ej: "[J20.9]")
- Indicador de confianza (%, color)
- Indicador de verificación (✓)
- Tooltip con detalles
- Soporta string legacy y StructuredDiagnosis

### 4.2 Editor de Diagnósticos
**Crear:** `components/diagnoses/diagnosis-editor.tsx`
- Lista de diagnósticos con badges
- Botón editar (✏️) abre selector
- Opción agregar/eliminar diagnóstico
- Checkbox "verificado por doctor"

### 4.3 Selector Autocomplete
**Crear:** `components/diagnoses/diagnosis-selector.tsx`
- Basado en Command (cmdk) + Popover
- Input con debounce 300ms
- Lista de resultados código + título

---

## Fase 5: Integración en Paso 2 (Extraction Preview)

### 5.1 Actualizar consultation-recording.tsx
**Modificar:** `components/appointments/consultation-steps/consultation-recording.tsx`

Cambiar sección de diagnósticos en extraction preview (líneas ~444-479 y ~569-604):

**Antes:**
```jsx
<div>
  <p className="text-gray-500">Diagnósticos</p>
  <p className="text-gray-900">
    {extractionPreview.diagnoses.join(', ')}
  </p>
</div>
```

**Después:**
```jsx
<div>
  <p className="text-gray-500">Diagnósticos</p>
  <DiagnosisEditor
    diagnoses={extractionPreview.structuredDiagnoses || []}
    legacyDiagnoses={extractionPreview.diagnoses}
    onUpdate={(updated) => {
      setExtractionPreview(prev => ({
        ...prev,
        structuredDiagnoses: updated
      }))
    }}
  />
  {hasUnverifiedDiagnoses && (
    <p className="text-amber-600 text-xs mt-2">
      ⚠️ Verifica los códigos ICD antes de continuar
    </p>
  )}
</div>
```

### 5.2 Actualizar ExtractionPreview Interface
**Modificar:** líneas 69-76 de consultation-recording.tsx

```typescript
interface ExtractionPreview {
  patient: { id: string; name: string }
  symptoms: string[]
  diagnoses: string[]  // Legacy
  structuredDiagnoses?: StructuredDiagnosis[]  // Nuevo
  medications: { ... }[]
  speakerRoles: Record<string, string>
}
```

### 5.3 Componentes que NO se modifican
- `TranscriptionValidator` - Sigue validando palabras (precisión acústica)

---

## Fase 6: Integración en Pasos Posteriores

**Modificar:** `compliance-assistant.tsx`
- Mostrar diagnósticos con badges ICD
- Permitir edición con DiagnosisSelector

**Modificar:** `report-verification.tsx`
- Mostrar diagnósticos estructurados

**Modificar:** `final-report.tsx`
- Formatear sección con códigos ICD-11:
  ```
  DIAGNÓSTICOS (CIE-11)
  ─────────────────────
  J20.9 - Bronquitis aguda, no especificada
  J06.9 - Infección aguda de vías respiratorias superiores
  ```

---

## Fase 7: Actualización de Tipos

**Modificar:** `types/consultation.ts`
```typescript
import type { StructuredDiagnosis } from "./icd"

export interface ConsultationData {
  extractionPreview?: {
    // ...existing
    structuredDiagnoses?: StructuredDiagnosis[]
  }
}
```

---

## Fase 8: Testing

### 8.1 Tests Unitarios
**Crear:** `tests/unit/lib/icd-api-client.test.ts`

### 8.2 Tests de Integración
**Crear:** `tests/integration/api/icd.test.ts`

### 8.3 MSW Handlers
**Modificar:** `tests/setup/handlers.ts`

---

## UI Mockup: Extraction Preview con ICD

**Vista actual:**
```
Diagnósticos
bronquitis, infección respiratoria
```

**Vista con ICD:**
```
Diagnósticos
┌─────────────────────────────────────────────────────────┐
│ [J20.9] Bronquitis aguda                    94% ✓    ✏️ │
│ [J06.9] Inf. vías resp. superiores          91% ✓    ✏️ │
└─────────────────────────────────────────────────────────┘
[+ Agregar diagnóstico]

⚠️ Verifica los códigos ICD antes de continuar
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `lib/supabase.ts` | Tipos para structured_diagnoses |
| `app/api/parse-transcript/route.ts` | Autocodificación ICD-11 |
| `app/api/clinical-extractions/route.ts` | Guardar structured_diagnoses |
| `components/.../consultation-recording.tsx` | DiagnosisEditor en preview |
| `components/.../compliance-assistant.tsx` | Badges ICD |
| `components/.../report-verification.tsx` | Mostrar códigos |
| `components/.../final-report.tsx` | Códigos en PDF |
| `types/consultation.ts` | structuredDiagnoses |

---

## Archivos Nuevos

| Archivo | Propósito |
|---------|-----------|
| `types/icd.ts` | Tipos TypeScript |
| `lib/icd-token-manager.ts` | OAuth tokens |
| `lib/icd-api-client.ts` | Cliente API |
| `app/api/icd/autocode/route.ts` | Endpoint autocode |
| `app/api/icd/search/route.ts` | Endpoint búsqueda |
| `components/diagnoses/diagnosis-badge.tsx` | Badge ICD |
| `components/diagnoses/diagnosis-editor.tsx` | Editor inline |
| `components/diagnoses/diagnosis-selector.tsx` | Autocomplete |
| `supabase/migrations/20241219_add_icd_support.sql` | Migración |

---

## Backward Compatibility

1. Columna `diagnoses: string[]` se mantiene
2. APIs devuelven ambos formatos
3. UI maneja string y StructuredDiagnosis
4. Datos históricos funcionan sin cambios
5. TranscriptionValidator no se modifica

---

## Degradación Graceful

| Escenario | Comportamiento |
|-----------|----------------|
| API ICD no disponible | Diagnósticos sin código |
| Timeout | 5s, fallback a cache |
| Token expirado | Refresh automático |
| Sin resultados | Diagnóstico original |

---

## Orden de Implementación

1. ✅ **Fase 0**: Credenciales obtenidas
2. **Fase 1**: Infraestructura (tipos, migración, env vars)
3. **Fase 2**: Servicios API (token, client, endpoints)
4. **Fase 3**: Pipeline extracción (parse-transcript)
5. **Fase 4**: Componentes UI (badge, editor, selector)
6. **Fase 5**: Integración Paso 2 (extraction preview)
7. **Fase 6**: Integración pasos 3-5
8. **Fase 7**: Testing

---

## Fuera de Alcance (Fase futura)

- Dashboard estadísticas morbilidad
- Búsqueda pacientes por diagnóstico
- Integración en expedientes
- Soporte dual ICD-10 + ICD-11
