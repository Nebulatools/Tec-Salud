---
status: pending
priority: p2
issue_id: "006"
tags: [code-review, performance]
dependencies: []
---

# Sequential Database Queries Should Be Parallelized

## Problem Statement

Multiple API routes execute sequential database queries that could be parallelized, adding 50-200ms of unnecessary latency per request. At scale, this significantly impacts user experience and server costs.

## Findings

### Finding 1: Prescriptions GET - Dual Role Check
**Location**: `app/api/prescriptions/route.ts` (lines 97-108)

```typescript
// Two sequential queries - could be parallel
const { data: doctor } = await supabase.from('doctors').select('id').eq('user_id', user.id).single()
const { data: patient } = await supabase.from('patients').select('id').eq('user_id', user.id).single()
```

### Finding 2: Prescriptions POST - Doctor + Patient Verification
**Location**: `app/api/prescriptions/route.ts` (lines 14-45)

Three sequential queries before insert.

### Finding 3: Sign Route - Doctor + Prescription Fetch
**Location**: `app/api/prescriptions/[id]/sign/route.ts` (lines 19-38)

Doctor lookup could happen in parallel with other validations.

**Evidence from Performance Oracle Agent**:
- 40-50% response time reduction possible
- At 1000x scale: 100-200ms wasted per request

## Proposed Solutions

### Option 1: Promise.all for Independent Queries (Recommended)
- **Pros**: Simple fix, immediate improvement
- **Cons**: None
- **Effort**: Low
- **Risk**: Low

```typescript
const [doctorResult, patientResult] = await Promise.all([
  supabase.from('doctors').select('id').eq('user_id', user.id).single(),
  supabase.from('patients').select('id').eq('user_id', user.id).single()
])
```

### Option 2: Single Query with JOIN
- **Pros**: Most efficient, single round-trip
- **Cons**: More complex query, harder to maintain
- **Effort**: Medium
- **Risk**: Low

### Option 3: RLS-Based Access Control
- **Pros**: Eliminates role check entirely
- **Cons**: Requires trusting RLS completely
- **Effort**: Medium
- **Risk**: Medium

## Recommended Action

Implement Option 1 for immediate improvement. Consider Option 2 for critical paths.

## Technical Details

**Affected Files**:
- `app/api/prescriptions/route.ts`
- `app/api/prescriptions/[id]/sign/route.ts`

## Acceptance Criteria

- [ ] Doctor/patient lookup parallelized in GET endpoint
- [ ] Doctor/patient verification parallelized in POST endpoint
- [ ] Response time reduced by 40%+ for affected endpoints

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-28 | Finding identified | Code review by performance-oracle agent |

## Resources

- PR: feat/critical-gaps branch
