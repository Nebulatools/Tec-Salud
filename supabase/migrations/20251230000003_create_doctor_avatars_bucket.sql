-- DEPRECATED: This bucket is superseded by unified 'avatars' bucket
-- See: 20260103000001_unified_avatars_bucket.sql
-- Kept for backward compatibility with existing avatar URLs

-- Create storage bucket for doctor avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'doctor-avatars',
  'doctor-avatars',
  true,  -- Public bucket for avatars
  2097152,  -- 2MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own avatars
CREATE POLICY "Authenticated users can upload doctor avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'doctor-avatars');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update doctor avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'doctor-avatars');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete doctor avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'doctor-avatars');

-- Allow public read access to all doctor avatars
CREATE POLICY "Public read access to doctor avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'doctor-avatars');
