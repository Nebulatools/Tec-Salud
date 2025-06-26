-- SCHEMA COMPLETO SIN RLS PARA QUE FUNCIONE EL REGISTRO
-- COPIA Y PEGA ESTE ARCHIVO COMPLETO EN SUPABASE SQL EDITOR

-- ========================================
-- 1. LIMPIAR TODO LO ANTERIOR
-- ========================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS medical_reports CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS validate_user_exists() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ========================================
-- 2. CREAR TODAS LAS TABLAS
-- ========================================

-- Create doctors table (SIN FOREIGN KEY Y SIN RLS)
CREATE TABLE doctors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    specialty VARCHAR(100) NOT NULL,
    license_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create patients table
CREATE TABLE patients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) CHECK (gender IN ('Masculino', 'Femenino', 'Otro')) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    medical_history TEXT,
    allergies TEXT,
    current_medications TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create appointments table
CREATE TABLE appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Programada', 'Completada', 'Cancelada', 'No asistió')) DEFAULT 'Programada',
    notes TEXT,
    diagnosis TEXT,
    treatment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create medical_reports table
CREATE TABLE medical_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    report_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    original_transcript TEXT,
    ai_suggestions JSONB,
    compliance_status BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 3. CREAR ÍNDICES PARA PERFORMANCE
-- ========================================

CREATE INDEX idx_doctors_user_id ON doctors(user_id);
CREATE INDEX idx_doctors_email ON doctors(email);
CREATE INDEX idx_patients_doctor_id ON patients(doctor_id);
CREATE INDEX idx_patients_name ON patients(first_name, last_name);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_medical_reports_patient_id ON medical_reports(patient_id);
CREATE INDEX idx_medical_reports_doctor_id ON medical_reports(doctor_id);

-- ========================================
-- 4. CREAR FUNCIONES Y TRIGGERS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_doctors_updated_at 
    BEFORE UPDATE ON doctors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at 
    BEFORE UPDATE ON patients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON appointments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_reports_updated_at 
    BEFORE UPDATE ON medical_reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create a new doctor profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Important for accessing auth.users and inserting into public.doctors
AS $$
BEGIN
  -- Insert a new doctor record linked to the new auth user
  INSERT INTO public.doctors (user_id, email, first_name, last_name, specialty)
  VALUES (
    NEW.id, -- The user_id from auth.users
    NEW.email, -- The email from auth.users
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Nombre Pendiente'), -- Attempt to get first_name from metadata, or use placeholder
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Apellido Pendiente'),  -- Attempt to get last_name from metadata, or use placeholder
    'Especialidad Pendiente' -- Default specialty, can be updated later by the doctor
  );
  RETURN NEW;
END;
$$;

-- Trigger to call the function after a new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 5. NO RLS POR AHORA (PARA QUE FUNCIONE)
-- ========================================

-- Las tablas están SIN Row Level Security para que funcione el registro
-- Después de que todo funcione, puedes agregar RLS ejecutando:
-- ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
-- etc...

-- ========================================
-- 6. DATOS DE EJEMPLO (OPCIONAL)
-- ========================================

-- Puedes descomentar esto si quieres datos de prueba
/*
INSERT INTO doctors (user_id, first_name, last_name, email, specialty) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Dr. Ejemplo', 'Médico', 'ejemplo@test.com', 'General Medicine');

INSERT INTO patients (doctor_id, first_name, last_name, date_of_birth, gender, phone, email) 
VALUES (
  (SELECT id FROM doctors LIMIT 1),
  'Juan', 'Pérez', '1990-01-15', 'Masculino', '555-0123', 'juan@test.com'
);
*/

-- ========================================
-- 7. MENSAJE FINAL
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '🎉 ¡BASE DE DATOS CREADA SIN RLS! 🎉';
    RAISE NOTICE '✅ Tablas: doctors, patients, appointments, medical_reports';
    RAISE NOTICE '✅ Índices para performance creados';
    RAISE NOTICE '❌ Row Level Security DESHABILITADO (para que funcione el registro)';
    RAISE NOTICE '✅ Triggers automáticos activados';
    RAISE NOTICE '✅ Sin foreign key constraints problemáticos';
    RAISE NOTICE '🚀 ¡Ahora SÍ puedes registrarte sin errores!';
    RAISE NOTICE '⚠️  Después de probar, puedes habilitar RLS para seguridad';
END $$;
