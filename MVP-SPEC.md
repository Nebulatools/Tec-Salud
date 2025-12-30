# TecSalud / Zuli Health - MVP Specification

**Version**: 1.0
**Date**: 2025-12-29
**Target Users**: Doctors and Patients (simultaneous launch)

---

## Executive Summary

### MVP Scope Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth methods | Email + Google | Apple deferred, covers most users |
| Mobile | Web-responsive only | No native app for MVP |
| Doctor verification | Manual via Supabase | No admin panel needed |
| Appointment changes | Cancel only | No reschedule feature |
| AI interaction | View-only suggestions | Doctors type own notes |
| Family management | Simple add-only | No profile switching |
| Notifications | Email confirmations + in-app toasts | Full system deferred |
| Email provider | Resend | For transactional emails |

---

## 1. Authentication & Access

### 1.1 Login/Registration

**Features:**
- Email/password login and registration
- Google OAuth login button
- Password reset via magic link email

**Acceptance Criteria:**
- [ ] Google Sign-In button appears on login page
- [ ] Clicking Google button initiates OAuth flow
- [ ] Existing email accounts auto-merge with Google auth
- [ ] "Forgot password" link visible on login form
- [ ] Clicking "Forgot password" shows email input
- [ ] User receives magic link email within 60 seconds
- [ ] Magic link redirects to password reset form
- [ ] Password reset form validates new password (min 8 chars)

**Files to modify:**
- `components/auth/login-form.tsx`
- `app/auth/reset-password/page.tsx` (new)
- `lib/supabase-auth.ts`

### 1.2 Doctor Verification

**Features:**
- Unverified doctors cannot access features
- Unverified doctors hidden from marketplace

**Acceptance Criteria:**
- [ ] Unverified doctor sees "pending verification" screen
- [ ] All sidebar links disabled/greyed for unverified doctors
- [ ] Patient search/marketplace excludes unverified doctors
- [ ] Manual verification via Supabase dashboard (no admin UI)

**Files to modify:**
- `app/(dashboard)/layout.tsx`
- `app/user/especialistas/page.tsx`

---

## 2. Doctor Experience

### 2.1 Clinic Management

**Features:**
- View and edit clinic/consultorio details
- Upload clinic logo (optional)

**Acceptance Criteria:**
- [ ] Clinic list shows edit button for each clinic
- [ ] Edit page allows updating: name, address, phone, email, hours
- [ ] Logo upload accepts PNG/JPG, stores in Supabase Storage
- [ ] Logo preview shown after upload
- [ ] Changes saved with success toast notification

**Files to modify:**
- `app/(dashboard)/consultorios/[id]/editar/page.tsx` (new)
- `components/clinics/clinic-edit-form.tsx` (new)

### 2.2 Prescriptions

**Features:**
- Create, sign, and generate branded PDF prescriptions
- One-click signing (no PIN/password)
- Clinic-branded PDF with logo if available

**Acceptance Criteria:**
- [ ] Prescription PDF includes clinic logo when uploaded
- [ ] PDF falls back to generic header when no logo
- [ ] PDF includes doctor name, credentials, signature placeholder
- [ ] One-click "Sign" button finalizes prescription
- [ ] Signed prescriptions cannot be edited
- [ ] PDF download works for both doctor and patient

**Files to modify:**
- `components/prescriptions/prescription-pdf.tsx`
- `app/(dashboard)/recetas/[id]/page.tsx`

### 2.3 AI Consultation Assistant

**Features:**
- Audio transcription with manual entry fallback
- AI suggestions are view-only (display only)
- Doctor types own clinical notes

**Acceptance Criteria:**
- [ ] Transcription failure shows "Enter notes manually" option
- [ ] AI suggestions displayed in read-only panel
- [ ] Separate editable text area for doctor's notes
- [ ] Doctor's manual notes saved to medical report

**Files to modify:**
- `components/appointments/consultation-steps/consultation-recording.tsx`
- `components/appointments/consultation-steps/report-review.tsx`

### 2.4 Patient Expediente (Medical History)

**Features:**
- Full timeline view with expandable consultation cards
- Shows complete history of linked patients

**Acceptance Criteria:**
- [ ] Timeline displays all past consultations chronologically
- [ ] Each consultation is a collapsible card
- [ ] Expanded card shows: date, symptoms, diagnoses, prescriptions, notes
- [ ] Doctor can see all consultations for their linked patients
- [ ] Visual timeline indicators (dates, visit types)

**Files to modify:**
- `app/(dashboard)/expedientes/[patientId]/page.tsx` (new)
- `components/expedientes/patient-timeline.tsx` (new)
- `components/expedientes/consultation-card.tsx` (new)

---

## 3. Patient Experience

### 3.1 Doctor Marketplace

**Features:**
- Search and filter verified doctors
- Real ratings from patients (not simulated)
- Unlimited doctor relationships

**Acceptance Criteria:**
- [ ] Only verified doctors appear in search results
- [ ] Average rating displayed (or "New" if no ratings)
- [ ] Patient can book with multiple doctors
- [ ] Specialty filter works with 10 specialties

**Files to modify:**
- `app/user/especialistas/page.tsx`
- Database: Add `doctor_ratings` table

### 3.2 Rating System

**Features:**
- Rate doctor after consultation completes
- 1-5 stars with optional comment
- In-app prompt post-consultation

**Acceptance Criteria:**
- [ ] Rating prompt appears after consultation marked complete
- [ ] Star selector (1-5) is required
- [ ] Comment text field is optional
- [ ] Submit saves rating to database
- [ ] Rating reflects in doctor's marketplace average
- [ ] Patient can view their submitted ratings

