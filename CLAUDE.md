# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EzyAI is a medical management system (Sistema de Gestión Médica) built for doctors to manage patients, appointments, and medical reports. The key differentiator is AI-powered consultation transcription using Google Gemini.

## Tech Stack

- **Framework**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS + Radix UI primitives (shadcn/ui pattern)
- **Backend**: Supabase (PostgreSQL, Auth, real-time)
- **AI**: Google Gemini API for audio transcription and clinical text processing
- **Testing**: Vitest (unit/integration), Playwright (E2E), MSW (API mocking)

## Commands

```bash
pnpm dev          # Start development server
pnpm build        # Production build
pnpm lint         # ESLint (JS only, flat config)
pnpm typecheck    # TypeScript check
pnpm test         # Unit/integration tests (Vitest)
pnpm test:watch   # Vitest in watch mode
pnpm test:cov     # Tests with coverage (85% lines threshold)
pnpm test:e2e     # Playwright E2E tests
pnpm test:all     # Full validation: lint + typecheck + test + e2e
```

## Architecture

### Directory Structure

```
app/
├── (dashboard)/           # Protected routes with sidebar layout
│   ├── consultas/         # Appointment/consultation management
│   ├── dashboard/         # Main dashboard with stats
│   └── expedientes/       # Patient records
├── api/                   # Next.js API routes
│   ├── transcribe/        # Audio → text via Gemini
│   ├── parse-transcript/  # Extract clinical data from text
│   ├── clinical-extractions/  # Store extraction results
│   ├── enrich-report/     # AI-enhanced report generation
│   └── medical-reports/   # CRUD for reports
└── login/                 # Public auth page

components/
├── appointments/          # Consultation flow components
│   └── consultation-steps/  # Multi-step wizard (recording → verification → report)
├── auth/                  # Login/registration forms
├── dashboard/             # Stats, calendar, pending appointments
├── patients/              # Patient CRUD components
├── reports/               # Medical report management
└── ui/                    # shadcn/ui base components

lib/
├── supabase.ts           # Supabase client + Database types
└── utils.ts              # cn() helper for Tailwind merging

hooks/
└── use-auth.ts           # Auth state management hook
```

### Authentication Flow

- `hooks/use-auth.ts` manages auth state via Supabase client
- Dashboard layout (`app/(dashboard)/layout.tsx`) protects all child routes
- Unauthenticated users are redirected to `/login`

### Consultation Workflow

The core feature is a multi-step consultation flow:
1. **Patient Summary** - Review patient info before consultation
2. **Recording** - Audio recording of consultation
3. **Transcription** - `POST /api/transcribe` converts audio to text
4. **Clinical Extraction** - `POST /api/parse-transcript` extracts symptoms, diagnoses, medications
5. **Report Verification** - Doctor reviews and edits extracted data
6. **Final Report** - `POST /api/enrich-report` generates formatted medical report

### Database Schema

Tables defined in `lib/supabase.ts` with TypeScript types:
- `doctors` - Doctor profiles (linked to Supabase Auth users)
- `patients` - Patient records (belong to doctors)
- `appointments` - Scheduled consultations with status tracking
- `medical_reports` - Generated reports with AI suggestions
- `clinical_extractions` - Structured clinical data (symptoms, diagnoses, medications)

## Testing

- **Test location**: `tests/` directory
- **Unit tests**: `tests/unit/` - Schema validation, component rendering
- **Integration tests**: `tests/integration/` - API route testing with MSW
- **E2E tests**: `tests/e2e/` - Full consultation flow
- **Setup**: `tests/setup/setupTests.ts` configures MSW server, silences React warnings
- **Fixtures**: `tests/fixtures/transcripts/` contains sample transcripts

MSW handlers mock external APIs (Gemini, Supabase) for deterministic testing.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
GEMINI_API_KEY=<google-ai-api-key>
```

## Key Patterns

- **Path alias**: `@/` maps to project root (e.g., `@/components/ui/button`)
- **Client components**: Use `"use client"` directive for hooks/interactivity
- **Form handling**: react-hook-form + zod for validation
- **Date handling**: date-fns library with Spanish locale considerations
- **Styling**: Use `cn()` from `lib/utils.ts` for conditional class merging
