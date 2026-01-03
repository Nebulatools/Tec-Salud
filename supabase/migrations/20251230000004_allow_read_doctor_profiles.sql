-- Allow authenticated users to read app_users records for users who are doctors
-- This is needed so patients can see doctor avatars and profile info on the specialists page
CREATE POLICY "app_users_read_doctor_profiles"
ON app_users FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM doctors d WHERE d.user_id = app_users.id
  )
);
