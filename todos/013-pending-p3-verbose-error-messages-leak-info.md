---
status: pending
priority: p3
issue_id: "013"
tags: [code-review, security]
dependencies: []
---

# Verbose Error Messages May Leak Information

## Problem Statement

Several API routes expose raw database error messages directly to clients, which could leak schema information or internal system details to potential attackers.

## Findings

**Location**: `app/api/prescriptions/route.ts` (line 72)

```typescript
return NextResponse.json({ error: error.message }, { status: 500 })
```

Similar patterns found in:
- `app/api/qr/route.ts`
- `app/api/prescriptions/[id]/sign/route.ts`

**Evidence from Security Sentinel Agent**:
- Raw `error.message` exposed to clients
- Could reveal table names, column names, constraint names
- Severity: LOW (information disclosure)

## Proposed Solutions

### Option 1: Generic Error Messages (Recommended)
- **Pros**: Simple, secure
- **Cons**: Less helpful for debugging via client
- **Effort**: Low
- **Risk**: None

```typescript
// Log detailed error server-side
console.error('Database error:', error)

// Return generic message to client
return NextResponse.json(
  { error: 'Error interno del servidor' },
  { status: 500 }
)
```

### Option 2: Error Code System
- **Pros**: Allows client-side error handling
- **Cons**: More implementation work
- **Effort**: Medium
- **Risk**: None

```typescript
return NextResponse.json(
  {
    error: 'Error interno del servidor',
    code: 'PRESCRIPTION_CREATE_FAILED'
  },
  { status: 500 }
)
```

## Technical Details

**Affected Files**:
- `app/api/prescriptions/route.ts`
- `app/api/prescriptions/[id]/sign/route.ts`
- `app/api/qr/route.ts`

## Acceptance Criteria

- [ ] No raw database errors returned to clients
- [ ] Detailed errors logged server-side
- [ ] User-friendly error messages in Spanish
- [ ] Error codes for programmatic handling (optional)

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-28 | Finding identified | Code review by security-sentinel agent |

## Resources

- PR: feat/critical-gaps branch
