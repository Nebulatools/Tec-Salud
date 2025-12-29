-- Migration: Create Prescriptions (Recetas Médicas)
-- Description: Enables doctors to create and manage medical prescriptions

-- Prescriptions table
CREATE TABLE public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    medications JSONB NOT NULL DEFAULT '[]',
    -- Example medication structure:
    -- [{
    --   "brand_name": "Tempra",
    --   "generic_name": "Paracetamol",
    --   "dosage": "500mg",
    --   "frequency": "Cada 8 horas",
    --   "duration": "3 días",
    --   "instructions": "Tomar con alimentos",
    --   "quantity": "30 tabletas"
    -- }]
    diagnosis TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'signed', 'delivered', 'cancelled')),
    signed_url TEXT, -- URL to signed PDF in storage
    signed_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    valid_until DATE, -- Prescription expiration
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_prescriptions_doctor ON public.prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX idx_prescriptions_appointment ON public.prescriptions(appointment_id);
CREATE INDEX idx_prescriptions_status ON public.prescriptions(status);
CREATE INDEX idx_prescriptions_created_at ON public.prescriptions(created_at DESC);

-- RLS
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- Doctors can manage prescriptions they created
CREATE POLICY "Doctors can manage their prescriptions"
ON public.prescriptions FOR ALL
TO authenticated
USING (
    doctor_id IN (
        SELECT id FROM doctors WHERE user_id = auth.uid()
    )
);

-- Patients can view their prescriptions
CREATE POLICY "Patients can view their prescriptions"
ON public.prescriptions FOR SELECT
TO authenticated
USING (
    patient_id IN (
        SELECT id FROM patients WHERE user_id = auth.uid()
    )
);

-- Trigger to update updated_at
CREATE TRIGGER update_prescriptions_updated_at
    BEFORE UPDATE ON public.prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
