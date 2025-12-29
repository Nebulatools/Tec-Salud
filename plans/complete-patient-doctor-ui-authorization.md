# Plan: Complete Patient & Doctor UI with Authorization Fix

## Executive Summary

This plan addresses three critical areas:
1. **Authorization Issues** - Fix "Unauthorized" errors when creating QR codes, prescriptions, etc.
2. **Patient-Side UI** - Implement missing patient portal pages for QR landing, prescriptions, appointments
3. **QR Flow Documentation** - Complete the doctor-to-patient QR workflow

---

## 1. Authorization Analysis

### Current State

**Database Linking Chain:**
```
auth.users (Supabase Auth)
    ↓ id = auth.uid()
app_users (id = auth.uid(), role: 'user' | 'doctor_admin')
    ↓ id = doctors.user_id
doctors (user_id → auth.uid(), doctor_role: 'admin')
    ↓ id = qr_links.doctor_id, prescriptions.doctor_id, etc.
```

**Verified Data:**
| Table | Records | Key Finding |
|-------|---------|-------------|
| `auth.users` | 6 | All have matching `app_users` records |
| `app_users` | 6 | 2 with role `doctor_admin`, 4 with role `user` |
| `doctors` | 2 | Both linked via `user_id` to `auth.users` |
| `patients` | 5 | 4 have `user_id` linked, 1 without |

**Doctor Accounts Verified:**
- `autonimatic1000@gmail.com` → `app_users.role: doctor_admin` → `doctors.id: ace0e675-...`
- `ventas@jacoagency.io` → `app_users.role: doctor_admin` → `doctors.id: c164fceb-...`

### RLS Policy Pattern

All new tables use this pattern:
```sql
CREATE POLICY "Doctors can manage their [resource]"
ON public.[table] FOR ALL TO authenticated
USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));
```

**This SHOULD work** because:
1. User logs in → gets `auth.uid()`
2. `useAppUser()` queries `doctors` where `user_id = auth.uid()`
3. RLS checks same condition

### Potential Issues Identified

1. **API Routes Not Passing Auth Context**
   - Next.js API routes may not be forwarding the Supabase auth session correctly
   - Need to verify `createServerClient` usage in API routes

2. **Client-Side Supabase Instance**
   - The `supabase` client in `/lib/supabase.ts` must have valid session

3. **Storage Bucket Policies**
   - Storage policies require folder structure: `{doctor_id}/filename`
   - May fail if path doesn't match expected pattern

### Resolution Steps

```yaml
Phase 1: Verify Auth Flow
  - Check /api/qr/route.ts uses createRouteHandlerClient
  - Verify session is available in server context
  - Add debug logging to identify where auth fails

Phase 2: Fix API Routes (if needed)
  - Ensure all new API routes use proper Supabase server client
  - Add error handling that returns detailed auth errors (dev only)

Phase 3: Test Flow
  - Login as doctor_admin
  - Attempt to create QR code
  - Verify RLS allows the operation
```

---

## 2. QR Code Flow - Complete Documentation

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     DOCTOR SIDE                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Doctor goes to /qr-codes/nuevo                              │
│                                                                  │
│  2. Selects campaign type:                                       │
│     • specialty_survey → Patient fills health questionnaire     │
│     • quick_profile → Patient creates basic profile             │
│     • appointment → Patient books appointment                   │
│                                                                  │
│  3. System generates:                                            │
│     • QR image (PNG)                                            │
│     • Shareable link: https://app.com/link/qr/{uuid}            │
│                                                                  │
│  4. Doctor shares via:                                           │
│     • Print QR for clinic                                       │
│     • Send link via WhatsApp/SMS                                │
│     • Email to patient                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     QR SCAN / LINK CLICK                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Patient scans QR or clicks link                             │
│                                                                  │
│  2. Hits /link/qr/[id] → middleware intercepts                  │
│                                                                  │
│  3. Middleware:                                                  │
│     • Fetches qr_link record (anon policy allows)              │
│     • Increments scans_count                                    │
│     • Checks expiration                                         │
│     • Redirects based on campaign_type                         │
│                                                                  │
│  4. Redirect destinations:                                       │
│     • specialty_survey → /patient/survey?qr={id}               │
│     • quick_profile → /patient/profile?qr={id}                 │
│     • appointment → /patient/appointments/new?qr={id}&doc={id} │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PATIENT SIDE                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SCENARIO A: Patient not logged in                              │
│  ─────────────────────────────────                              │
│  1. Show simplified form (no auth required)                     │
│  2. Collect basic info                                          │
│  3. Create patient record linked to doctor                      │
│  4. Optionally prompt to create account                         │
│                                                                  │
│  SCENARIO B: Patient already logged in                          │
│  ─────────────────────────────────────                          │
│  1. Pre-fill known information                                  │
│  2. Link to existing patient profile                            │
│  3. Complete requested action                                    │
│                                                                  │
│  SCENARIO C: Patient has account but not logged in              │
│  ─────────────────────────────────────────────────              │
│  1. Show login option                                            │
│  2. After login, proceed with action                            │
│  3. Link records if needed                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile QR Scanning

