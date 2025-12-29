---
status: pending
priority: p1
issue_id: "003"
tags: [code-review, security, owasp]
dependencies: []
---

# Open Redirect Vulnerabilities in Auth Callback and Middleware

## Problem Statement

Two open redirect vulnerabilities exist that could allow attackers to redirect users to malicious sites after authentication or QR scanning. This is an OWASP Top 10 vulnerability (A01: Broken Access Control).

## Findings

### Finding 1: Auth Callback Open Redirect
**Location**: `app/auth/callback/route.ts` (lines 54-61)

```typescript
if (redirectTo) {
  const targetUrl = new URL(redirectTo, request.url)
  // No validation that redirectTo is a relative path or allowed domain
  destination = targetUrl.pathname + targetUrl.search
}
```

An attacker could craft: `?redirect_to=https://evil.com/phishing` to redirect users after OAuth login.

### Finding 2: QR Middleware Redirect
**Location**: `middleware.ts` (line 40)

```typescript
const targetUrl = new URL(qrLink.redirect_url, request.url)
```

If an attacker gains database access (or via SQL injection in another route), they could insert a malicious redirect URL.

**Evidence from Security Sentinel Agent**:
- Both redirect paths lack URL validation
- Could lead to phishing attacks after OAuth
- Severity: MEDIUM (requires user interaction)

## Proposed Solutions

### Option 1: Allowlist Validation (Recommended)
- **Pros**: Most secure, explicit control
- **Cons**: Requires maintenance when adding new routes
- **Effort**: Low
- **Risk**: Low

```typescript
const ALLOWED_PATHS = ['/dashboard', '/patient/', '/consultas', '/expedientes']

function isValidRedirect(path: string): boolean {
  if (!path.startsWith('/')) return false // Must be relative
  return ALLOWED_PATHS.some(allowed => path.startsWith(allowed))
}
```

### Option 2: Same-Origin Check
- **Pros**: Simpler, allows any internal route
- **Cons**: Less restrictive than allowlist
- **Effort**: Low
- **Risk**: Low

```typescript
function isValidRedirect(url: string, baseUrl: string): boolean {
  try {
    const target = new URL(url, baseUrl)
    const base = new URL(baseUrl)
    return target.origin === base.origin
  } catch {
    return false
  }
}
```

### Option 3: Path-Only Extraction
- **Pros**: Forces relative paths
- **Cons**: Could still redirect to unintended internal pages
- **Effort**: Low
- **Risk**: Medium

## Recommended Action

Implement Option 1 (Allowlist) for auth callback and Option 2 (Same-Origin) for QR middleware.

## Technical Details

**Affected Files**:
- `app/auth/callback/route.ts`
- `middleware.ts`

## Acceptance Criteria

- [ ] Auth callback rejects external URLs
- [ ] Auth callback rejects non-allowlisted paths
- [ ] QR middleware validates redirect_url is same-origin
- [ ] Default redirect to /dashboard on invalid input

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-28 | Finding identified | Code review by security-sentinel agent |

## Resources

- PR: feat/critical-gaps branch
- OWASP Unvalidated Redirects: https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html
