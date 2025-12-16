BEGIN;
-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('user', 'doctor_admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doctor_role') THEN
    CREATE TYPE public.doctor_role AS ENUM ('admin', 'user');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doctor_patient_status') THEN
    CREATE TYPE public.doctor_patient_status AS ENUM ('pending', 'accepted', 'rejected', 'revoked');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'field_kind') THEN
    CREATE TYPE public.field_kind AS ENUM ('short_text','long_text','number','date','boolean','single_select','multi_select');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lab_order_status') THEN
    CREATE TYPE public.lab_order_status AS ENUM ('pending_upload','awaiting_review','reviewed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'virtual_intern_status') THEN
    CREATE TYPE public.virtual_intern_status AS ENUM ('pending','processing','succeeded','failed');
  END IF;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  full_name TEXT,
  phone TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON public.app_users(role);

CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  specialty TEXT DEFAULT 'General Medicine',
  doctor_role public.doctor_role NOT NULL DEFAULT 'user',
  is_specialist BOOLEAN NOT NULL DEFAULT FALSE,
  profile_id UUID UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT doctors_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.app_users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON public.doctors(user_id);

CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  user_id UUID UNIQUE REFERENCES public.app_users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('Masculino','Femenino','Otro')),
  phone TEXT,
  email TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  medical_history TEXT,
  allergies TEXT,
  current_medications TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_patients_doctor_id ON public.patients(doctor_id);

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_user_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'Programada' CHECK (status IN ('Programada','Completada','Cancelada','No asistió')),
  notes TEXT,
  diagnosis TEXT,
  treatment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);

CREATE TABLE IF NOT EXISTS public.medical_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_user_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  specialty_id UUID REFERENCES public.specialties(id) ON DELETE SET NULL,
  specialist_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  report_type TEXT NOT NULL DEFAULT 'Consulta Médica',
  title TEXT,
  content TEXT,
  original_transcript TEXT,
  ai_suggestions TEXT[] NOT NULL DEFAULT '{}'::text[],
  compliance_status TEXT,
  medicamentos JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_medical_reports_appointment_id ON public.medical_reports(appointment_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_patient_id ON public.medical_reports(patient_id);

CREATE TABLE IF NOT EXISTS public.clinical_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID,
  patient_id UUID,
  doctor_id UUID,
  patient_user_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  patient_snapshot JSONB,
  symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
  diagnoses JSONB NOT NULL DEFAULT '[]'::jsonb,
  medications JSONB NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_ce_appointment_id ON public.clinical_extractions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_ce_patient_id ON public.clinical_extractions(patient_id);
CREATE INDEX IF NOT EXISTS idx_ce_symptoms_gin ON public.clinical_extractions USING GIN (symptoms);
CREATE INDEX IF NOT EXISTS idx_ce_diagnoses_gin ON public.clinical_extractions USING GIN (diagnoses);
CREATE INDEX IF NOT EXISTS idx_ce_medications_gin ON public.clinical_extractions USING GIN (medications);

CREATE TABLE IF NOT EXISTS public.patient_profiles (
  id UUID PRIMARY KEY REFERENCES public.app_users(id) ON DELETE CASCADE,
  baseline_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.patient_baseline_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  general_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  vitals JSONB NOT NULL DEFAULT '{}'::jsonb,
  lifestyle JSONB NOT NULL DEFAULT '{}'::jsonb,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT ux_baseline_patient_user UNIQUE (patient_user_id)
);

CREATE TABLE IF NOT EXISTS public.doctor_patient_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  status public.doctor_patient_status NOT NULL DEFAULT 'pending',
  requested_by TEXT NOT NULL CHECK (requested_by IN ('doctor','patient')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  notes TEXT,
  CONSTRAINT ux_doctor_patient_link UNIQUE (doctor_id, patient_user_id)
);

CREATE TABLE IF NOT EXISTS public.specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.doctor_specialties (
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  specialty_id UUID NOT NULL REFERENCES public.specialties(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_specialist_responses_patient_specialty ON public.specialist_responses(patient_user_id, specialty_id);

CREATE TABLE IF NOT EXISTS public.lab_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  specialty_id UUID REFERENCES public.specialties(id) ON DELETE SET NULL,
  recommended_tests JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  status public.lab_order_status NOT NULL DEFAULT 'pending_upload',
  recommended_at TIMESTAMPTZ NOT NULL DEFAULT now(),
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
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_virtual_intern_patient ON public.virtual_intern_runs(patient_user_id);

-- Trigger: handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  desired_role TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  safe_role public.app_role := 'user';
  first_name TEXT := COALESCE(NEW.raw_user_meta_data->>'first_name', 'Pendiente');
  last_name  TEXT := COALESCE(NEW.raw_user_meta_data->>'last_name', 'Actualizar');
  full_name  TEXT := trim(both ' ' FROM CONCAT(first_name, ' ', last_name));
  specialty  TEXT := COALESCE(NEW.raw_user_meta_data->>'specialty', 'General Medicine');
BEGIN
  IF desired_role IN ('doctor_admin','doctor') THEN
    safe_role := 'doctor_admin';
  END IF;

  INSERT INTO public.app_users (id,email,role,full_name,metadata)
  VALUES (NEW.id, NEW.email, safe_role, NULLIF(full_name,''), COALESCE(NEW.raw_user_meta_data,'{}'::jsonb))
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        metadata = EXCLUDED.metadata,
        updated_at = now();

  IF safe_role = 'doctor_admin' THEN
    INSERT INTO public.doctors (user_id,email,first_name,last_name,specialty,doctor_role,is_specialist,profile_id)
    VALUES (NEW.id, NEW.email, first_name, last_name, specialty, 'admin', TRUE, NEW.id)
    ON CONFLICT (user_id) DO UPDATE
      SET email = EXCLUDED.email,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          specialty = EXCLUDED.specialty,
          doctor_role = 'admin',
          is_specialist = EXCLUDED.is_specialist,
          profile_id = EXCLUDED.profile_id,
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS enable
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_baseline_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_patient_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_intern_runs ENABLE ROW LEVEL SECURITY;

-- Policies
-- app_users: self read/write; doctor can read linked patients
DROP POLICY IF EXISTS app_users_self_select ON public.app_users;
DROP POLICY IF EXISTS app_users_self_update ON public.app_users;
DROP POLICY IF EXISTS app_users_doctor_read_linked ON public.app_users;
CREATE POLICY app_users_self_select ON public.app_users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);
CREATE POLICY app_users_self_update ON public.app_users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
CREATE POLICY app_users_doctor_read_linked ON public.app_users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM doctors d
      JOIN doctor_patient_links l ON l.doctor_id = d.id
      WHERE d.user_id = auth.uid()
        AND l.patient_user_id = app_users.id
        AND l.status = 'accepted'
    )
  );

