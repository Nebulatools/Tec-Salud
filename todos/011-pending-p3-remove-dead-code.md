---
status: pending
priority: p3
issue_id: "011"
tags: [code-review, cleanup, quality]
dependencies: []
---

# Remove Unused Code (Dead Code)

## Problem Statement

Several code elements are defined but never used, adding maintenance burden and potential confusion.

## Findings

### Finding 1: Unused `checkExistingAccount` Function
**Location**: `lib/supabase-auth.ts` (lines 42-51)

```typescript
export async function checkExistingAccount(email: string) {
  const { data } = await supabase
    .from('app_users')
    .select('id, email')
    .eq('email', email)
    .single()
  return data !== null
}
```

- Function is exported but never imported anywhere
- 10 lines of dead code

### Finding 2: Unused `UpdatePrescriptionSchema`
**Location**: `lib/schemas/prescription.ts` (lines 22-27)

```typescript
export const UpdatePrescriptionSchema = z.object({
  medications: z.array(MedicationSchema).min(1).optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'signed', 'delivered', 'cancelled']).optional(),
})
export type UpdatePrescriptionType = z.infer<typeof UpdatePrescriptionSchema>
```

- Schema defined but no PATCH/PUT endpoint exists
- YAGNI violation
- 7 lines of dead code

### Finding 3: Unreachable Default Case
**Location**: `app/api/qr/route.ts` (lines 59-60)

```typescript
default:
  redirectPath = '/patient/profile'
```

- Zod validates campaign_type to only 3 values
- Default case is unreachable

**Evidence from Code Simplicity Reviewer Agent**:
- Total: ~19 lines of removable code
- Adds confusion for future maintainers

## Proposed Solutions

### Option 1: Remove All Dead Code (Recommended)
- **Pros**: Clean codebase, less maintenance
- **Cons**: None
- **Effort**: Low (30 minutes)
- **Risk**: None

## Technical Details

**Files to Modify**:
- `lib/supabase-auth.ts` - Remove `checkExistingAccount`
- `lib/schemas/prescription.ts` - Remove `UpdatePrescriptionSchema` and type
- `app/api/qr/route.ts` - Remove unreachable default

## Acceptance Criteria

- [ ] `checkExistingAccount` function removed
- [ ] `UpdatePrescriptionSchema` and `UpdatePrescriptionType` removed
- [ ] Unreachable default case removed
- [ ] All tests still pass
- [ ] No TypeScript errors

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-28 | Finding identified | Code review by code-simplicity-reviewer agent |

## Resources

- PR: feat/critical-gaps branch
