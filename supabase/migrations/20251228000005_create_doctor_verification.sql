-- Migration: Create Doctor Verification System
-- Description: Enables verification of doctor credentials and certifications

-- Doctor Verification table
CREATE TABLE public.doctor_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL UNIQUE REFERENCES public.doctors(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'under_review', 'verified', 'rejected')),
    cedula_professional TEXT, -- License number
    cedula_storage_path TEXT, -- Private bucket path
    specialty_certificate_path TEXT,
    additional_documents JSONB DEFAULT '[]', -- [{path, type, uploaded_at}]
    rejection_reason TEXT,
    rejection_details JSONB,
    reviewed_by UUID REFERENCES auth.users(id),
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_doctor_verifications_status ON public.doctor_verifications(status);
CREATE INDEX idx_doctor_verifications_doctor ON public.doctor_verifications(doctor_id);

-- RLS
ALTER TABLE public.doctor_verifications ENABLE ROW LEVEL SECURITY;

-- Doctors can view and update their own verification
CREATE POLICY "Doctors can manage their verification"
ON public.doctor_verifications FOR ALL
TO authenticated
USING (
    doctor_id IN (
        SELECT id FROM doctors WHERE user_id = auth.uid()
    )
);

-- Admins can view all verifications
CREATE POLICY "Admins can view all verifications"
ON public.doctor_verifications FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM doctors
        WHERE user_id = auth.uid() AND doctor_role = 'admin'
    )
);

-- Admins can update all verifications (for review)
CREATE POLICY "Admins can update verifications"
ON public.doctor_verifications FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM doctors
        WHERE user_id = auth.uid() AND doctor_role = 'admin'
    )
);

-- Trigger to update updated_at
CREATE TRIGGER update_doctor_verifications_updated_at
    BEFORE UPDATE ON public.doctor_verifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create verification record when doctor is created
CREATE OR REPLACE FUNCTION public.create_doctor_verification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.doctor_verifications (doctor_id, status)
    VALUES (NEW.id, 'pending');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create verification on doctor insert
CREATE TRIGGER create_verification_on_doctor_insert
    AFTER INSERT ON public.doctors
    FOR EACH ROW
    EXECUTE FUNCTION public.create_doctor_verification();
