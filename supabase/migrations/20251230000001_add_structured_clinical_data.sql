-- Migration: Add structured clinical data to medical_reports
-- This enables deterministic compliance checking without regex parsing

-- Add structured_data column to medical_reports
ALTER TABLE medical_reports
ADD COLUMN IF NOT EXISTS structured_data JSONB DEFAULT NULL;

-- Add index for faster queries on structured data
CREATE INDEX IF NOT EXISTS idx_medical_reports_structured_data
ON medical_reports USING GIN (structured_data);

-- Add compliance_score column for quick filtering
ALTER TABLE medical_reports
ADD COLUMN IF NOT EXISTS compliance_score INTEGER DEFAULT NULL;

-- Comment explaining the schema
COMMENT ON COLUMN medical_reports.structured_data IS
'Structured clinical report data following ClinicalReportData schema.
Used for deterministic compliance checking and markdown rendering.
Schema includes: paciente, medico, consulta, motivo_consulta, diagnosticos,
signos_vitales, exploracion_fisica, plan_tratamiento, seguimiento,
alergias, antecedentes, medicamentos_actuales, etc.';

COMMENT ON COLUMN medical_reports.compliance_score IS
'Compliance score 0-100 based on presence of required fields in structured_data';

-- Expand clinical_extractions to store full structured data
-- (keeping backward compatibility with existing columns)
ALTER TABLE clinical_extractions
ADD COLUMN IF NOT EXISTS structured_report JSONB DEFAULT NULL;

COMMENT ON COLUMN clinical_extractions.structured_report IS
'Full ClinicalReportData extracted from transcript, used as source for medical_reports.structured_data';
