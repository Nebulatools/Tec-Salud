-- Migration: Create unified avatars bucket
-- Consolidates doctor-avatars and user-avatars into single bucket
-- Structure: avatars/doctors/{userId}/ and avatars/users/{userId}/

-- Create the unified bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload their own avatar (unified)
CREATE POLICY "Unified avatars: insert own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] IN ('doctors', 'users')
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy: Allow authenticated users to update their own avatar (unified)
CREATE POLICY "Unified avatars: update own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] IN ('doctors', 'users')
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy: Allow authenticated users to delete their own avatar (unified)
CREATE POLICY "Unified avatars: delete own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] IN ('doctors', 'users')
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy: Public read access for all avatars (unified)
CREATE POLICY "Unified avatars: public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- NOTE: Old buckets (doctor-avatars, user-avatars) kept for backward compatibility
-- Existing avatar URLs will continue working
-- New uploads will use the unified bucket
-- Old buckets can be cleaned up after all users have updated their photos
