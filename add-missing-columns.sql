-- Agregar TODAS las columnas faltantes a medical_reports
ALTER TABLE medical_reports 
ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE medical_reports 
ADD COLUMN IF NOT EXISTS content TEXT;

ALTER TABLE medical_reports 
ADD COLUMN IF NOT EXISTS ai_suggestions TEXT[];

ALTER TABLE medical_reports 
ADD COLUMN IF NOT EXISTS compliance_status TEXT;

ALTER TABLE medical_reports 
ADD COLUMN IF NOT EXISTS original_transcript TEXT;

-- Verificar que se agregaron todas las columnas
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'medical_reports' 
AND column_name IN ('title', 'content', 'ai_suggestions', 'compliance_status', 'original_transcript');