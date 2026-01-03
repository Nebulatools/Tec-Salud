-- Allow doctors to update their own record
-- Required for profile page to update doctor name
CREATE POLICY "doctors_self_update"
ON doctors FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
