-- Migration: Strict RLS Policies
-- Description: Hardens Row Level Security policies for multi-tenant data isolation

-- Note: We use IF EXISTS to make this migration idempotent
-- Drop existing permissive policies if they exist
DROP POLICY IF EXISTS "allow_all_medical_reports" ON public.medical_reports;
DROP POLICY IF EXISTS "allow_all_appointments" ON public.appointments;
DROP POLICY IF EXISTS "allow_all_patients" ON public.patients;

-- Medical Reports: Strict access control
-- Drop existing policies first to replace them
DROP POLICY IF EXISTS "Doctors can manage reports they created" ON public.medical_reports;
DROP POLICY IF EXISTS "Patients can view their own reports" ON public.medical_reports;

CREATE POLICY "Doctors can manage reports they created"
ON public.medical_reports FOR ALL
TO authenticated
USING (
    doctor_id IN (
        SELECT id FROM doctors WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Patients can view their own reports"
ON public.medical_reports FOR SELECT
TO authenticated
USING (
    patient_id IN (
        SELECT p.id FROM patients p
        WHERE p.user_id = auth.uid()
    )
);

-- Appointments: Doctor and patient access
DROP POLICY IF EXISTS "Doctors can manage their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can view and update their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can cancel their appointments" ON public.appointments;

CREATE POLICY "Doctors can manage their appointments"
ON public.appointments FOR ALL
TO authenticated
USING (
    doctor_id IN (
        SELECT id FROM doctors WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Patients can view their appointments"
ON public.appointments FOR SELECT
TO authenticated
USING (
    patient_id IN (
        SELECT p.id FROM patients p
        WHERE p.user_id = auth.uid()
    )
);

CREATE POLICY "Patients can cancel their appointments"
ON public.appointments FOR UPDATE
TO authenticated
USING (
    patient_id IN (
        SELECT p.id FROM patients p
        WHERE p.user_id = auth.uid()
    )
)
WITH CHECK (
    -- Only allow status changes to 'Cancelada'
    status = 'Cancelada'
);

-- Patients: Doctor can only see linked patients
DROP POLICY IF EXISTS "Doctors can view their linked patients" ON public.patients;
DROP POLICY IF EXISTS "Patients can view and update own profile" ON public.patients;

CREATE POLICY "Doctors can view their linked patients"
ON public.patients FOR SELECT
TO authenticated
USING (
    -- Doctor created the patient
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    OR
    -- Patient has accepted link with doctor
    id IN (
        SELECT p.id FROM patients p
        JOIN doctor_patient_links l ON l.patient_user_id = p.user_id
        JOIN doctors d ON l.doctor_id = d.id
        WHERE d.user_id = auth.uid() AND l.status = 'accepted'
    )
);

CREATE POLICY "Patients can view and update own profile"
ON public.patients FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Clinical Extractions: Doctor and patient access
DROP POLICY IF EXISTS "Doctors can manage extractions from their appointments" ON public.clinical_extractions;
DROP POLICY IF EXISTS "Patients can view their own extractions" ON public.clinical_extractions;

CREATE POLICY "Doctors can manage extractions from their appointments"
ON public.clinical_extractions FOR ALL
TO authenticated
USING (
    doctor_id IN (
        SELECT id FROM doctors WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Patients can view their own extractions"
ON public.clinical_extractions FOR SELECT
TO authenticated
USING (
    patient_id IN (
        SELECT id FROM patients WHERE user_id = auth.uid()
    )
);
