---
status: pending
priority: p1
issue_id: "001"
tags: [code-review, data-integrity, security, compliance]
dependencies: []
---

# Prescription CASCADE DELETE Violates Medical Record Retention

## Problem Statement

The `prescriptions` table uses `ON DELETE CASCADE` for both `doctor_id` and `patient_id` foreign keys. When a doctor or patient is deleted, all their prescriptions are immediately destroyed - including signed/delivered prescriptions that may be legally required to be retained for regulatory compliance (typically 5-10 years for medical records under HIPAA and NOM-024-SSA3).

## Findings

**Location**: `supabase/migrations/20251228000003_create_prescriptions.sql` (lines 7-9)

```sql
appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,  -- Soft delete
doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,    -- Hard delete
patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,  -- Hard delete
```

**Evidence from Data Integrity Guardian Agent**:
- Signed prescriptions contain PHI (medications, diagnosis)
- No audit trail exists for prescription modifications
- Compliance risk for HIPAA and NOM-024-SSA3

## Proposed Solutions

### Option 1: Use ON DELETE RESTRICT (Recommended)
- **Pros**: Prevents accidental data loss, enforces retention policy
- **Cons**: Requires explicit archival process before deleting doctors/patients
- **Effort**: Low (migration change)
- **Risk**: Low

```sql
ALTER TABLE prescriptions
DROP CONSTRAINT prescriptions_doctor_id_fkey,
ADD CONSTRAINT prescriptions_doctor_id_fkey
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT;
```

### Option 2: Soft Delete with deleted_at Column
- **Pros**: Preserves data, allows recovery, audit-friendly
- **Cons**: Requires application-level filtering, more complex queries
- **Effort**: Medium (schema + application changes)
- **Risk**: Low

### Option 3: Archive Table Pattern
- **Pros**: Separates active from archived data, clean queries
- **Cons**: Additional table to maintain, data duplication
- **Effort**: High
- **Risk**: Medium

## Recommended Action

Implement Option 1 (ON DELETE RESTRICT) immediately to prevent data loss, then plan for Option 2 (soft delete) as a follow-up for full compliance.

## Technical Details

**Affected Files**:
- `supabase/migrations/20251228000003_create_prescriptions.sql`

**Database Changes Required**:
- New migration to alter foreign key constraints
- Consider adding `deleted_at TIMESTAMPTZ` column

## Acceptance Criteria

- [ ] Doctor deletion is blocked if they have prescriptions
- [ ] Patient deletion is blocked if they have prescriptions
- [ ] Soft delete pattern implemented with `deleted_at` column
- [ ] Audit log table created for prescription modifications

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-28 | Finding identified | Code review by data-integrity-guardian agent |

## Resources

- PR: feat/critical-gaps branch
- HIPAA Medical Record Retention: https://www.hhs.gov/hipaa/
- NOM-024-SSA3 (Mexican Health Records Standard)
