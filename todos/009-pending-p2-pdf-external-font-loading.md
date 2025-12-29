---
status: pending
priority: p2
issue_id: "009"
tags: [code-review, performance]
dependencies: []
---

# PDF External Font Loading Adds Latency

## Problem Statement

The prescription PDF component loads 3 font weights from Google's CDN on every render, adding 100-500ms of network latency per PDF generation. This creates external dependency and prevents offline capability.

## Findings

**Location**: `components/prescriptions/prescription-pdf.tsx` (lines 16-32)

```typescript
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/...', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/...', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/...', fontWeight: 700 },
  ],
})
```

**Evidence from Performance Oracle Agent**:
- 3 HTTP requests to external CDN per PDF
- 100-500ms additional latency
- No offline capability
- CDN failures cause PDF failures

## Proposed Solutions

### Option 1: Bundle Fonts Locally (Recommended)
- **Pros**: No network dependency, faster, works offline
- **Cons**: Increases bundle size (~300KB)
- **Effort**: Low
- **Risk**: Low

```typescript
Font.register({
  family: 'Inter',
  fonts: [
    { src: '/fonts/Inter-Regular.woff2', fontWeight: 400 },
    { src: '/fonts/Inter-SemiBold.woff2', fontWeight: 600 },
    { src: '/fonts/Inter-Bold.woff2', fontWeight: 700 },
  ],
})
```

### Option 2: Use System Fonts
- **Pros**: Zero bundle size, maximum compatibility
- **Cons**: Less design control, platform differences
- **Effort**: Low
- **Risk**: Low

```typescript
fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
```

### Option 3: Single Font Weight
- **Pros**: Reduces requests by 2/3
- **Cons**: Less typographic flexibility
- **Effort**: Low
- **Risk**: Low

## Recommended Action

Implement Option 1 (bundle locally) for best user experience and reliability.

## Technical Details

**Affected Files**:
- `components/prescriptions/prescription-pdf.tsx`

**New Files**:
- `public/fonts/Inter-Regular.woff2`
- `public/fonts/Inter-SemiBold.woff2`
- `public/fonts/Inter-Bold.woff2`

## Acceptance Criteria

- [ ] Fonts bundled in public/fonts directory
- [ ] No external font requests during PDF generation
- [ ] PDF generation works offline
- [ ] PDF rendering unchanged visually

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-28 | Finding identified | Code review by performance-oracle agent |

## Resources

- PR: feat/critical-gaps branch
- Inter Font: https://rsms.me/inter/
