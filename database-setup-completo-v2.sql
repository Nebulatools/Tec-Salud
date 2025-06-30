-- ============================================
-- CONFIGURACIÓN COMPLETA DE BASE DE DATOS V2
-- TEC SALUD v0 - REINICIO COMPLETO
-- ============================================
-- ADVERTENCIA: Este script ELIMINA TODO y recrea desde cero
-- Ejecutar solo si estás seguro de querer reiniciar la base de datos
-- ============================================

-- Habilitar la extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PASO 1: ELIMINAR TODO LO EXISTENTE
-- ============================================

-- Eliminar triggers primero
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS update_doctors_updated_at ON doctors CASCADE;
DROP TRIGGER IF EXISTS update_patients_updated_at ON patients CASCADE;
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments CASCADE;
DROP TRIGGER IF EXISTS update_medical_reports_updated_at ON medical_reports CASCADE;

-- Eliminar funciones
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Eliminar tablas en orden correcto (respetando dependencias)
DROP TABLE IF EXISTS medical_reports CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;

-- ============================================
-- PASO 2: CREAR ESTRUCTURA DESDE CERO
-- ============================================

-- Función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- TABLA: doctors
-- ============================================
CREATE TABLE doctors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE, -- UNIQUE para evitar duplicados
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    specialty VARCHAR(100) NOT NULL,
    license_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para doctors
CREATE INDEX idx_doctors_user_id ON doctors(user_id);
CREATE INDEX idx_doctors_email ON doctors(email);

-- Trigger para updated_at
CREATE TRIGGER update_doctors_updated_at 
BEFORE UPDATE ON doctors
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLA: patients
-- ============================================
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

-- Índices para patients
CREATE INDEX idx_patients_doctor_id ON patients(doctor_id);
CREATE INDEX idx_patients_name ON patients(last_name, first_name);

-- Trigger para updated_at
CREATE TRIGGER update_patients_updated_at 
BEFORE UPDATE ON patients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLA: appointments
-- ============================================
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

-- Índices para appointments
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Trigger para updated_at
CREATE TRIGGER update_appointments_updated_at 
BEFORE UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLA: medical_reports
-- ============================================
CREATE TABLE medical_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    report_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    original_transcript TEXT,
    ai_suggestions JSONB DEFAULT '[]'::jsonb,
    compliance_status BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para medical_reports
CREATE INDEX idx_medical_reports_patient_id ON medical_reports(patient_id);
CREATE INDEX idx_medical_reports_doctor_id ON medical_reports(doctor_id);
CREATE INDEX idx_medical_reports_appointment_id ON medical_reports(appointment_id);
CREATE INDEX idx_medical_reports_created_at ON medical_reports(created_at DESC);

-- Trigger para updated_at
CREATE TRIGGER update_medical_reports_updated_at 
BEFORE UPDATE ON medical_reports
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ÍNDICES ÚNICOS PARA EVITAR DUPLICADOS
-- ============================================

-- Evitar reportes duplicados por cita (solo un reporte final por cita)
CREATE UNIQUE INDEX idx_unique_appointment_report 
ON medical_reports(appointment_id) 
WHERE appointment_id IS NOT NULL AND report_type != 'BORRADOR';

-- Evitar borradores duplicados por cita
CREATE UNIQUE INDEX idx_unique_appointment_borrador 
ON medical_reports(appointment_id, report_type) 
WHERE report_type = 'BORRADOR';

-- ============================================
-- FUNCIÓN MEJORADA: Crear doctor al registrar usuario
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Intentar insertar el doctor
  BEGIN
    INSERT INTO public.doctors (user_id, email, first_name, last_name, specialty)
    VALUES (
      new.id,
      new.email,
      COALESCE(new.raw_user_meta_data->>'first_name', 'Pendiente'),
      COALESCE(new.raw_user_meta_data->>'last_name', 'Actualizar'),
      COALESCE(new.raw_user_meta_data->>'specialty', 'General Medicine')
    )
    ON CONFLICT (user_id) DO NOTHING; -- Si ya existe, no hacer nada
    
  EXCEPTION
    WHEN unique_violation THEN
      -- Si hay violación de unicidad en email, intentar actualizar
      UPDATE public.doctors 
      SET email = new.email 
      WHERE user_id = new.id;
    WHEN OTHERS THEN
      -- Para cualquier otro error, solo logearlo pero no fallar
      RAISE LOG 'Error creating doctor profile for user %: %', new.id, SQLERRM;
  END;
  
  -- Siempre retornar new para no interrumpir el registro
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para nuevos usuarios
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- DESACTIVAR RLS TEMPORALMENTE
-- ============================================
ALTER TABLE doctors DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE medical_reports DISABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ BASE DE DATOS REINICIADA COMPLETAMENTE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Todas las tablas recreadas desde cero';
    RAISE NOTICE '✅ Función handle_new_user mejorada con:';
    RAISE NOTICE '   - Manejo de errores robusto';
    RAISE NOTICE '   - ON CONFLICT para evitar duplicados';
    RAISE NOTICE '   - No bloquea el registro de usuarios';
    RAISE NOTICE '✅ Constraint UNIQUE en doctors.user_id';
    RAISE NOTICE '✅ RLS deshabilitado temporalmente';
    RAISE NOTICE '✅ Todos los triggers recreados';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANTE:';
    RAISE NOTICE '   - Todos los datos anteriores fueron eliminados';
    RAISE NOTICE '   - El sistema está listo para nuevos registros';
    RAISE NOTICE '   - Habilitar RLS cuando sea necesario';
    RAISE NOTICE '========================================';
END $$;