# Plan: Integración WHO ICD API en EzyAI

## Resumen Ejecutivo

Integrar la API de Clasificación Internacional de Enfermedades (ICD-11) de la OMS para convertir los diagnósticos de texto libre a códigos médicos estandarizados, enfocándose inicialmente en el wizard de consulta.

**Alcance inicial:** Solo wizard de consulta (autocodificación + selector + badges)
**Versión ICD:** ICD-11 (2024-01) con soporte español

---

## Fase 0: Obtener Credenciales WHO ICD API

### Pasos para registrarse:
1. Ir a https://icd.who.int/icdapi
2. Click en "Register" o "Login"
3. Crear cuenta con email institucional (preferido) o personal
4. Una vez logueado, click en **"View API access key(s)"**
5. Copiar `clientId` y `clientSecret`

**Nota:** La API es gratuita para uso no comercial. Los tokens expiran en ~1 hora pero se renuevan automáticamente.

---

## Fase 1: Infraestructura Base

### 1.1 Variables de Entorno
**Archivo:** `.env.local`
```
WHO_ICD_CLIENT_ID=<tu-client-id>
WHO_ICD_CLIENT_SECRET=<tu-client-secret>
WHO_ICD_TOKEN_URL=https://icdaccessmanagement.who.int/connect/token
WHO_ICD_API_URL=https://id.who.int/icd
WHO_ICD_RELEASE=2024-01
```

### 1.2 Tipos TypeScript
**Crear:** `types/icd.ts`
- `StructuredDiagnosis` - Diagnóstico con código ICD
- `ICDSearchResult` - Resultado de búsqueda
- `ICDAutocodeResult` - Resultado de autocodificación
- `ICDTokenResponse` - Respuesta OAuth

### 1.3 Migración de Base de Datos
**Crear:** `supabase/migrations/20241218_add_icd_support.sql`

```sql
-- Tabla cache de códigos ICD
CREATE TABLE icd_codes_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icd_version VARCHAR(2) NOT NULL,  -- '10' o '11'
  code VARCHAR(20) NOT NULL,
  title TEXT NOT NULL,
  title_es TEXT,
  uri TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(icd_version, code)
);

-- Nueva columna en clinical_extractions (mantiene diagnoses para backward compat)
ALTER TABLE clinical_extractions
ADD COLUMN structured_diagnoses JSONB[] DEFAULT '{}';

-- Vista materializada para estadísticas
CREATE MATERIALIZED VIEW diagnosis_statistics AS
SELECT doctor_id, icd10_code, icd10_title, COUNT(*) as occurrence_count
FROM clinical_extractions, jsonb_array_elements(structured_diagnoses) as diag
WHERE diag->>'icd10_code' IS NOT NULL
GROUP BY doctor_id, icd10_code, icd10_title;
```

### 1.4 Actualizar Tipos Supabase
**Modificar:** `lib/supabase.ts`
- Agregar tipo `icd_codes_cache` a Database
- Agregar `structured_diagnoses?: StructuredDiagnosis[]` a `clinical_extractions`

---

## Fase 2: Servicios de API ICD

### 2.1 Gestor de Tokens OAuth
**Crear:** `lib/icd-token-manager.ts`
- Singleton para manejo de tokens
- Cache en memoria con refresh 5min antes de expiración
- Retry automático en 401

### 2.2 Cliente API ICD
**Crear:** `lib/icd-api-client.ts`
- `autocodeToICD11(text)` - Autocodificar texto a ICD-11
- `searchICD11(query)` - Buscar en ICD-11 con autocomplete
- `searchICD10(query)` - Buscar en ICD-10
- Cache local en Supabase para reducir llamadas API

### 2.3 Endpoints API Next.js
**Crear:** `app/api/icd/autocode/route.ts`
```typescript
POST { text: string } → { result: ICDAutocodeResult, fallback: boolean }
```

**Crear:** `app/api/icd/search/route.ts`
```typescript
GET ?q=query&version=11&limit=10 → { results: ICDSearchResult[] }
```

---

## Fase 3: Pipeline de Extracción Mejorado

### 3.1 Integrar Autocodificación en parse-transcript
**Modificar:** `app/api/parse-transcript/route.ts`

Después de extracción Gemini, autocodificar cada diagnóstico:
```typescript
const structuredDiagnoses = await Promise.all(
  sanitized.diagnoses.map(async (text) => {
    const icd = await autocodeToICD11(text)
    return {
      original_text: text,
      icd11_code: icd?.entity?.code || null,
      icd11_uri: icd?.entity?.uri || null,
      confidence: icd?.score || 0,
      verified_by_doctor: false
    }
  })
)
```

### 3.2 Actualizar clinical-extractions
**Modificar:** `app/api/clinical-extractions/route.ts`
- Guardar `structured_diagnoses` junto con `diagnoses` (legacy)

---

## Fase 4: Componentes UI

### 4.1 Selector de Diagnósticos
**Crear:** `components/diagnoses/diagnosis-selector.tsx`
- Autocomplete con búsqueda ICD
- Basado en Command (cmdk) + Popover existentes
- Debounce 300ms en búsquedas
- Muestra código + título

