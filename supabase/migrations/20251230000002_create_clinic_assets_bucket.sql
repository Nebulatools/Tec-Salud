-- Create storage bucket for clinic assets (logos, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clinic-assets',
  'clinic-assets',
  true,  -- Public bucket for logos
  5242880,  -- 5MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to clinic-logos folder
CREATE POLICY "Authenticated users can upload clinic logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'clinic-assets' AND (storage.foldername(name))[1] = 'clinic-logos');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update clinic logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'clinic-assets' AND (storage.foldername(name))[1] = 'clinic-logos');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete clinic logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'clinic-assets' AND (storage.foldername(name))[1] = 'clinic-logos');

-- Allow public read access to all clinic assets
CREATE POLICY "Public read access to clinic assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'clinic-assets');