-- doctors: allow all (since safe data), adjust if needed
DROP POLICY IF EXISTS allow_all_doctors ON public.doctors;
CREATE POLICY allow_all_doctors ON public.doctors FOR SELECT TO authenticated USING (true);

-- specialties: allow all read
DROP POLICY IF EXISTS allow_all_specialties ON public.specialties;
CREATE POLICY allow_all_specialties ON public.specialties FOR SELECT TO authenticated USING (true);

-- doctor_patient_links
DROP POLICY IF EXISTS patient_read_own_links ON public.doctor_patient_links;
DROP POLICY IF EXISTS patient_insert_own_links ON public.doctor_patient_links;
DROP POLICY IF EXISTS doctor_read_links ON public.doctor_patient_links;
DROP POLICY IF EXISTS doctor_update_links ON public.doctor_patient_links;
CREATE POLICY patient_read_own_links ON public.doctor_patient_links
  FOR SELECT TO authenticated
  USING (patient_user_id = auth.uid());
CREATE POLICY patient_insert_own_links ON public.doctor_patient_links
  FOR INSERT TO authenticated
  WITH CHECK (patient_user_id = auth.uid());
CREATE POLICY doctor_read_links ON public.doctor_patient_links
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM doctors d WHERE d.id = doctor_patient_links.doctor_id AND d.user_id = auth.uid()));
CREATE POLICY doctor_update_links ON public.doctor_patient_links
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM doctors d WHERE d.id = doctor_patient_links.doctor_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM doctors d WHERE d.id = doctor_patient_links.doctor_id AND d.user_id = auth.uid()));

-- specialist_questions
DROP POLICY IF EXISTS allow_all_specialist_questions ON public.specialist_questions;
CREATE POLICY allow_all_specialist_questions ON public.specialist_questions
  FOR SELECT TO authenticated USING (true);