**Database schema:**
```sql
CREATE TABLE doctor_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctors(id),
  patient_id UUID REFERENCES patients(id),
  appointment_id UUID REFERENCES appointments(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Files to create:**
- `app/api/ratings/route.ts`
- `components/ratings/rating-form.tsx`
- `components/ratings/rating-prompt.tsx`

### 3.3 Appointments

**Features:**
- View upcoming and past appointments
- Cancel appointments (no reschedule)
- Book via QR or marketplace

**Acceptance Criteria:**
- [ ] Cancel button with confirmation dialog
- [ ] Cancelled appointments move to history
- [ ] No reschedule button/feature

**Files to modify:**
- `app/user/citas/page.tsx`

### 3.4 Prescriptions

**Features:**
- View prescriptions with medication details
- Download prescription PDF

**Acceptance Criteria:**
- [ ] Prescription list shows all received prescriptions
- [ ] Expandable cards show medication details
- [ ] "Download PDF" button generates and downloads PDF
- [ ] PDF matches doctor-side format with clinic branding

**Files to modify:**
- `app/user/recetas/page.tsx`

### 3.5 Family Management

**Features:**
- Add dependents (children, elderly, etc.)
- Minimal info: name + relationship

**Acceptance Criteria:**
- [ ] "Add family member" button on profile/family page
- [ ] Modal with: Name field, Relationship dropdown
- [ ] Relationship options: Child, Spouse, Parent, Sibling, Other
- [ ] Added members appear in list
- [ ] Can book appointments for family members

**Files to create:**
- `app/user/familia/page.tsx`
- `components/family/add-member-modal.tsx`
- `components/family/family-list.tsx`

---

## 4. QR System

### 4.1 Patient Acquisition Flow

**Features:**
- QR auto-links patient to doctor on scan
- Questionnaire required for first-time patients
- Supports booking and survey QR types

**Acceptance Criteria:**
- [ ] Scanning QR creates `doctor_patient_links` automatically
- [ ] If patient hasn't completed specialty questionnaire, redirect to it
- [ ] After questionnaire, proceed to booking or profile
- [ ] QR short link works without authentication
- [ ] Patient can scan from phone camera or in-app scanner

**Files to modify:**
- `app/link/qr/[id]/route.ts`
- `app/patient/survey/page.tsx`
- `app/patient/appointments/new/page.tsx`

---

## 5. Notifications

### 5.1 Email Notifications

**Features:**
- Appointment confirmation email only
- Sent via Resend

**Acceptance Criteria:**
- [ ] Email sent immediately when appointment booked
- [ ] Email contains: doctor name, date, time, location
- [ ] Resend API integrated for sending
- [ ] Email template is clean and branded

**Files to create:**
- `lib/email/resend.ts`
- `lib/email/templates/appointment-confirmation.tsx`
- `app/api/email/send/route.ts`

### 5.2 In-App Notifications

**Features:**
- Bell icon with unread count
- Toast notifications (auto-dismiss 5s)
- Notification list

**Acceptance Criteria:**
- [ ] Bell icon in header shows unread count badge
- [ ] Clicking bell opens notification dropdown/panel
- [ ] Notifications marked read when viewed
- [ ] Toast appears for new notifications in real-time
- [ ] Toast auto-dismisses after 5 seconds
- [ ] Notification types: appointment confirmed, appointment cancelled, new prescription

**Database schema:**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Files to create:**
- `components/notifications/notification-bell.tsx`
- `components/notifications/notification-list.tsx`
- `components/notifications/toast-provider.tsx`
- `app/api/notifications/route.ts`
- `hooks/use-notifications.ts`

---

## 6. Specialties

### 6.1 Specialty Expansion

**Features:**
- 10 specialties with custom questionnaires
- Specialty-specific questions for each

**Specialties to add (7 new):**
1. Dermatología
2. Ginecología
3. Pediatría
4. Neurología
5. Oftalmología
6. Ortopedia
7. Psiquiatría

**Acceptance Criteria:**
- [ ] Database seeded with 10 specialties
- [ ] Each specialty has 3-5 custom questions
- [ ] Questions appear in patient questionnaire flow
- [ ] Doctor can select from all 10 specialties

**Files to modify:**
- `supabase/seed.sql` or migration
- `specialist_questions` table entries

---

## 7. Technical Requirements

### 7.1 Security

- [ ] Supabase RLS policies on all tables
- [ ] Verified doctor check on protected routes
- [ ] Auto-merge Google accounts with same email

### 7.2 Mobile Responsiveness

- [ ] All pages work on mobile viewport (375px+)
- [ ] Touch-friendly buttons (min 44px tap target)
- [ ] No horizontal scroll on mobile

### 7.3 Performance

- [ ] Page load < 3s on 3G
- [ ] Lazy load images and heavy components
- [ ] Supabase queries optimized with indexes

---

## Deferred to Post-MVP

| Feature | Reason |
|---------|--------|
| Apple Sign-In | Google covers most users |
| Appointment rescheduling | Cancel + rebook is acceptable |
| Admin verification panel | Manual Supabase verification works |
| AI accept/reject workflow | View-only is simpler |
| Profile switching for family | Add-only is sufficient |
| Email reminders (24h, 1h) | Confirmation-only for MVP |
| Full notification preferences | Basic notifications first |
| Doctor reviews (text moderation) | Ratings-only for MVP |
| Native mobile app | Responsive web is sufficient |

---

## Definition of Done

Each feature is complete when:
1. All acceptance criteria pass
2. Works on mobile and desktop
3. RLS policies applied (if database)
4. Error states handled gracefully
5. Loading states visible
6. No TypeScript errors
7. Tested manually end-to-end
