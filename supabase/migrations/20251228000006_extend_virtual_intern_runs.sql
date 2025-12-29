-- Migration: Extend virtual_intern_runs for all AI background jobs
-- Description: Reuses existing table that already has: id, appointment_id, status, findings, alerts, suggestions
-- This approach maintains consistency with existing system while adding support for all AI job types

-- Add new columns for extended job types
ALTER TABLE public.virtual_intern_runs
ADD COLUMN IF NOT EXISTS job_type TEXT DEFAULT 'virtual_intern'
    CHECK (job_type IN ('virtual_intern', 'transcription', 'diarization', 'enrichment', 'soap_generation'));

ALTER TABLE public.virtual_intern_runs
ADD COLUMN IF NOT EXISTS audio_storage_path TEXT;

ALTER TABLE public.virtual_intern_runs
ADD COLUMN IF NOT EXISTS input_data JSONB DEFAULT '{}';

ALTER TABLE public.virtual_intern_runs
ADD COLUMN IF NOT EXISTS error_message TEXT;

ALTER TABLE public.virtual_intern_runs
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

ALTER TABLE public.virtual_intern_runs
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;

ALTER TABLE public.virtual_intern_runs
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

ALTER TABLE public.virtual_intern_runs
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Note: completed_at already exists in the table

-- Add appointment_id column if not exists (for job types that don't use existing patient flow)
ALTER TABLE public.virtual_intern_runs
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;

-- Update existing status column default if needed
-- Existing enum: pending, processing, succeeded, failed (which matches our needs)

-- Indexes for job queue processing
CREATE INDEX IF NOT EXISTS idx_vir_runs_job_type ON public.virtual_intern_runs(job_type);
CREATE INDEX IF NOT EXISTS idx_vir_runs_queue ON public.virtual_intern_runs(status, priority DESC, requested_at ASC)
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_vir_runs_appointment ON public.virtual_intern_runs(appointment_id);

-- RLS already enabled on virtual_intern_runs
-- Add policy for doctors to view their appointment AI jobs (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'virtual_intern_runs'
        AND policyname = 'Doctors can view their appointment AI jobs'
    ) THEN
        CREATE POLICY "Doctors can view their appointment AI jobs"
        ON public.virtual_intern_runs FOR SELECT
        TO authenticated
        USING (
            appointment_id IN (
                SELECT a.id FROM appointments a
                JOIN doctors d ON a.doctor_id = d.id
                WHERE d.user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Add insert policy for creating jobs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'virtual_intern_runs'
        AND policyname = 'Doctors can create AI jobs for their appointments'
    ) THEN
        CREATE POLICY "Doctors can create AI jobs for their appointments"
        ON public.virtual_intern_runs FOR INSERT
        TO authenticated
        WITH CHECK (
            appointment_id IN (
                SELECT a.id FROM appointments a
                JOIN doctors d ON a.doctor_id = d.id
                WHERE d.user_id = auth.uid()
            )
            OR
            doctor_id IN (
                SELECT id FROM doctors WHERE user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Comment on table to document the change
COMMENT ON TABLE public.virtual_intern_runs IS 'Unified AI processing jobs table. Originally for virtual intern analysis, now extended to support all AI job types: transcription, diarization, enrichment, and SOAP generation.';