-- specialist_responses
DROP POLICY IF EXISTS patient_read_specialist_responses ON public.specialist_responses;
DROP POLICY IF EXISTS patient_write_specialist_responses ON public.specialist_responses;
DROP POLICY IF EXISTS doctor_read_specialist_responses ON public.specialist_responses;
CREATE POLICY patient_read_specialist_responses ON public.specialist_responses
  FOR SELECT TO authenticated
  USING (patient_user_id = auth.uid());
CREATE POLICY patient_write_specialist_responses ON public.specialist_responses
  FOR INSERT TO authenticated
  WITH CHECK (patient_user_id = auth.uid());
CREATE POLICY doctor_read_specialist_responses ON public.specialist_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM doctors d WHERE d.id = specialist_responses.doctor_id AND d.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM doctor_patient_links l JOIN doctors d ON l.doctor_id = d.id
      WHERE l.patient_user_id = specialist_responses.patient_user_id
        AND l.status = 'accepted'
        AND d.user_id = auth.uid()
    )
  );

-- lab_orders
DROP POLICY IF EXISTS patient_read_own_lab_orders ON public.lab_orders;
DROP POLICY IF EXISTS patient_insert_own_lab_orders ON public.lab_orders;
DROP POLICY IF EXISTS patient_update_own_lab_orders ON public.lab_orders;
DROP POLICY IF EXISTS doctor_read_lab_orders ON public.lab_orders;
DROP POLICY IF EXISTS doctor_insert_lab_orders ON public.lab_orders;
DROP POLICY IF EXISTS doctor_update_lab_orders ON public.lab_orders;
CREATE POLICY patient_read_own_lab_orders ON public.lab_orders
  FOR SELECT TO authenticated
  USING (auth.uid() = patient_user_id);
CREATE POLICY patient_insert_own_lab_orders ON public.lab_orders
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = patient_user_id);
CREATE POLICY patient_update_own_lab_orders ON public.lab_orders
  FOR UPDATE TO authenticated
  USING (auth.uid() = patient_user_id)
  WITH CHECK (auth.uid() = patient_user_id);
CREATE POLICY doctor_read_lab_orders ON public.lab_orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM doctors d WHERE d.user_id = auth.uid() AND d.id = lab_orders.doctor_id)
    OR EXISTS (
      SELECT 1 FROM doctor_patient_links l JOIN doctors d ON l.doctor_id = d.id
      WHERE l.patient_user_id = lab_orders.patient_user_id
        AND l.status = 'accepted'
        AND d.user_id = auth.uid()
    )
  );
CREATE POLICY doctor_insert_lab_orders ON public.lab_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM doctors d WHERE d.user_id = auth.uid() AND d.id = lab_orders.doctor_id)
    OR EXISTS (
      SELECT 1 FROM doctor_patient_links l JOIN doctors d ON l.doctor_id = d.id
      WHERE l.patient_user_id = lab_orders.patient_user_id
        AND l.status = 'accepted'
        AND d.user_id = auth.uid()
    )
  );
CREATE POLICY doctor_update_lab_orders ON public.lab_orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM doctors d WHERE d.user_id = auth.uid() AND d.id = lab_orders.doctor_id)
    OR EXISTS (
      SELECT 1 FROM doctor_patient_links l JOIN doctors d ON l.doctor_id = d.id
      WHERE l.patient_user_id = lab_orders.patient_user_id
        AND l.status = 'accepted'
        AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM doctors d WHERE d.user_id = auth.uid() AND d.id = lab_orders.doctor_id)
    OR EXISTS (
      SELECT 1 FROM doctor_patient_links l JOIN doctors d ON l.doctor_id = d.id
      WHERE l.patient_user_id = lab_orders.patient_user_id
        AND l.status = 'accepted'
        AND d.user_id = auth.uid()
    )
  );

