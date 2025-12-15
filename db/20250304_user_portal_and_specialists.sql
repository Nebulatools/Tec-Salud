-- Migration: user portal, doctor roles, specialist flows, labs, and virtual intern
-- Safe, additive migration (no destructive changes)
-- Run in Supabase SQL editor or CLI against project didbxinquugseweufvpr

BEGIN;

-- Ensure UUID generation helpers
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums ----------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('user', 'doctor_admin');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doctor_role') THEN
    CREATE TYPE public.doctor_role AS ENUM ('admin', 'user');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doctor_patient_status') THEN
    CREATE TYPE public.doctor_patient_status AS ENUM ('pending', 'accepted', 'rejected', 'revoked');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'field_kind') THEN
    CREATE TYPE public.field_kind AS ENUM (
      'short_text', 'long_text', 'number', 'date', 'boolean', 'single_select', 'multi_select'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lab_order_status') THEN
    CREATE TYPE public.lab_order_status AS ENUM ('pending_upload', 'awaiting_review', 'reviewed');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'virtual_intern_status') THEN
    CREATE TYPE public.virtual_intern_status AS ENUM ('pending', 'processing', 'succeeded', 'failed');
  END IF;
END $$;

-- Core app_users to hold roles for any auth user -----------------------------
CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  full_name TEXT,
  phone TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_users_role ON public.app_users(role);

-- Doctors: add role + specialist flag + link to app_users --------------------
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS doctor_role public.doctor_role NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS is_specialist BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS profile_id UUID UNIQUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'doctors_profile_id_fkey'
      AND conrelid = 'public.doctors'::regclass
  ) THEN
    ALTER TABLE public.doctors
      ADD CONSTRAINT doctors_profile_id_fkey
      FOREIGN KEY (profile_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.doctors d
SET profile_id = au.id
FROM public.app_users au
WHERE d.profile_id IS NULL AND au.email = d.email;

-- Patients: optional link to authenticated user
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES public.app_users(id) ON DELETE SET NULL;

-- Patient profile + baseline form -------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_profiles (
  id UUID PRIMARY KEY REFERENCES public.app_users(id) ON DELETE CASCADE,
  baseline_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.patient_baseline_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  general_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  vitals JSONB NOT NULL DEFAULT '{}'::jsonb,
  lifestyle JSONB NOT NULL DEFAULT '{}'::jsonb,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_baseline_patient_user ON public.patient_baseline_forms(patient_user_id);

-- Doctor-patient linking with approvals --------------------------------------
CREATE TABLE IF NOT EXISTS public.doctor_patient_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  status public.doctor_patient_status NOT NULL DEFAULT 'pending',
  requested_by TEXT NOT NULL CHECK (requested_by IN ('doctor', 'patient')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  notes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_doctor_patient_link ON public.doctor_patient_links(doctor_id, patient_user_id);

-- Specialties & question bank for specialist flows ---------------------------
CREATE TABLE IF NOT EXISTS public.specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.doctor_specialties (
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  specialty_id UUID NOT NULL REFERENCES public.specialties(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (doctor_id, specialty_id)
);

CREATE TABLE IF NOT EXISTS public.specialist_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty_id UUID NOT NULL REFERENCES public.specialties(id) ON DELETE CASCADE,
  created_by_doctor UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  field_type public.field_kind NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_specialist_questions_specialty ON public.specialist_questions(specialty_id);

CREATE TABLE IF NOT EXISTS public.specialist_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  specialty_id UUID NOT NULL REFERENCES public.specialties(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.specialist_questions(id) ON DELETE CASCADE,
  answer JSONB,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_specialist_responses_patient_specialty ON public.specialist_responses(patient_user_id, specialty_id);

-- Labs: recommendations and uploads -----------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  specialty_id UUID REFERENCES public.specialties(id) ON DELETE SET NULL,
  recommended_tests JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  status public.lab_order_status NOT NULL DEFAULT 'pending_upload',
  recommended_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.doctors(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON public.lab_orders(patient_user_id);

CREATE TABLE IF NOT EXISTS public.lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id UUID NOT NULL REFERENCES public.lab_orders(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  uploaded_by UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Virtual intern runs --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.virtual_intern_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  lab_order_id UUID REFERENCES public.lab_orders(id) ON DELETE SET NULL,
  specialty_id UUID REFERENCES public.specialties(id) ON DELETE SET NULL,
  status public.virtual_intern_status NOT NULL DEFAULT 'pending',
  summary TEXT,
  suggestions TEXT[] NOT NULL DEFAULT '{}'::text[],
  error TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_virtual_intern_patient ON public.virtual_intern_runs(patient_user_id);

-- Appointments / reports: optional linkage to authenticated user & specialty --
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS patient_user_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL;

ALTER TABLE public.medical_reports
  ADD COLUMN IF NOT EXISTS patient_user_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS specialty_id UUID REFERENCES public.specialties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS specialist_context JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.clinical_extractions
  ADD COLUMN IF NOT EXISTS patient_user_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL;

-- Trigger to auto-provision roles and doctor rows ----------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  desired_role TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  safe_role public.app_role := 'user';
  first_name TEXT := COALESCE(NEW.raw_user_meta_data->>'first_name', 'Pendiente');
  last_name TEXT := COALESCE(NEW.raw_user_meta_data->>'last_name', 'Actualizar');
  full_name TEXT := trim(both ' ' FROM CONCAT(first_name, ' ', last_name));
  specialty TEXT := COALESCE(NEW.raw_user_meta_data->>'specialty', 'General Medicine');
BEGIN
  IF desired_role IN ('doctor_admin', 'doctor_specialist') THEN
    safe_role := 'doctor_admin';
  END IF;

  INSERT INTO public.app_users (id, email, role, full_name, metadata)
  VALUES (NEW.id, NEW.email, safe_role, NULLIF(full_name, ''), COALESCE(NEW.raw_user_meta_data, '{}'::jsonb))
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();

  IF safe_role = 'doctor_admin' THEN
    INSERT INTO public.doctors (user_id, email, first_name, last_name, specialty, doctor_role, is_specialist, profile_id)
    VALUES (NEW.id, NEW.email, first_name, last_name, specialty, 'admin', TRUE, NEW.id)
    ON CONFLICT (user_id) DO UPDATE
      SET email = EXCLUDED.email,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          specialty = EXCLUDED.specialty,
          doctor_role = 'admin',
          is_specialist = EXCLUDED.is_specialist,
          profile_id = EXCLUDED.profile_id,
          updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS alignment: keep disabled for now (match current dev posture) ------------
ALTER TABLE public.app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_baseline_forms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_patient_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialties DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_specialties DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_intern_runs DISABLE ROW LEVEL SECURITY;

COMMIT;

-- Notes:
-- - New users default to role 'user'. Set raw_user_meta_data.role to 'doctor_admin' to auto-provision doctor rows.
-- - patient_user_id columns let patient-side flows work even before a doctor link exists.
-- - lab_results.storage_path expects a Supabase Storage bucket (create manually, see docs).
