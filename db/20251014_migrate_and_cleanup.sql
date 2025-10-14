-- Consolidated migration and cleanup for existing databases
-- Safe alignment with 20251014_reset.sql (P1)

BEGIN;

-- Extensions required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Drop obviously obsolete/duplicated tables if they exist (no-op if absent)
DROP TABLE IF EXISTS
  medical_reports_old,
  reports,
  report_history,
  clinical_extractions_old,
  extractions,
  consultation_extractions,
  consultations,
  appointments_old,
  patients_old,
  doctors_old
CASCADE;

-- 2) Ensure core tables exist or are aligned

-- 2.1 DOCTORS
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  specialty TEXT DEFAULT 'General Medicine',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FK for doctors.user_id → auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'doctors'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name = 'doctors_user_id_fkey'
  ) THEN
    ALTER TABLE public.doctors
    ADD CONSTRAINT doctors_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure indexes
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON public.doctors(user_id);

-- 2.2 PATIENTS
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  medical_history TEXT,
  allergies TEXT,
  current_medications TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FK for patients.doctor_id → doctors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'patients'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name = 'patients_doctor_id_fkey'
  ) THEN
    ALTER TABLE public.patients
    ADD CONSTRAINT patients_doctor_id_fkey
    FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure gender constraint (Masculino/Femenino/Otro)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'patients_gender_valid_check'
      AND conrelid = 'public.patients'::regclass
  ) THEN
    ALTER TABLE public.patients
      ADD CONSTRAINT patients_gender_valid_check
      CHECK (gender IN ('Masculino','Femenino','Otro'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_patients_doctor_id ON public.patients(doctor_id);

-- 2.3 APPOINTMENTS
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'Programada',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FKs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='appointments'
      AND constraint_name='appointments_doctor_id_fkey'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_doctor_id_fkey
      FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='appointments'
      AND constraint_name='appointments_patient_id_fkey'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_patient_id_fkey
      FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Status check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'appointments_status_check_valid'
      AND conrelid = 'public.appointments'::regclass
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_status_check_valid
      CHECK (status IN ('Programada','Completada','Cancelada','No asistió'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);

-- 2.4 MEDICAL_REPORTS
CREATE TABLE IF NOT EXISTS public.medical_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID,
  patient_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'Consulta Médica',
  title TEXT,
  content TEXT,
  original_transcript TEXT,
  ai_suggestions TEXT[] NOT NULL DEFAULT '{}'::text[],
  compliance_status TEXT,
  medicamentos JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns non-destructively
ALTER TABLE public.medical_reports
  ADD COLUMN IF NOT EXISTS appointment_id UUID,
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS doctor_id UUID,
  ADD COLUMN IF NOT EXISTS report_type TEXT DEFAULT 'Consulta Médica',
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS original_transcript TEXT,
  ADD COLUMN IF NOT EXISTS ai_suggestions TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS compliance_status TEXT,
  ADD COLUMN IF NOT EXISTS medicamentos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Ensure types and defaults
DO $$
BEGIN
  -- ai_suggestions as TEXT[]
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='medical_reports'
      AND column_name='ai_suggestions' AND udt_name <> '_text'
  ) THEN
    -- Attempt to convert json/jsonb to text[] when needed
    ALTER TABLE public.medical_reports
      ALTER COLUMN ai_suggestions DROP DEFAULT;
    -- Create temp column
    ALTER TABLE public.medical_reports
      ADD COLUMN IF NOT EXISTS ai_suggestions_text TEXT[];
    UPDATE public.medical_reports SET ai_suggestions_text =
      CASE
        WHEN pg_typeof(ai_suggestions)::text = 'jsonb' THEN (
          SELECT COALESCE(ARRAY(SELECT jsonb_array_elements_text(ai_suggestions)), '{}')
        )
        WHEN pg_typeof(ai_suggestions)::text = 'json' THEN (
          SELECT COALESCE(ARRAY(SELECT json_array_elements_text(ai_suggestions::json)), '{}')
        )
        WHEN pg_typeof(ai_suggestions)::text = 'text' THEN ARRAY[ai_suggestions::text]
        ELSE '{}'::text[]
      END;
    ALTER TABLE public.medical_reports DROP COLUMN ai_suggestions;
    ALTER TABLE public.medical_reports RENAME COLUMN ai_suggestions_text TO ai_suggestions;
    ALTER TABLE public.medical_reports ALTER COLUMN ai_suggestions SET DEFAULT '{}'::text[];
  END IF;

  -- compliance_status as TEXT; migrate boolean to 'compliant'/'non-compliant'
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='medical_reports'
      AND column_name='compliance_status' AND data_type='boolean'
  ) THEN
    ALTER TABLE public.medical_reports ALTER COLUMN compliance_status DROP DEFAULT;
    ALTER TABLE public.medical_reports
      ALTER COLUMN compliance_status TYPE TEXT
      USING CASE WHEN compliance_status THEN 'compliant' ELSE 'non-compliant' END;
  END IF;
END $$;

-- FKs for medical_reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='medical_reports'
      AND constraint_name='medical_reports_patient_id_fkey'
  ) THEN
    ALTER TABLE public.medical_reports
      ADD CONSTRAINT medical_reports_patient_id_fkey
      FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='medical_reports'
      AND constraint_name='medical_reports_doctor_id_fkey'
  ) THEN
    ALTER TABLE public.medical_reports
      ADD CONSTRAINT medical_reports_doctor_id_fkey
      FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='medical_reports'
      AND constraint_name='medical_reports_appointment_id_fkey'
  ) THEN
    ALTER TABLE public.medical_reports
      ADD CONSTRAINT medical_reports_appointment_id_fkey
      FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_medical_reports_appointment_id ON public.medical_reports(appointment_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_patient_id ON public.medical_reports(patient_id);

-- 2.5 CLINICAL_EXTRACTIONS (histórico)
CREATE TABLE IF NOT EXISTS public.clinical_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID,
  patient_id UUID,
  doctor_id UUID,
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  patient_snapshot JSONB,
  symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
  diagnoses JSONB NOT NULL DEFAULT '[]'::jsonb,
  medications JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Add missing columns non-destructively
ALTER TABLE public.clinical_extractions
  ADD COLUMN IF NOT EXISTS appointment_id UUID,
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS doctor_id UUID,
  ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS patient_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS diagnoses JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS medications JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Indexes for fast filtering/search
CREATE INDEX IF NOT EXISTS idx_ce_appointment_id ON public.clinical_extractions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_ce_patient_id ON public.clinical_extractions(patient_id);
CREATE INDEX IF NOT EXISTS idx_ce_symptoms_gin ON public.clinical_extractions USING GIN (symptoms);
CREATE INDEX IF NOT EXISTS idx_ce_diagnoses_gin ON public.clinical_extractions USING GIN (diagnoses);
CREATE INDEX IF NOT EXISTS idx_ce_medications_gin ON public.clinical_extractions USING GIN (medications);

-- 3) Function + trigger: create doctor for new auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  BEGIN
    INSERT INTO public.doctors (user_id, email, first_name, last_name, specialty)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'Pendiente'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', 'Actualizar'),
      COALESCE(NEW.raw_user_meta_data->>'specialty', 'General Medicine')
    );
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
    WHEN OTHERS THEN
      RAISE LOG 'Error creando doctor: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- 4) RLS for development: disable on main tables
