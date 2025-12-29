-- Migration: Secure Storage Bucket
-- Description: Creates private storage bucket for sensitive verification documents

-- Create private bucket for sensitive documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'doctor-verifications',
    'doctor-verifications',
    false,
    10485760, -- 10MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
) ON CONFLICT (id) DO NOTHING;

-- Create prescriptions bucket for signed prescription PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'prescriptions',
    'prescriptions',
    false,
    5242880, -- 5MB limit
    ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- RLS for verification documents

-- Only admins can read all verification docs
DROP POLICY IF EXISTS "Only admins can read verification docs" ON storage.objects;
CREATE POLICY "Only admins can read verification docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'doctor-verifications'
    AND EXISTS (
        SELECT 1 FROM doctors
        WHERE user_id = auth.uid() AND doctor_role = 'admin'
    )
);

-- Doctors can upload to their own folder
DROP POLICY IF EXISTS "Doctors can upload verification docs" ON storage.objects;
CREATE POLICY "Doctors can upload verification docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'doctor-verifications'
    AND (storage.foldername(name))[1] = (
        SELECT d.id::text FROM doctors d WHERE d.user_id = auth.uid()
    )
);

-- Doctors can view their own uploads
DROP POLICY IF EXISTS "Doctors can view own verification docs" ON storage.objects;
CREATE POLICY "Doctors can view own verification docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'doctor-verifications'
    AND (storage.foldername(name))[1] = (
        SELECT d.id::text FROM doctors d WHERE d.user_id = auth.uid()
    )
);

-- RLS for prescription documents

-- Doctors can upload prescriptions
DROP POLICY IF EXISTS "Doctors can upload prescriptions" ON storage.objects;
CREATE POLICY "Doctors can upload prescriptions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'prescriptions'
    AND (storage.foldername(name))[1] = (
        SELECT d.id::text FROM doctors d WHERE d.user_id = auth.uid()
    )
);

-- Doctors can view their prescriptions
DROP POLICY IF EXISTS "Doctors can view their prescriptions storage" ON storage.objects;
CREATE POLICY "Doctors can view their prescriptions storage"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'prescriptions'
    AND (storage.foldername(name))[1] = (
        SELECT d.id::text FROM doctors d WHERE d.user_id = auth.uid()
    )
);

-- Patients can view their prescriptions via signed URLs (handled by application logic)
-- The application will generate signed URLs for patients to access their prescriptions
