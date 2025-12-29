---
status: pending
priority: p3
issue_id: "012"
tags: [code-review, ux, quality]
dependencies: []
---

# Prescription Form Missing Error Feedback

## Problem Statement

The prescription form catches errors but only logs to console. Users receive no visual feedback when prescription creation or signing fails, leading to confusion about what went wrong.

## Findings

**Location**: `components/prescriptions/prescription-form.tsx` (lines 128-130)

```typescript
} catch (error) {
  console.error('Prescription error:', error)
  // You could add toast notification here  // <-- TODO comment left behind
}
```

**Evidence from Pattern Recognition Agent**:
- Error handling logs to console only
- No user-facing error feedback
- TODO comment indicates known gap

## Proposed Solutions

### Option 1: Use Existing Toast System (Recommended)
- **Pros**: Uses project's existing UI pattern
- **Cons**: None
- **Effort**: Low
- **Risk**: None

```typescript
import { useToast } from '@/hooks/use-toast'

// In component
const { toast } = useToast()

// In catch block
toast({
  title: 'Error',
  description: error instanceof Error ? error.message : 'Error al crear receta',
  variant: 'destructive',
})
```

### Option 2: Add Error State
- **Pros**: Inline error display
- **Cons**: More UI changes
- **Effort**: Medium
- **Risk**: Low

## Technical Details

**Affected Files**:
- `components/prescriptions/prescription-form.tsx`

## Acceptance Criteria

- [ ] Toast notification shown on prescription creation error
- [ ] Toast notification shown on prescription signing error
- [ ] Error message is user-friendly (Spanish)
- [ ] Console.error still logs for debugging

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-28 | Finding identified | Code review by pattern-recognition agent |

## Resources

- PR: feat/critical-gaps branch
- Existing toast hook: `hooks/use-toast.ts`