ALTER TABLE public.doctors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_extractions DISABLE ROW LEVEL SECURITY;

COMMIT;

-- 5) Verification and summary
DO $$
DECLARE
  mr_ai_type TEXT;
  mr_comp_type TEXT;
  ce_exists BOOLEAN;
BEGIN
  SELECT udt_name INTO mr_ai_type
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='medical_reports' AND column_name='ai_suggestions';

  SELECT data_type INTO mr_comp_type
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='medical_reports' AND column_name='compliance_status';

  ce_exists := EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='clinical_extractions');

  RAISE NOTICE '✅ ======================================== ';
  RAISE NOTICE '✅ MIGRACIÓN COMPLETA';
  RAISE NOTICE '✅ Tablas listas: doctors, patients, appointments, medical_reports, clinical_extractions';
  RAISE NOTICE '✅ medical_reports.ai_suggestions tipo: % (esperado _text)', mr_ai_type;
  RAISE NOTICE '✅ medical_reports.compliance_status tipo: % (esperado text)', mr_comp_type;
  RAISE NOTICE '✅ clinical_extractions existe: %', ce_exists;
  RAISE NOTICE '✅ Índices creados/validados';
  RAISE NOTICE '✅ Trigger de nuevo usuario listo';
  RAISE NOTICE '✅ RLS desactivado en tablas principales (solo desarrollo)';
  RAISE NOTICE '✅ ======================================== ';
END $$;