### 4.2 Badge de Diagnóstico
**Crear:** `components/diagnoses/diagnosis-badge.tsx`
- Muestra diagnóstico con código ICD
- Indicador de verificación (checkmark si verificado por doctor)
- Tooltip con detalles completos
- Maneja tanto string legacy como StructuredDiagnosis

---

## Fase 5: Integración en Wizard de Consulta

**Modificar:** `components/appointments/consultation-steps/consultation-recording.tsx`
- Actualizar preview de extracción para mostrar DiagnosisBadge
- Mostrar código ICD-11 + confianza junto a cada diagnóstico

**Modificar:** `components/appointments/consultation-steps/compliance-assistant.tsx`
- Agregar DiagnosisSelector para agregar/editar diagnósticos
- Permitir búsqueda y selección de códigos ICD-11
- Botón para marcar como "verificado por doctor"

**Modificar:** `components/appointments/consultation-steps/report-verification.tsx`
- Mostrar diagnósticos estructurados con sus códigos
- Permitir edición final antes de guardar

**Modificar:** `components/appointments/consultation-steps/final-report.tsx`
- Formatear sección de diagnósticos con códigos ICD-11 en reporte final
- Incluir códigos en PDF/impresión

### Fuera de Alcance (Fase 2 futura)
- Dashboard con estadísticas de morbilidad
- Búsqueda de pacientes por código diagnóstico
- Integración en expedientes/historial

---

## Fase 6: Actualización de Tipos

**Modificar:** `types/consultation.ts`
- Agregar `structuredDiagnoses?: StructuredDiagnosis[]` a `extractionPreview`

---

## Fase 7: Testing

### 7.1 Tests Unitarios
**Crear:** `tests/unit/lib/icd-api-client.test.ts`
- Token caching
- Autocode success/failure
- Search con cache hit/miss

### 7.2 Tests de Integración
**Crear:** `tests/integration/api/icd.test.ts`
- Endpoints /api/icd/*
- Parse-transcript con ICD coding

### 7.3 MSW Handlers
**Modificar:** `tests/setup/handlers.ts`
- Mock WHO ICD API responses

---

## Archivos Críticos a Modificar

| Archivo | Cambio |
|---------|--------|
| `lib/supabase.ts` | Tipos para structured_diagnoses y icd_codes_cache |
| `app/api/parse-transcript/route.ts` | Integrar autocodificación ICD-11 |
| `app/api/clinical-extractions/route.ts` | Guardar structured_diagnoses |
| `components/appointments/consultation-steps/consultation-recording.tsx` | DiagnosisBadge en preview |
| `components/appointments/consultation-steps/compliance-assistant.tsx` | DiagnosisSelector |
| `components/appointments/consultation-steps/report-verification.tsx` | Mostrar códigos ICD |
| `components/appointments/consultation-steps/final-report.tsx` | Códigos en reporte final |

---

## Archivos Nuevos a Crear

| Archivo | Propósito |
|---------|-----------|
| `types/icd.ts` | Tipos TypeScript para ICD |
| `lib/icd-token-manager.ts` | Gestión OAuth tokens |
| `lib/icd-api-client.ts` | Cliente API ICD-11 |
| `app/api/icd/autocode/route.ts` | Endpoint autocodificación |
| `app/api/icd/search/route.ts` | Endpoint búsqueda |
| `components/diagnoses/diagnosis-selector.tsx` | Autocomplete ICD |
| `components/diagnoses/diagnosis-badge.tsx` | Badge diagnóstico |
| `supabase/migrations/20241218_add_icd_support.sql` | Migración BD |

---

## Consideraciones de Backward Compatibility

1. **Base de datos**: Columna `diagnoses: string[]` se mantiene intacta
2. **API responses**: Devuelven tanto `diagnoses` como `structuredDiagnoses`
3. **UI**: DiagnosisBadge maneja ambos formatos (string y objeto)
4. **Datos históricos**: Continúan funcionando sin cambios

---

## Estrategia de Degradación Graceful

| Escenario | Comportamiento |
|-----------|----------------|
| API ICD no disponible | Devolver diagnósticos sin código, log warning |
| Timeout de red | 5s timeout, fallback a cache local |
| Token expirado | Refresh automático, retry 1x |
| Sin resultados | Mostrar diagnóstico original sin código |

---

## Orden de Implementación Sugerido

1. **Fase 0**: Registrarse en WHO ICD API y obtener credenciales
2. **Fase 1**: Infraestructura (tipos, migración BD, env vars)
3. **Fase 2**: Servicios API (token manager, client, endpoints)
4. **Fase 3**: Pipeline extracción (parse-transcript, clinical-extractions)
5. **Fase 4**: Componentes UI (badge, selector)
6. **Fase 5**: Integración en wizard de consulta
7. **Fase 6**: Testing

---

## Prerequisito

ClientId: bbd8a3af-159f-4949-98d3-b415a7e83a1e_e8c33080-38c9-4537-bc2c-a7fc723e0853
ClientSecret: 47u5nYnQeD74JM6eGUkuH0p5KyEKqObJ0TYNW3vSa1U=


