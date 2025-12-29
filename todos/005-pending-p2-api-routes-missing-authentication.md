---
status: pending
priority: p2
issue_id: "005"
tags: [code-review, security, architecture]
dependencies: []
---

# Existing API Routes Missing Authentication

## Problem Statement

Several existing API routes use the browser Supabase client instead of the server client and lack proper authentication checks. This bypasses the SSR security model and could allow unauthenticated access.

## Findings

**Affected Files** (from Pattern Recognition Agent):

| File | Auth Check | Client Used | Issue |
|------|------------|-------------|-------|
| `app/api/medical-reports/route.ts` | None | Browser client | No auth |
| `app/api/clinical-extractions/route.ts` | None | Browser client | No auth |
| `app/api/parse-transcript/route.ts` | None | Browser client | No auth |
| `app/api/get-clinical-suggestions/route.ts` | None | Browser client | No auth |

**Correct Pattern** (used in new routes):
```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

## Proposed Solutions

### Option 1: Update Each Route Individually
- **Pros**: Targeted fix, minimal changes
- **Cons**: Repetitive code, easy to forget in new routes
- **Effort**: Medium
- **Risk**: Low

### Option 2: Create Auth Middleware/Utility (Recommended)
- **Pros**: DRY, consistent, easy to maintain
- **Cons**: Slight refactoring needed
- **Effort**: Medium
- **Risk**: Low

```typescript
// lib/api/auth.ts
export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new UnauthorizedError()
  }
  return { user, supabase }
}

export async function requireDoctor() {
  const { user, supabase } = await requireAuth()
  const { data: doctor } = await supabase
    .from('doctors')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!doctor) {
    throw new ForbiddenError('Doctor profile required')
  }
  return { user, doctor, supabase }
}
```

## Recommended Action

Implement Option 2, then update all affected routes to use the new auth utilities.

## Technical Details

**Affected Files**:
- `app/api/medical-reports/route.ts`
- `app/api/clinical-extractions/route.ts`
- `app/api/parse-transcript/route.ts`
- `app/api/get-clinical-suggestions/route.ts`

**New Files to Create**:
- `lib/api/auth.ts`
- `lib/api/errors.ts`

## Acceptance Criteria

- [ ] All API routes use `@/lib/supabase/server` client
- [ ] All protected routes check authentication
- [ ] 401 returned for unauthenticated requests
- [ ] Auth utility functions created and documented

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-28 | Finding identified | Code review by pattern-recognition agent |

## Resources

- PR: feat/critical-gaps branch
- New auth pattern: `app/api/prescriptions/route.ts`
