-- Migration: Add ICD (International Classification of Diseases) support
-- Date: 2024-12-19
-- Description: Adds ICD code caching and structured diagnoses for clinical extractions

-- ============================================================================
-- 1. Create ICD codes cache table
-- ============================================================================
-- This table caches ICD codes from the WHO API to reduce external API calls
-- and improve search performance

CREATE TABLE IF NOT EXISTS icd_codes_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ICD version: '10' for ICD-10, '11' for ICD-11
  icd_version VARCHAR(2) NOT NULL CHECK (icd_version IN ('10', '11')),
  -- The ICD code (e.g., 'J06.9', 'CA07.0')
  code VARCHAR(20) NOT NULL,
  -- Official title in English
  title TEXT NOT NULL,
  -- Spanish translation (from Accept-Language: es header)
  title_es TEXT,
  -- Foundation URI for ICD-11 codes
  uri TEXT,
  -- Parent code for hierarchy navigation
  parent_code VARCHAR(20),
  -- Keywords for local search
  search_keywords TEXT[],
  -- When this code was cached
  cached_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one entry per code per version
  UNIQUE(icd_version, code)
);

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_icd_codes_cache_code
  ON icd_codes_cache(code);

-- Index for full-text search on titles
CREATE INDEX IF NOT EXISTS idx_icd_codes_cache_title_search
  ON icd_codes_cache USING gin(to_tsvector('spanish', coalesce(title_es, title)));

-- Index for keyword array search
CREATE INDEX IF NOT EXISTS idx_icd_codes_cache_keywords
  ON icd_codes_cache USING gin(search_keywords);

-- ============================================================================
-- 2. Add structured_diagnoses column to clinical_extractions
-- ============================================================================
-- This adds structured diagnosis data while keeping the legacy 'diagnoses'
-- column for backward compatibility

ALTER TABLE clinical_extractions
ADD COLUMN IF NOT EXISTS structured_diagnoses JSONB[] DEFAULT '{}';

-- Comment explaining the structure
COMMENT ON COLUMN clinical_extractions.structured_diagnoses IS
'Array of structured diagnosis objects with ICD codes. Structure:
{
  "original_text": "bronquitis aguda",
  "icd11_code": "CA20.Z",
  "icd11_title": "Bronquitis aguda, no especificada",
  "icd11_uri": "http://id.who.int/icd/entity/...",
  "confidence": 0.94,
  "verified_by_doctor": true,
  "coded_at": "2024-12-19T10:30:00Z"
}';

-- ============================================================================
-- 3. Create materialized view for diagnosis statistics (optional, for future)
-- ============================================================================
-- Uncomment when ready to enable dashboard statistics

-- CREATE MATERIALIZED VIEW IF NOT EXISTS diagnosis_statistics AS
-- SELECT
--   ce.doctor_id,
--   diag->>'icd11_code' as icd11_code,
--   diag->>'icd11_title' as icd11_title,
--   diag->>'original_text' as original_text,
--   COUNT(*) as occurrence_count,
--   MAX(ce.extracted_at) as last_seen
-- FROM clinical_extractions ce,
--      LATERAL jsonb_array_elements(
--        CASE
--          WHEN ce.structured_diagnoses IS NOT NULL
--               AND array_length(ce.structured_diagnoses, 1) > 0
--          THEN array_to_json(ce.structured_diagnoses)::jsonb
--          ELSE '[]'::jsonb
--        END
--      ) as diag
-- WHERE diag->>'icd11_code' IS NOT NULL
-- GROUP BY ce.doctor_id, diag->>'icd11_code', diag->>'icd11_title', diag->>'original_text';

-- CREATE UNIQUE INDEX IF NOT EXISTS idx_diagnosis_stats_pk
--   ON diagnosis_statistics(doctor_id, icd11_code);

-- ============================================================================
-- 4. Grant permissions (adjust based on your RLS policies)
-- ============================================================================
-- The icd_codes_cache table should be readable by all authenticated users
-- but only writable by the server (service role)

ALTER TABLE icd_codes_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read cached codes
CREATE POLICY IF NOT EXISTS "Anyone can read ICD codes cache"
  ON icd_codes_cache
  FOR SELECT
  USING (true);

-- Note: INSERT/UPDATE should be done via service role (server-side only)
-- Do not create INSERT policies for anon/authenticated roles
