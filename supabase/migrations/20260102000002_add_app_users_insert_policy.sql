-- Allow users to insert their own app_users record
-- Required for upsert operations in user profile page
CREATE POLICY "app_users_self_insert"
ON app_users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);
