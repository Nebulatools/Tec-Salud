-- ========================================
-- SCHEMA COMPLETO ACTUALIZADO - EJECUTAR EN SUPABASE
-- ========================================

-- 1. PRIMERO VERIFICAR SI HAY DATOS QUE NECESITAS RESPALDAR
-- Si tienes datos importantes, haz un backup antes de ejecutar esto

-- 2. LIMPIAR TABLAS ANTERIORES
DROP TABLE IF EXISTS medical_reports CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;

-- 3. LIMPIAR FUNCIONES
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 4. CREAR TABLA DOCTORS
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

-- 5. CREAR TABLA PATIENTS
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

-- 6. CREAR TABLA APPOINTMENTS
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

-- 7. CREAR TABLA MEDICAL_REPORTS CON TODAS LAS COLUMNAS
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

-- 8. CREAR ÍNDICES
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
CREATE INDEX idx_medical_reports_appointment_id ON medical_reports(appointment_id);

-- 9. CREAR FUNCIÓN PARA ACTUALIZAR TIMESTAMP
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. CREAR TRIGGERS
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

-- 11. FUNCIÓN PARA CREAR DOCTOR CUANDO SE REGISTRA UN USUARIO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.doctors (user_id, email, first_name, last_name, specialty)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Nombre'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Apellido'),
    COALESCE(NEW.raw_user_meta_data->>'specialty', 'Medicina General')
  );
  RETURN NEW;
END;
$$;

-- 12. TRIGGER PARA NUEVOS USUARIOS
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 13. INSERTAR UN DOCTOR DE PRUEBA (OPCIONAL)
-- Si necesitas un doctor de prueba, descomenta estas líneas:
/*
INSERT INTO doctors (user_id, first_name, last_name, email, specialty) 
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid, 
    'Doctor', 
    'Demo', 
    'demo@doctor.com', 
    'Medicina General'
);
*/

-- 14. MENSAJE FINAL
DO $$
BEGIN
    RAISE NOTICE '✅ Base de datos creada exitosamente';
    RAISE NOTICE '✅ Tablas: doctors, patients, appointments, medical_reports';
    RAISE NOTICE '✅ Todas las columnas necesarias incluidas';
    RAISE NOTICE '✅ Índices y triggers configurados';
    RAISE NOTICE '⚠️  Row Level Security deshabilitado por ahora';
END $$;