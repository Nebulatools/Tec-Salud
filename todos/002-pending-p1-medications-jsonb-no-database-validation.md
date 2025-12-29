---
status: pending
priority: p1
issue_id: "002"
tags: [code-review, data-integrity, security]
dependencies: []
---

# Medications JSONB Has No Database-Level Validation

## Problem Statement

While Zod validation exists at the API layer, there is no database-level CHECK constraint to validate the JSONB structure for medications. A malicious or buggy client could bypass the API and directly insert invalid medication data via Supabase client, leading to missing required fields, incorrect data types, or XSS payloads.

## Findings

**Location**:
- `supabase/migrations/20251228000003_create_prescriptions.sql` (line 10)
- `app/api/prescriptions/route.ts` (lines 25-32)

```sql
medications JSONB NOT NULL DEFAULT '[]',  -- No structural validation
```

**Evidence from Data Integrity Guardian Agent**:
- No database-level validation of medication structure
- Required fields (dosage, frequency) could be missing
- PHI could be corrupted silently

## Proposed Solutions

### Option 1: PostgreSQL CHECK Constraint (Recommended)
- **Pros**: Database-level enforcement, works even for direct inserts
- **Cons**: Complex constraint syntax, maintenance overhead
- **Effort**: Medium
- **Risk**: Low

```sql
ALTER TABLE prescriptions ADD CONSTRAINT valid_medications
CHECK (
    jsonb_typeof(medications) = 'array'
    AND (
        medications = '[]'::jsonb
        OR (
            SELECT bool_and(
                m ? 'brand_name'
                AND m ? 'generic_name'
                AND m ? 'dosage'
                AND m ? 'frequency'
                AND m ? 'duration'
            )
            FROM jsonb_array_elements(medications) m
        )
    )
);
```

### Option 2: Validation Trigger Function
- **Pros**: More expressive validation, better error messages
- **Cons**: Slightly more overhead, two places to maintain (Zod + trigger)
- **Effort**: Medium
- **Risk**: Low

### Option 3: PostgreSQL JSON Schema Validation (pg_jsonschema)
- **Pros**: Uses JSON Schema standard, reusable
- **Cons**: Requires extension, may not be available on all Supabase plans
- **Effort**: Low if extension available
- **Risk**: Medium (extension dependency)

## Recommended Action

Implement Option 1 (CHECK constraint) for immediate protection, keeping the Zod schema as the primary validation.

## Technical Details

**Affected Files**:
- `supabase/migrations/20251228000003_create_prescriptions.sql`

**Database Changes Required**:
- New migration to add CHECK constraint

## Acceptance Criteria

- [ ] Database rejects medications array without required fields
- [ ] Database rejects non-array values for medications
- [ ] Existing Zod validation continues to provide user-friendly errors

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-28 | Finding identified | Code review by data-integrity-guardian agent |

## Resources

- PR: feat/critical-gaps branch
- PostgreSQL JSONB Validation: https://www.postgresql.org/docs/current/functions-json.html