**For patients already in the app:**
1. Add QR scanner button to patient dashboard
2. Use `html5-qrcode` library (already researched)
3. Camera permission → scan → extract URL → navigate

**Implementation:**
```typescript
// components/patient/qr-scanner.tsx
import { Html5QrcodeScanner } from "html5-qrcode"

// Scans QR, extracts URL, validates it's our domain
// Then navigates to the appropriate patient flow
```

---

## 3. Patient-Side UI - Implementation Plan

### Current Patient Portal (`/user/`)

| Page | Status | Purpose |
|------|--------|---------|
| `/user/` | ✅ Exists | Dashboard with progress tracker |
| `/user/perfil` | ✅ Exists | Baseline health questionnaire |
| `/user/especialistas` | ✅ Exists | Find specialists |
| `/user/laboratorios` | ✅ Exists | Upload lab results |
| `/user/cuestionario` | ✅ Exists | Specialty surveys |

### Missing Pages (Need to Create)

| Page | Purpose | Priority |
|------|---------|----------|
| `/patient/survey` | QR landing - specialty survey | HIGH |
| `/patient/profile` | QR landing - quick profile creation | HIGH |
| `/patient/appointments/new` | QR landing - book appointment | HIGH |
| `/user/recetas` | View my prescriptions | HIGH |
| `/user/citas` | View my appointments | MEDIUM |
| `/user/qr-scanner` | Scan QR codes | MEDIUM |

### Page Specifications

#### `/patient/survey`
```yaml
Purpose: QR landing for specialty surveys
Auth: Optional (can work without login)
Params: ?qr={qr_id}
Flow:
  1. Fetch QR link to get doctor_id
  2. Show specialty-specific questionnaire
  3. On submit:
     - Create/update patient record
     - Link to doctor
     - Prompt for account creation
Mobile: Full responsive, touch-friendly inputs
```

#### `/patient/profile`
```yaml
Purpose: Quick patient profile creation
Auth: Optional
Params: ?qr={qr_id}
Flow:
  1. Minimal form: name, phone, email, DOB
  2. Create patient record linked to doctor
  3. Send confirmation (optional SMS/email)
Mobile: Single-column layout, large touch targets
```

#### `/patient/appointments/new`
```yaml
Purpose: Book appointment with specific doctor
Auth: Optional (account creation at end)
Params: ?qr={qr_id}&doctor_id={id}
Flow:
  1. Show doctor info and available slots
  2. Patient selects date/time
  3. Collect patient info if new
  4. Create appointment
Mobile: Calendar with touch-friendly date picker
```

#### `/user/recetas` (Prescriptions)
```yaml
Purpose: View patient's prescriptions
Auth: Required (patient must be logged in)
RLS: Uses patient_id policy
Features:
  - List all prescriptions
  - View details modal
  - Download PDF (signed ones)
  - Filter by status
Mobile: Card-based list, expandable details
```

---

## 4. Implementation Phases

### Phase 1: Fix Authorization (Day 1)

```yaml
Tasks:
  1.1: Verify /api/qr/route.ts auth setup
       - Check createRouteHandlerClient usage
       - Add debug logging
       - Test with known doctor account

  1.2: Add diagnostic endpoint
       - GET /api/debug/auth-check
       - Returns: auth.uid(), doctor lookup result, RLS test
       - Only in development

  1.3: Test all new features as doctor
       - Create QR code
       - Create prescription
       - Create consultorio
       - Submit verification docs
```

### Phase 2: QR Landing Pages (Day 2)

```yaml
Tasks:
  2.1: Create /app/patient/layout.tsx
       - Minimal layout for QR flows
       - No sidebar, clean design
       - Mobile-first responsive

  2.2: Create /app/patient/survey/page.tsx
       - Fetch QR link data
       - Dynamic specialty questionnaire
       - Patient creation/linking

  2.3: Create /app/patient/profile/page.tsx
       - Quick registration form
       - Link to doctor from QR

  2.4: Create /app/patient/appointments/new/page.tsx
       - Doctor availability view
       - Appointment booking flow
```

