-- Migration: Create Family Groups (Cuidadores)
-- Description: Enables users to manage family members and dependents

-- Family Groups table
CREATE TABLE public.family_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    group_name TEXT DEFAULT 'Mi Familia',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family Members table
CREATE TABLE public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for dependents without accounts
    relationship TEXT NOT NULL CHECK (relationship IN ('self', 'spouse', 'child', 'parent', 'sibling', 'grandparent', 'other')),
    -- Profile data for members without user accounts
    profile_data JSONB DEFAULT '{}',
    -- Example profile_data structure:
    -- {
    --   "full_name": "...",
    --   "date_of_birth": "...",
    --   "gender": "...",
    --   "allergies": [...],
    --   "blood_type": "...",
    --   "medical_notes": "..."
    -- }
    is_primary BOOLEAN DEFAULT false, -- Is this the main account holder
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_family_groups_owner ON public.family_groups(owner_user_id);
CREATE INDEX idx_family_members_group ON public.family_members(group_id);
CREATE INDEX idx_family_members_user ON public.family_members(user_id);

-- RLS
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Users can manage their family groups
CREATE POLICY "Users can manage their family groups"
ON public.family_groups FOR ALL
TO authenticated
USING (owner_user_id = auth.uid());

-- Users can manage their family members
CREATE POLICY "Users can manage their family members"
ON public.family_members FOR ALL
TO authenticated
USING (
    group_id IN (
        SELECT id FROM family_groups WHERE owner_user_id = auth.uid()
    )
);

-- Members can view the group they belong to (if they have an account)
CREATE POLICY "Members can view their group"
ON public.family_groups FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT group_id FROM family_members WHERE user_id = auth.uid()
    )
);

-- Members can view other members in their group
CREATE POLICY "Members can view group members"
ON public.family_members FOR SELECT
TO authenticated
USING (
    group_id IN (
        SELECT group_id FROM family_members WHERE user_id = auth.uid()
    )
);
