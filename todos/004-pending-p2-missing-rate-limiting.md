---
status: pending
priority: p2
issue_id: "004"
tags: [code-review, security, performance]
dependencies: []
---

# Missing Rate Limiting on API Routes

## Problem Statement

No rate limiting exists on prescription creation, QR generation, or prescription signing endpoints. An attacker could create thousands of prescriptions rapidly, generate millions of QR codes, or spam signing operations, causing DoS or data pollution.

## Findings

**Affected Endpoints**:
1. `POST /api/prescriptions` - No limit on prescription creation
2. `POST /api/qr` - No limit on QR code generation
3. `POST /api/prescriptions/[id]/sign` - No limit on signing attempts
4. `middleware.ts:36` - QR scan increment has no rate limiting

**Evidence from Security Sentinel Agent**:
- All POST endpoints lack rate limiting
- QR scan counting could be abused
- Severity: MEDIUM (enables DoS)

## Proposed Solutions

### Option 1: Upstash Rate Limiting (Recommended)
- **Pros**: Edge-compatible, easy integration, no self-hosted Redis
- **Cons**: External dependency, cost at scale
- **Effort**: Medium
- **Risk**: Low

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
})

// In API route
const identifier = user.id
const { success, limit, remaining } = await ratelimit.limit(identifier)
if (!success) {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
}
```

### Option 2: Next.js Middleware Rate Limiting
- **Pros**: Centralized, handles all routes
- **Cons**: Adds latency to all requests
- **Effort**: Medium
- **Risk**: Low

### Option 3: In-Memory Rate Limiting (Not Recommended)
- **Pros**: No external dependencies
- **Cons**: Doesn't work in serverless, no persistence
- **Effort**: Low
- **Risk**: High (ineffective at scale)

## Recommended Action

Implement Option 1 (Upstash) for API routes with these limits:
- Prescriptions: 10/min
- QR codes: 5/min
- Signing: 3/min
- QR scans: 30/hour per QR ID

## Technical Details

**Affected Files**:
- `app/api/prescriptions/route.ts`
- `app/api/prescriptions/[id]/sign/route.ts`
- `app/api/qr/route.ts`
- `middleware.ts`

**Dependencies Required**:
- `@upstash/ratelimit`
- `@upstash/redis`

## Acceptance Criteria

- [ ] Prescription creation limited to 10/min per user
- [ ] QR generation limited to 5/min per user
- [ ] Signing limited to 3/min per user
- [ ] 429 response returned when limit exceeded
- [ ] Rate limit headers included in response

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-28 | Finding identified | Code review by security-sentinel agent |

## Resources

- PR: feat/critical-gaps branch
- Upstash Ratelimit: https://github.com/upstash/ratelimit
