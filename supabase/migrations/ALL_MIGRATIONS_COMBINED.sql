-- ============================================
-- ALL MIGRATIONS COMBINED - Run in Supabase Dashboard
-- URL: https://supabase.com/dashboard/project/didbxinquugseweufvpr/sql
-- ============================================

-- ============================================
-- 1. Helper function (needed by other migrations)
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. QR Links (for patient acquisition)
-- ============================================
CREATE TABLE IF NOT EXISTS public.qr_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    campaign_type TEXT NOT NULL CHECK (campaign_type IN ('specialty_survey', 'quick_profile', 'appointment')),
    target_resource_id UUID,
    redirect_url TEXT NOT NULL,
    scans_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_links_doctor_id ON public.qr_links(doctor_id);
CREATE INDEX IF NOT EXISTS idx_qr_links_created_at ON public.qr_links(created_at DESC);

ALTER TABLE public.qr_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Doctors can manage their own QR links" ON public.qr_links;
CREATE POLICY "Doctors can manage their own QR links"
ON public.qr_links FOR ALL TO authenticated
USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Public can read active QR links for scanning" ON public.qr_links;
CREATE POLICY "Public can read active QR links for scanning"
ON public.qr_links FOR SELECT TO anon
USING (expires_at IS NULL OR expires_at > NOW());

