-- Migration: Fix Family Groups RLS infinite recursion
-- The previous policies had circular references between family_groups and family_members

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their family groups" ON public.family_groups;
DROP POLICY IF EXISTS "Members can view their group" ON public.family_groups;
DROP POLICY IF EXISTS "Users can manage their family members" ON public.family_members;
DROP POLICY IF EXISTS "Members can view group members" ON public.family_members;

-- Create a security definer function to check group membership without RLS
CREATE OR REPLACE FUNCTION public.user_is_family_group_member(group_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE group_id = group_uuid AND user_id = auth.uid()
  );
$$;

-- Create a security definer function to get user's family group id
CREATE OR REPLACE FUNCTION public.get_user_family_group_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.family_groups WHERE owner_user_id = auth.uid() LIMIT 1;
$$;

-- Family Groups Policies (simplified, no circular refs)

-- Owners can do everything with their groups
CREATE POLICY "family_groups_owner_all"
ON public.family_groups FOR ALL
TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

-- Members can view groups they belong to (uses security definer function)
CREATE POLICY "family_groups_member_select"
ON public.family_groups FOR SELECT
TO authenticated
USING (
  owner_user_id = auth.uid()
  OR public.user_is_family_group_member(id)
);

-- Family Members Policies (simplified, no circular refs)

-- Owners can manage all members in their groups
CREATE POLICY "family_members_owner_all"
ON public.family_members FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.family_groups
    WHERE id = family_members.group_id
    AND owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.family_groups
    WHERE id = family_members.group_id
    AND owner_user_id = auth.uid()
  )
);

-- Members can view other members in their group (uses function to avoid recursion)
CREATE POLICY "family_members_member_select"
ON public.family_members FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.family_groups
    WHERE id = family_members.group_id
    AND owner_user_id = auth.uid()
  )
  OR public.user_is_family_group_member(group_id)
);
