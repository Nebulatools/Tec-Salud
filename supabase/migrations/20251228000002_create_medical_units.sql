-- Migration: Create Medical Units (Consultorios)
-- Description: Enables doctors to manage their consultation offices/clinics

-- Medical Units table
CREATE TABLE public.medical_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address_line TEXT,
    coordinates POINT, -- (lat, long)
    logo_url TEXT,
    billing_info JSONB DEFAULT '{}', -- RFC, razón social, etc.
    operating_hours JSONB DEFAULT '{}', -- {"monday": {"open": "09:00", "close": "18:00"}}
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Doctor-Unit relationship table
CREATE TABLE public.doctor_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.medical_units(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(doctor_id, unit_id)
);

-- Indexes
CREATE INDEX idx_doctor_units_doctor ON public.doctor_units(doctor_id);
CREATE INDEX idx_doctor_units_unit ON public.doctor_units(unit_id);

-- RLS
ALTER TABLE public.medical_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_units ENABLE ROW LEVEL SECURITY;

-- Doctors can see units they belong to
CREATE POLICY "Doctors can view their units"
ON public.medical_units FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT unit_id FROM doctor_units du
        JOIN doctors d ON du.doctor_id = d.id
        WHERE d.user_id = auth.uid()
    )
);

-- Owners can manage their units (INSERT)
CREATE POLICY "Owners can insert units"
ON public.medical_units FOR INSERT
TO authenticated
WITH CHECK (true);

-- Owners can update their units
CREATE POLICY "Owners can update their units"
ON public.medical_units FOR UPDATE
TO authenticated
USING (
    id IN (
        SELECT unit_id FROM doctor_units du
        JOIN doctors d ON du.doctor_id = d.id
        WHERE d.user_id = auth.uid() AND du.role = 'owner'
    )
);

-- Owners can delete their units
CREATE POLICY "Owners can delete their units"
ON public.medical_units FOR DELETE
TO authenticated
USING (
    id IN (
        SELECT unit_id FROM doctor_units du
        JOIN doctors d ON du.doctor_id = d.id
        WHERE d.user_id = auth.uid() AND du.role = 'owner'
    )
);

-- Doctor units policies
CREATE POLICY "Doctors can view their unit memberships"
ON public.doctor_units FOR SELECT
TO authenticated
USING (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    OR
    unit_id IN (
        SELECT unit_id FROM doctor_units du
        JOIN doctors d ON du.doctor_id = d.id
        WHERE d.user_id = auth.uid() AND du.role IN ('owner', 'admin')
    )
);

CREATE POLICY "Owners and admins can manage unit memberships"
ON public.doctor_units FOR ALL
TO authenticated
USING (
    unit_id IN (
        SELECT unit_id FROM doctor_units du
        JOIN doctors d ON du.doctor_id = d.id
        WHERE d.user_id = auth.uid() AND du.role IN ('owner', 'admin')
    )
);

-- Trigger to update updated_at
CREATE TRIGGER update_medical_units_updated_at
    BEFORE UPDATE ON public.medical_units
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create the function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