### Phase 3: Patient Portal Enhancements (Day 3)

```yaml
Tasks:
  3.1: Create /app/(user)/recetas/page.tsx
       - List prescriptions
       - View/download functionality

  3.2: Create /app/(user)/citas/page.tsx
       - Upcoming appointments
       - Appointment history

  3.3: Add QR Scanner component
       - Camera access
       - QR detection
       - URL validation and navigation
```

### Phase 4: QR Middleware & Flow (Day 4)

```yaml
Tasks:
  4.1: Create /app/link/qr/[id]/route.ts
       - Fetch QR link
       - Increment scan count
       - Handle expiration
       - Redirect to appropriate page

  4.2: Test complete flows
       - Doctor creates QR
       - Patient scans (3 campaign types)
       - Patient completes action
       - Data appears in doctor dashboard
```

---

## 5. Mobile Responsiveness Checklist

### Patient Pages Requirements

```yaml
Layout:
  - Single column on mobile (<768px)
  - Touch targets minimum 44x44px
  - Adequate spacing between interactive elements

Forms:
  - Full-width inputs on mobile
  - Native date pickers on mobile
  - Large submit buttons
  - Input zoom prevention (font-size >= 16px)

Navigation:
  - Bottom navigation for logged-in patients
  - Back button clearly visible
  - No hamburger menu for critical paths

QR Scanner:
  - Full-screen camera view
  - Clear scanning overlay
  - Instant feedback on successful scan
  - Fallback: manual link entry
```

---

## 6. Files to Create/Modify

### New Files

```
app/
├── patient/
│   ├── layout.tsx                    # Minimal patient flow layout
│   ├── survey/page.tsx               # Specialty survey QR landing
│   ├── profile/page.tsx              # Quick profile QR landing
│   └── appointments/
│       └── new/page.tsx              # Appointment booking QR landing
├── link/
│   └── qr/
│       └── [id]/
│           └── route.ts              # QR redirect handler
└── (user)/
    ├── recetas/page.tsx              # Patient prescriptions view
    └── citas/page.tsx                # Patient appointments view

components/
├── patient/
│   ├── qr-scanner.tsx                # QR code scanner component
│   ├── quick-profile-form.tsx        # Minimal registration form
│   └── survey-form.tsx               # Dynamic specialty survey
└── appointments/
    └── public-booking-calendar.tsx   # Doctor availability view
```

### Files to Modify

```
middleware.ts                         # Add /link/qr/* handling
app/api/qr/route.ts                   # Verify auth setup
hooks/use-app-user.ts                 # Already correct
components/layout/patient-nav.tsx     # Add recetas, citas links
```

---

## 7. Database Considerations

### No New Migrations Needed

All required tables exist:
- `qr_links` - Ready
- `prescriptions` - Ready
- `appointments` - Ready
- `patients` - Has `user_id` for linking

### RLS Verification Queries

```sql
-- Test doctor can create QR
INSERT INTO qr_links (doctor_id, campaign_type, redirect_url)
SELECT id, 'quick_profile', '/patient/profile'
FROM doctors WHERE user_id = auth.uid();

-- Test patient can view prescriptions
SELECT * FROM prescriptions
WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid());
```

---

## 8. Success Criteria

### Phase 1 Complete When:
- [ ] Doctor can create QR code without errors
- [ ] Doctor can create prescription without errors
- [ ] Doctor can create consultorio without errors
- [ ] Storage uploads work for verification docs

### Phase 2 Complete When:
- [ ] /patient/survey loads with QR param
- [ ] /patient/profile creates patient linked to doctor
- [ ] /patient/appointments/new shows doctor availability

### Phase 3 Complete When:
- [ ] Patient can view their prescriptions at /user/recetas
- [ ] Patient can view appointments at /user/citas
- [ ] QR scanner works on mobile

### Phase 4 Complete When:
- [ ] Full flow: doctor creates QR → patient scans → action completes
- [ ] Scan count increments
- [ ] Expired QRs show appropriate message

---

## 9. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Auth issues persist after Phase 1 | HIGH | Add fallback direct Supabase calls, detailed logging |
| Camera permissions denied | MEDIUM | Provide manual link entry fallback |
| Mobile browser compatibility | MEDIUM | Test on iOS Safari, Chrome Android early |
| RLS blocks legitimate operations | HIGH | Create debug mode to bypass RLS in development |

---

## Next Steps

1. **Approve this plan** or request modifications
2. Run `/workflows:work` to begin implementation
3. Start with Phase 1 (Authorization) as it blocks other phases