CREATE OR REPLACE FUNCTION public.increment_qr_scan(qr_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.qr_links SET scans_count = scans_count + 1 WHERE id = qr_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_qr_scan(UUID) TO anon, authenticated;

-- ============================================
-- 3. Medical Units (Consultorios)
-- ============================================
CREATE TABLE IF NOT EXISTS public.medical_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address_line TEXT,
    coordinates POINT,
    logo_url TEXT,
    billing_info JSONB DEFAULT '{}',
    operating_hours JSONB DEFAULT '{}',
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.doctor_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.medical_units(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(doctor_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_doctor_units_doctor ON public.doctor_units(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_units_unit ON public.doctor_units(unit_id);

ALTER TABLE public.medical_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Doctors can view their units" ON public.medical_units;
CREATE POLICY "Doctors can view their units"
ON public.medical_units FOR SELECT TO authenticated
USING (id IN (SELECT unit_id FROM doctor_units du JOIN doctors d ON du.doctor_id = d.id WHERE d.user_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can insert units" ON public.medical_units;
CREATE POLICY "Owners can insert units"
ON public.medical_units FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Owners can update their units" ON public.medical_units;
CREATE POLICY "Owners can update their units"
ON public.medical_units FOR UPDATE TO authenticated
USING (id IN (SELECT unit_id FROM doctor_units du JOIN doctors d ON du.doctor_id = d.id WHERE d.user_id = auth.uid() AND du.role = 'owner'));

DROP POLICY IF EXISTS "Owners can delete their units" ON public.medical_units;
CREATE POLICY "Owners can delete their units"
ON public.medical_units FOR DELETE TO authenticated
USING (id IN (SELECT unit_id FROM doctor_units du JOIN doctors d ON du.doctor_id = d.id WHERE d.user_id = auth.uid() AND du.role = 'owner'));

DROP POLICY IF EXISTS "Doctors can view their unit memberships" ON public.doctor_units;
CREATE POLICY "Doctors can view their unit memberships"
ON public.doctor_units FOR SELECT TO authenticated
USING (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    OR unit_id IN (SELECT unit_id FROM doctor_units du JOIN doctors d ON du.doctor_id = d.id WHERE d.user_id = auth.uid() AND du.role IN ('owner', 'admin'))
);

DROP POLICY IF EXISTS "Owners and admins can manage unit memberships" ON public.doctor_units;
CREATE POLICY "Owners and admins can manage unit memberships"
ON public.doctor_units FOR ALL TO authenticated
USING (unit_id IN (SELECT unit_id FROM doctor_units du JOIN doctors d ON du.doctor_id = d.id WHERE d.user_id = auth.uid() AND du.role IN ('owner', 'admin')));

DROP TRIGGER IF EXISTS update_medical_units_updated_at ON public.medical_units;
CREATE TRIGGER update_medical_units_updated_at
    BEFORE UPDATE ON public.medical_units
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 4. Prescriptions (Recetas Médicas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    medications JSONB NOT NULL DEFAULT '[]',
    diagnosis TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'signed', 'delivered', 'cancelled')),
    signed_url TEXT,
    signed_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    valid_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON public.prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_appointment ON public.prescriptions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON public.prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_created_at ON public.prescriptions(created_at DESC);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Doctors can manage their prescriptions" ON public.prescriptions;
CREATE POLICY "Doctors can manage their prescriptions"
ON public.prescriptions FOR ALL TO authenticated
USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Patients can view their prescriptions" ON public.prescriptions;
CREATE POLICY "Patients can view their prescriptions"
ON public.prescriptions FOR SELECT TO authenticated
USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS update_prescriptions_updated_at ON public.prescriptions;
CREATE TRIGGER update_prescriptions_updated_at
    BEFORE UPDATE ON public.prescriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 5. Family Groups (Cuidadores)
-- ============================================
CREATE TABLE IF NOT EXISTS public.family_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    group_name TEXT DEFAULT 'Mi Familia',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    relationship TEXT NOT NULL CHECK (relationship IN ('self', 'spouse', 'child', 'parent', 'sibling', 'grandparent', 'other')),
    profile_data JSONB DEFAULT '{}',
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_groups_owner ON public.family_groups(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_group ON public.family_members(group_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON public.family_members(user_id);

ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their family groups" ON public.family_groups;
CREATE POLICY "Users can manage their family groups"
ON public.family_groups FOR ALL TO authenticated
USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their family members" ON public.family_members;
CREATE POLICY "Users can manage their family members"
ON public.family_members FOR ALL TO authenticated
USING (group_id IN (SELECT id FROM family_groups WHERE owner_user_id = auth.uid()));

DROP POLICY IF EXISTS "Members can view their group" ON public.family_groups;
CREATE POLICY "Members can view their group"
ON public.family_groups FOR SELECT TO authenticated
USING (id IN (SELECT group_id FROM family_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Members can view group members" ON public.family_members;
CREATE POLICY "Members can view group members"
ON public.family_members FOR SELECT TO authenticated
USING (group_id IN (SELECT group_id FROM family_members WHERE user_id = auth.uid()));

-- ============================================
-- 6. Doctor Verification System
-- ============================================
CREATE TABLE IF NOT EXISTS public.doctor_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL UNIQUE REFERENCES public.doctors(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'under_review', 'verified', 'rejected')),
    cedula_professional TEXT,
    cedula_storage_path TEXT,
    specialty_certificate_path TEXT,
    additional_documents JSONB DEFAULT '[]',
    rejection_reason TEXT,
    rejection_details JSONB,
    reviewed_by UUID REFERENCES auth.users(id),
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctor_verifications_status ON public.doctor_verifications(status);
CREATE INDEX IF NOT EXISTS idx_doctor_verifications_doctor ON public.doctor_verifications(doctor_id);

ALTER TABLE public.doctor_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Doctors can manage their verification" ON public.doctor_verifications;
CREATE POLICY "Doctors can manage their verification"
ON public.doctor_verifications FOR ALL TO authenticated
USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can view all verifications" ON public.doctor_verifications;
CREATE POLICY "Admins can view all verifications"
ON public.doctor_verifications FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM doctors WHERE user_id = auth.uid() AND doctor_role = 'admin'));

DROP POLICY IF EXISTS "Admins can update verifications" ON public.doctor_verifications;
CREATE POLICY "Admins can update verifications"
ON public.doctor_verifications FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM doctors WHERE user_id = auth.uid() AND doctor_role = 'admin'));

DROP TRIGGER IF EXISTS update_doctor_verifications_updated_at ON public.doctor_verifications;
CREATE TRIGGER update_doctor_verifications_updated_at
    BEFORE UPDATE ON public.doctor_verifications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create verification record when doctor is created
CREATE OR REPLACE FUNCTION public.create_doctor_verification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.doctor_verifications (doctor_id, status) VALUES (NEW.id, 'pending');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_verification_on_doctor_insert ON public.doctors;
CREATE TRIGGER create_verification_on_doctor_insert
    AFTER INSERT ON public.doctors
    FOR EACH ROW EXECUTE FUNCTION public.create_doctor_verification();

-- ============================================
-- 7. Extend virtual_intern_runs for AI jobs
-- ============================================
ALTER TABLE public.virtual_intern_runs
ADD COLUMN IF NOT EXISTS job_type TEXT DEFAULT 'virtual_intern'
    CHECK (job_type IN ('virtual_intern', 'transcription', 'diarization', 'enrichment', 'soap_generation'));

ALTER TABLE public.virtual_intern_runs ADD COLUMN IF NOT EXISTS audio_storage_path TEXT;
ALTER TABLE public.virtual_intern_runs ADD COLUMN IF NOT EXISTS input_data JSONB DEFAULT '{}';
ALTER TABLE public.virtual_intern_runs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.virtual_intern_runs ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE public.virtual_intern_runs ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;
ALTER TABLE public.virtual_intern_runs ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
ALTER TABLE public.virtual_intern_runs ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_vir_runs_job_type ON public.virtual_intern_runs(job_type);
CREATE INDEX IF NOT EXISTS idx_vir_runs_queue ON public.virtual_intern_runs(status, priority DESC, requested_at ASC) WHERE status = 'pending';

-- ============================================
-- 8. Storage Buckets
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('doctor-verifications', 'doctor-verifications', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('prescriptions', 'prescriptions', false, 5242880, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Only admins can read verification docs" ON storage.objects;
CREATE POLICY "Only admins can read verification docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'doctor-verifications' AND EXISTS (SELECT 1 FROM doctors WHERE user_id = auth.uid() AND doctor_role = 'admin'));

DROP POLICY IF EXISTS "Doctors can upload verification docs" ON storage.objects;
CREATE POLICY "Doctors can upload verification docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'doctor-verifications' AND (storage.foldername(name))[1] = (SELECT d.id::text FROM doctors d WHERE d.user_id = auth.uid()));

DROP POLICY IF EXISTS "Doctors can view own verification docs" ON storage.objects;
CREATE POLICY "Doctors can view own verification docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'doctor-verifications' AND (storage.foldername(name))[1] = (SELECT d.id::text FROM doctors d WHERE d.user_id = auth.uid()));

DROP POLICY IF EXISTS "Doctors can upload prescriptions" ON storage.objects;
CREATE POLICY "Doctors can upload prescriptions"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'prescriptions' AND (storage.foldername(name))[1] = (SELECT d.id::text FROM doctors d WHERE d.user_id = auth.uid()));

DROP POLICY IF EXISTS "Doctors can view their prescriptions storage" ON storage.objects;
CREATE POLICY "Doctors can view their prescriptions storage"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'prescriptions' AND (storage.foldername(name))[1] = (SELECT d.id::text FROM doctors d WHERE d.user_id = auth.uid()));

-- ============================================
-- DONE! All migrations applied.
-- ============================================
