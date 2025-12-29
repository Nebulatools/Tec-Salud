---
status: pending
priority: p2
issue_id: "010"
tags: [code-review, security, data-integrity]
dependencies: []
---

# Medical Units INSERT Policy Too Permissive

## Problem Statement

The INSERT policy for `medical_units` allows ANY authenticated user to create medical units with no restrictions. This means patients could create fake clinics, potentially filling up database storage or creating fraudulent medical units.

## Findings

**Location**: `supabase/migrations/20251228000002_create_medical_units.sql` (lines 51-54)

```sql
CREATE POLICY "Owners can insert units"
ON public.medical_units FOR INSERT
TO authenticated
WITH CHECK (true);  -- DANGER: No restrictions
```

**Evidence from Data Integrity Guardian Agent**:
- Any authenticated user can insert unlimited medical units
- No verification that user is a doctor
- Potential for data pollution and storage abuse

## Proposed Solutions

### Option 1: Restrict to Verified Doctors (Recommended)
- **Pros**: Most secure, aligns with business logic
- **Cons**: Unverified doctors can't create units
- **Effort**: Low
- **Risk**: Low

```sql
CREATE POLICY "Doctors can insert units"
ON public.medical_units FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM doctors d
        WHERE d.user_id = auth.uid()
    )
);
```

### Option 2: Restrict to Verified Doctors Only
- **Pros**: Highest security
- **Cons**: Blocks new doctors until verified
- **Effort**: Low
- **Risk**: Medium (impacts onboarding)

```sql
WITH CHECK (
    EXISTS (
        SELECT 1 FROM doctors d
        JOIN doctor_verifications dv ON d.id = dv.doctor_id
        WHERE d.user_id = auth.uid() AND dv.status = 'verified'
    )
)
```

### Option 3: Rate Limit at Policy Level
- **Pros**: Allows creation but limits abuse
- **Cons**: Complex policy, still allows some abuse
- **Effort**: Medium
- **Risk**: Medium

## Recommended Action

Implement Option 1 for immediate protection. Consider Option 2 after verification flow is complete.

## Technical Details

**Affected Files**:
- `supabase/migrations/20251228000002_create_medical_units.sql`

**Migration Required**:
- New migration to drop and recreate policy

## Acceptance Criteria

- [ ] Only authenticated doctors can create medical units
- [ ] Patients cannot create medical units
- [ ] Policy tested with both doctor and patient users

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-28 | Finding identified | Code review by data-integrity-guardian agent |

## Resources

- PR: feat/critical-gaps branch