-- lab_results
DROP POLICY IF EXISTS patient_read_own_lab_results ON public.lab_results;
DROP POLICY IF EXISTS patient_insert_own_lab_results ON public.lab_results;
DROP POLICY IF EXISTS patient_update_own_lab_results ON public.lab_results;
DROP POLICY IF EXISTS doctor_read_lab_results ON public.lab_results;
DROP POLICY IF EXISTS doctor_insert_lab_results ON public.lab_results;
DROP POLICY IF EXISTS doctor_update_lab_results ON public.lab_results;
CREATE POLICY patient_read_own_lab_results ON public.lab_results
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM lab_orders lo WHERE lo.id = lab_results.lab_order_id AND lo.patient_user_id = auth.uid()));
CREATE POLICY patient_insert_own_lab_results ON public.lab_results
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM lab_orders lo WHERE lo.id = lab_results.lab_order_id AND lo.patient_user_id = auth.uid()));
CREATE POLICY patient_update_own_lab_results ON public.lab_results
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM lab_orders lo WHERE lo.id = lab_results.lab_order_id AND lo.patient_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM lab_orders lo WHERE lo.id = lab_results.lab_order_id AND lo.patient_user_id = auth.uid()));
CREATE POLICY doctor_read_lab_results ON public.lab_results
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lab_orders lo JOIN doctors d ON d.id = lo.doctor_id
      WHERE lo.id = lab_results.lab_order_id AND d.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM lab_orders lo
      JOIN doctor_patient_links l ON l.patient_user_id = lo.patient_user_id
      JOIN doctors d ON d.id = l.doctor_id
      WHERE lo.id = lab_results.lab_order_id AND l.status = 'accepted' AND d.user_id = auth.uid()
    )
  );
CREATE POLICY doctor_insert_lab_results ON public.lab_results
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lab_orders lo JOIN doctors d ON d.id = lo.doctor_id
      WHERE lo.id = lab_results.lab_order_id AND d.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM lab_orders lo
      JOIN doctor_patient_links l ON l.patient_user_id = lo.patient_user_id
      JOIN doctors d ON d.id = l.doctor_id
      WHERE lo.id = lab_results.lab_order_id AND l.status = 'accepted' AND d.user_id = auth.uid()
    )
  );
CREATE POLICY doctor_update_lab_results ON public.lab_results
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lab_orders lo JOIN doctors d ON d.id = lo.doctor_id
      WHERE lo.id = lab_results.lab_order_id AND d.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM lab_orders lo
      JOIN doctor_patient_links l ON l.patient_user_id = lo.patient_user_id
      JOIN doctors d ON d.id = l.doctor_id
      WHERE lo.id = lab_results.lab_order_id AND l.status = 'accepted' AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lab_orders lo JOIN doctors d ON d.id = lo.doctor_id
      WHERE lo.id = lab_results.lab_order_id AND d.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM lab_orders lo
      JOIN doctor_patient_links l ON l.patient_user_id = lo.patient_user_id
      JOIN doctors d ON d.id = l.doctor_id
      WHERE lo.id = lab_results.lab_order_id AND l.status = 'accepted' AND d.user_id = auth.uid()
    )
  );

-- patient_profiles, patient_baseline_forms: simple self/doctor read if linked
DROP POLICY IF EXISTS patient_profiles_self_read ON public.patient_profiles;
CREATE POLICY patient_profiles_self_read ON public.patient_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS patient_baseline_forms_self_read ON public.patient_baseline_forms;
CREATE POLICY patient_baseline_forms_self_read ON public.patient_baseline_forms FOR SELECT TO authenticated USING (patient_user_id = auth.uid());

-- virtual_intern_runs, clinical_extractions, medical_reports, appointments, patients: left permissive for now (adjust per need)
DROP POLICY IF EXISTS allow_all_virtual_intern_runs ON public.virtual_intern_runs;
CREATE POLICY allow_all_virtual_intern_runs ON public.virtual_intern_runs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS allow_all_clinical_extractions ON public.clinical_extractions;
CREATE POLICY allow_all_clinical_extractions ON public.clinical_extractions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS allow_all_medical_reports ON public.medical_reports;
CREATE POLICY allow_all_medical_reports ON public.medical_reports FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS allow_all_appointments ON public.appointments;
CREATE POLICY allow_all_appointments ON public.appointments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS allow_all_patients ON public.patients;
CREATE POLICY allow_all_patients ON public.patients FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS allow_all_doctor_specialties ON public.doctor_specialties;
CREATE POLICY allow_all_doctor_specialties ON public.doctor_specialties FOR SELECT TO authenticated USING (true);

-- Storage bucket policies (lab-results) in storage.objects
-- (These are set in storage schema normally; included here for completeness)
-- Note: adjust to run in storage schema if needed.
-- patient upload/read + doctor read
COMMIT;
