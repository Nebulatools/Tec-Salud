# Guía de Configuración: WHO ICD API Integration

Esta guía te explica cómo configurar y probar la integración de códigos ICD-11 de la OMS en EzyAI.

---

## Paso 1: Ejecutar la Migración en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **SQL Editor** (icono de código en el sidebar izquierdo)
3. Crea una nueva query y pega el siguiente SQL:

```sql
-- ============================================================================
-- Migración: Soporte ICD-11 (WHO International Classification of Diseases)
-- ============================================================================

-- 1. Crear tabla de cache para códigos ICD
CREATE TABLE IF NOT EXISTS icd_codes_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icd_version VARCHAR(2) NOT NULL CHECK (icd_version IN ('10', '11')),
  code VARCHAR(20) NOT NULL,
  title TEXT NOT NULL,
  title_es TEXT,
  uri TEXT,
  parent_code VARCHAR(20),
  search_keywords TEXT[],
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(icd_version, code)
);

-- 2. Crear índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_icd_codes_cache_code
  ON icd_codes_cache(code);

CREATE INDEX IF NOT EXISTS idx_icd_codes_cache_title_search
  ON icd_codes_cache USING gin(to_tsvector('spanish', coalesce(title_es, title)));

CREATE INDEX IF NOT EXISTS idx_icd_codes_cache_keywords
  ON icd_codes_cache USING gin(search_keywords);

-- 3. Agregar columna structured_diagnoses a clinical_extractions
ALTER TABLE clinical_extractions
ADD COLUMN IF NOT EXISTS structured_diagnoses JSONB[] DEFAULT '{}';

-- 4. Comentario descriptivo
COMMENT ON COLUMN clinical_extractions.structured_diagnoses IS
'Array de diagnósticos estructurados con códigos ICD. Estructura:
{
  "original_text": "bronquitis aguda",
  "icd11_code": "CA20.Z",
  "icd11_title": "Bronquitis aguda, no especificada",
  "icd11_uri": "http://id.who.int/icd/entity/...",
  "confidence": 0.94,
  "verified_by_doctor": true,
  "coded_at": "2024-12-19T10:30:00Z"
}';

-- 5. Habilitar RLS en la tabla de cache
ALTER TABLE icd_codes_cache ENABLE ROW LEVEL SECURITY;

-- 6. Política: Todos pueden leer los códigos cacheados
CREATE POLICY "Anyone can read ICD codes cache"
  ON icd_codes_cache
  FOR SELECT
  USING (true);

-- 7. Política: Servicio puede insertar (para cache desde API)
-- Nota: Las inserciones se hacen con service_role key desde el servidor
```

4. Haz clic en **Run** para ejecutar la migración
5. Verifica que no haya errores en la consola

---

## Paso 2: Verificar Variables de Entorno

Asegúrate de que tu archivo `.env.local` tenga las siguientes variables:

```bash
# WHO ICD API - International Classification of Diseases
WHO_ICD_CLIENT_ID=bbd8a3af-159f-4949-98d3-b415a7e83a1e_e8c33080-38c9-4537-bc2c-a7fc723e0853
WHO_ICD_CLIENT_SECRET=47u5nYnQeD74JM6eGUkuH0p5KyEKqObJ0TYNW3vSa1U=
WHO_ICD_TOKEN_URL=https://icdaccessmanagement.who.int/connect/token
WHO_ICD_API_URL=https://id.who.int/icd
WHO_ICD_RELEASE=2024-01
```

---

## Paso 3: Probar la API de ICD

### 3.1 Probar Autocodificación

Inicia el servidor de desarrollo:
```bash
pnpm dev
```

Prueba el endpoint de autocodificación con curl o tu herramienta favorita:

```bash
# Autocodificar un diagnóstico
curl -X POST http://localhost:3000/api/icd/autocode \
  -H "Content-Type: application/json" \
  -d '{"text": "bronquitis aguda"}'
```

Respuesta esperada:
```json
{
  "success": true,
  "result": {
    "searchText": "bronquitis aguda",
    "entity": {
      "code": "CA20.Z",
      "title": "Bronquitis aguda, no especificada",
      "uri": "http://id.who.int/icd/..."
    },
    "score": 0.94,
    "isAmbiguous": false
  },
  "fallback": false
}
```

### 3.2 Probar Búsqueda

```bash
# Buscar códigos ICD
curl "http://localhost:3000/api/icd/search?q=diabetes&limit=5"
```

Respuesta esperada:
```json
{
  "success": true,
  "result": [
    {
      "code": "5A10",
      "title": "Diabetes mellitus tipo 1",
      "uri": "...",
      "matchScore": 0.95
    },
    {
      "code": "5A11",
      "title": "Diabetes mellitus tipo 2",
      "uri": "...",
      "matchScore": 0.92
    }
  ],
  "fallback": false
}
```

### 3.3 Probar Autocodificación en Batch

