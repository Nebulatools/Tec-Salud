---
status: pending
priority: p3
issue_id: "014"
tags: [code-review, architecture, consistency]
dependencies: []
---

# QR Schema Should Be in lib/schemas

## Problem Statement

The `CreateQRSchema` Zod schema is defined inline in the API route rather than in `lib/schemas/`, which is inconsistent with the prescription pattern and makes it harder to reuse or test.

## Findings

**Location**: `app/api/qr/route.ts` (lines 5-10)

```typescript
const CreateQRSchema = z.object({
  campaign_type: z.enum(['specialty_survey', 'quick_profile', 'appointment']),
  target_resource_id: z.string().uuid().optional(),
  expires_in_days: z.number().min(1).max(365).optional(),
  metadata: z.record(z.unknown()).optional(),
})
```

**Correct Pattern** (in prescriptions):
```
lib/schemas/prescription.ts - Contains all prescription-related schemas
app/api/prescriptions/route.ts - Imports schema from lib/schemas
```

**Evidence from Pattern Recognition Agent**:
- Inconsistent schema location
- Schema not exportable for reuse
- No TypeScript type exported

## Proposed Solutions

### Option 1: Move to lib/schemas/qr.ts (Recommended)
- **Pros**: Consistent pattern, reusable, testable
- **Cons**: None
- **Effort**: Low
- **Risk**: None

```typescript
// lib/schemas/qr.ts
import { z } from 'zod'

export const CreateQRSchema = z.object({
  campaign_type: z.enum(['specialty_survey', 'quick_profile', 'appointment']),
  target_resource_id: z.string().uuid().optional(),
  expires_in_days: z.number().min(1).max(365).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export type CreateQRType = z.infer<typeof CreateQRSchema>

export const CAMPAIGN_TYPES = ['specialty_survey', 'quick_profile', 'appointment'] as const
export type CampaignType = typeof CAMPAIGN_TYPES[number]
```

## Technical Details

**Affected Files**:
- `app/api/qr/route.ts` - Remove inline schema, import from lib
- `lib/schemas/qr.ts` - New file

## Acceptance Criteria

- [ ] Schema moved to `lib/schemas/qr.ts`
- [ ] Type exported for use in components
- [ ] API route imports schema from lib
- [ ] All tests pass

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-28 | Finding identified | Code review by pattern-recognition agent |

## Resources

- PR: feat/critical-gaps branch
- Reference: `lib/schemas/prescription.ts`
