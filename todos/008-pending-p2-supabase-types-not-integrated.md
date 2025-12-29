---
status: pending
priority: p2
issue_id: "008"
tags: [code-review, architecture, typescript]
dependencies: []
---

# New Tables Not Added to Database Type

## Problem Statement

The new database tables (qr_links, prescriptions, medical_units, etc.) are defined as standalone TypeScript interfaces but not integrated into the `Database` type. This means Supabase client queries don't get full type inference for the new tables.

## Findings

**Location**: `lib/supabase.ts`

Current state:
- 6 new interfaces defined: `QRLink`, `MedicalUnit`, `Prescription`, `FamilyGroup`, `DoctorVerification`, `VirtualInternRunExtended`
- None are added to `Database.public.Tables` type

**Impact**:
- No autocomplete for new table names
- No type checking for column names in queries
- `supabase.from('qr_links')` returns `any` instead of proper types

**Evidence from Architecture Strategist Agent**:
- Type definitions are duplicated (Zod + TypeScript)
- Server client not typed with `Database`

## Proposed Solutions

### Option 1: Auto-Generate Types (Recommended)
- **Pros**: Always in sync with database, no manual maintenance
- **Cons**: Requires Supabase CLI setup
- **Effort**: Low
- **Risk**: Low

```bash
npx supabase gen types typescript --project-id didbxinquugseweufvpr > lib/database.types.ts
```

### Option 2: Manual Integration
- **Pros**: Full control, can add computed types
- **Cons**: Manual maintenance, drift risk
- **Effort**: Medium
- **Risk**: Medium

```typescript
export type Database = {
  public: {
    Tables: {
      qr_links: {
        Row: QRLink
        Insert: Omit<QRLink, 'id' | 'created_at' | 'scans_count'>
        Update: Partial<Omit<QRLink, 'id' | 'created_at'>>
      }
      prescriptions: {
        Row: Prescription
        Insert: Omit<Prescription, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Prescription, 'id' | 'created_at'>>
      }
      // ... etc
    }
  }
}
```

### Option 3: Type Server Client
- **Pros**: Quick fix for client type safety
- **Cons**: Doesn't solve full type generation
- **Effort**: Low
- **Risk**: Low

```typescript
import type { Database } from '@/lib/supabase'

export async function createClient() {
  return createServerClient<Database>(...)
}
```

## Recommended Action

Implement Option 1 (auto-generate) as primary solution, then apply Option 3 to server client.

## Technical Details

**Affected Files**:
- `lib/supabase.ts`
- `lib/supabase/server.ts`

**New Files**:
- `lib/database.types.ts` (auto-generated)

## Acceptance Criteria

- [ ] `supabase gen types` configured and documented
- [ ] All new tables included in Database type
- [ ] Server client typed with Database generic
- [ ] Full autocomplete working for new tables

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-28 | Finding identified | Code review by architecture-strategist agent |

## Resources

- PR: feat/critical-gaps branch
- Supabase Type Generation: https://supabase.com/docs/guides/api/rest/generating-types