```bash
# Autocodificar múltiples diagnósticos
curl -X POST http://localhost:3000/api/icd/autocode \
  -H "Content-Type: application/json" \
  -d '{"texts": ["bronquitis", "diabetes tipo 2", "hipertensión arterial"]}'
```

---

## Paso 4: Probar en el Wizard de Consulta

1. Inicia una nueva consulta con un paciente
2. Graba una consulta de prueba mencionando diagnósticos como:
   - "bronquitis aguda"
   - "infección de vías respiratorias"
   - "diabetes mellitus"
3. Después de la transcripción, en el paso de **Extraction Preview**, deberías ver:
   - Los diagnósticos con badges que muestran códigos ICD-11
   - Indicador de confianza (porcentaje)
   - Checkbox para verificar cada diagnóstico
   - Botón de editar para cambiar el código

---

## Paso 5: Usar los Componentes

### DiagnosisEditor (para formularios editables)

```tsx
import { DiagnosisEditor } from "@/components/diagnoses"
import type { StructuredDiagnosis } from "@/types/icd"

function MyComponent() {
  const [diagnoses, setDiagnoses] = useState<StructuredDiagnosis[]>([])

  return (
    <DiagnosisEditor
      diagnoses={diagnoses}
      onUpdate={setDiagnoses}
      editable={true}
      showVerifyAll={true}
    />
  )
}
```

### DiagnosisBadge (para mostrar un diagnóstico)

```tsx
import { DiagnosisBadge } from "@/components/diagnoses"

function MyComponent({ diagnosis }) {
  return (
    <DiagnosisBadge
      diagnosis={diagnosis}
      showConfidence={true}
      showVerified={true}
      onEdit={() => setEditing(true)}
    />
  )
}
```

### DiagnosisPreview (para reportes/vistas de solo lectura)

```tsx
import { DiagnosisPreview } from "@/components/diagnoses"

function ReportSection({ diagnoses }) {
  return (
    <DiagnosisPreview
      diagnoses={diagnoses}
      format="table" // o "list" o "inline"
    />
  )
}
```

---

## Troubleshooting

### Error: "WHO ICD API credentials not configured"
- Verifica que las variables de entorno estén en `.env.local`
- Reinicia el servidor de desarrollo después de agregar variables

### Error: "Failed to obtain WHO ICD API token"
- Las credenciales pueden haber expirado
- Ve a https://icd.who.int/icdapi y genera nuevas credenciales
- Actualiza `WHO_ICD_CLIENT_ID` y `WHO_ICD_CLIENT_SECRET`

### Los códigos ICD no aparecen
- La API de WHO puede estar lenta (timeout de 5 segundos)
- Revisa la consola del servidor para ver logs de error
- El sistema usa fallback graceful: diagnósticos sin código aparecen con advertencia

### Tabla icd_codes_cache no existe
- Ejecuta la migración SQL del Paso 1
- Verifica en Supabase Dashboard → Table Editor que la tabla exista

---

## Archivos Creados/Modificados

### Nuevos archivos:
- `types/icd.ts` - Tipos TypeScript para ICD
- `lib/icd-token-manager.ts` - Gestión de tokens OAuth
- `lib/icd-api-client.ts` - Cliente API ICD-11
- `app/api/icd/autocode/route.ts` - Endpoint autocodificación
- `app/api/icd/search/route.ts` - Endpoint búsqueda
- `components/diagnoses/diagnosis-badge.tsx` - Badge de diagnóstico
- `components/diagnoses/diagnosis-selector.tsx` - Selector autocomplete
- `components/diagnoses/diagnosis-editor.tsx` - Editor de diagnósticos
- `components/diagnoses/index.ts` - Exports

### Archivos modificados:
- `.env.local` - Variables de entorno WHO API
- `lib/supabase.ts` - Tipos para nuevas tablas/columnas
- `app/api/parse-transcript/route.ts` - Integración autocodificación
- `consultation-recording.tsx` - DiagnosisEditor integrado en extraction preview

---

## Referencia API

### POST /api/icd/autocode
Autocodifica texto a código ICD-11.

**Request Body:**
```json
{ "text": "bronquitis" }
// o para batch:
{ "texts": ["bronquitis", "diabetes"] }
```

**Response:**
```json
{
  "success": true,
  "result": {
    "searchText": "bronquitis",
    "entity": { "code": "CA20.Z", "title": "...", "uri": "..." },
    "score": 0.94,
    "isAmbiguous": false
  },
  "fallback": false
}
```

### GET /api/icd/search
Busca códigos ICD-11 con autocomplete.

**Query Params:**
- `q` (required): Texto de búsqueda (mínimo 2 caracteres)
- `limit` (optional): Máximo de resultados (default: 10, max: 25)

**Response:**
```json
{
  "success": true,
  "result": [
    { "code": "5A10", "title": "Diabetes mellitus tipo 1", "uri": "...", "matchScore": 0.95 }
  ],
  "fallback": false
}
```
