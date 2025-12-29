-- Migration: Create QR Links for patient acquisition
-- Description: Enables doctors to create QR codes for patient onboarding campaigns

-- QR Links table
CREATE TABLE public.qr_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    campaign_type TEXT NOT NULL CHECK (campaign_type IN ('specialty_survey', 'quick_profile', 'appointment')),
    target_resource_id UUID, -- Can reference surveys, forms, etc.
    redirect_url TEXT NOT NULL,
    scans_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_qr_links_doctor_id ON public.qr_links(doctor_id);
CREATE INDEX idx_qr_links_created_at ON public.qr_links(created_at DESC);

-- RLS
ALTER TABLE public.qr_links ENABLE ROW LEVEL SECURITY;

-- Doctors can manage their own QR links
CREATE POLICY "Doctors can manage their own QR links"
ON public.qr_links FOR ALL
TO authenticated
USING (
    doctor_id IN (
        SELECT id FROM doctors WHERE user_id = auth.uid()
    )
);

-- Public can read active QR links for scanning
CREATE POLICY "Public can read active QR links for scanning"
ON public.qr_links FOR SELECT
TO anon
USING (
    expires_at IS NULL OR expires_at > NOW()
);

-- Function to increment QR scan count
CREATE OR REPLACE FUNCTION public.increment_qr_scan(qr_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.qr_links
    SET scans_count = scans_count + 1
    WHERE id = qr_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.increment_qr_scan(UUID) TO anon, authenticated;
