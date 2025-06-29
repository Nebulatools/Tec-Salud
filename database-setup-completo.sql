-- ============================================
-- CONFIGURACIÓN COMPLETA DE BASE DE DATOS
-- TEC SALUD v0
-- ============================================
-- Este archivo contiene toda la estructura de base de datos desde cero.
-- Incluye todas las tablas, índices, funciones y configuraciones necesarias.
-- ============================================

-- Habilitar la extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ELIMINACIÓN DE TABLAS EXISTENTES (Si es necesario)
-- ============================================
-- Descomenta estas líneas solo si necesitas recrear todo desde cero
-- DROP TABLE IF EXISTS medical_reports CASCADE;
-- DROP TABLE IF EXISTS appointments CASCADE;
-- DROP TABLE IF EXISTS patients CASCADE;
-- DROP TABLE IF EXISTS doctors CASCADE;

-- ============================================
-- TABLA: doctors
-- ============================================
CREATE TABLE IF NOT EXISTS doctors (
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

-- Índices para doctors
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_email ON doctors(email);

-- ============================================
-- TABLA: patients
-- ============================================
CREATE TABLE IF NOT EXISTS patients (
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
CREATE INDEX IF NOT EXISTS idx_patients_doctor_id ON patients(doctor_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name);

-- ============================================
-- TABLA: appointments
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
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
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- ============================================
-- TABLA: medical_reports
-- ============================================
CREATE TABLE IF NOT EXISTS medical_reports (
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
CREATE INDEX IF NOT EXISTS idx_medical_reports_patient_id ON medical_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_doctor_id ON medical_reports(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_appointment_id ON medical_reports(appointment_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_created_at ON medical_reports(created_at DESC);

-- ============================================
-- ÍNDICES ÚNICOS IMPORTANTES
-- ============================================

-- Evitar reportes duplicados por cita (solo un reporte final por cita)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_appointment_report 
ON medical_reports(appointment_id) 
WHERE appointment_id IS NOT NULL AND report_type != 'BORRADOR';

-- Evitar borradores duplicados por cita
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_appointment_borrador 
ON medical_reports(appointment_id, report_type) 
WHERE report_type = 'BORRADOR';

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers a todas las tablas (solo si no existen)
DO $$
BEGIN
    -- Trigger para doctors
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_doctors_updated_at' 
        AND tgrelid = 'doctors'::regclass
    ) THEN
        CREATE TRIGGER update_doctors_updated_at 
        BEFORE UPDATE ON doctors
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Trigger update_doctors_updated_at creado';
    ELSE
        RAISE NOTICE '⚠️  Trigger update_doctors_updated_at ya existe';
    END IF;

    -- Trigger para patients
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_patients_updated_at' 
        AND tgrelid = 'patients'::regclass
    ) THEN
        CREATE TRIGGER update_patients_updated_at 
        BEFORE UPDATE ON patients
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Trigger update_patients_updated_at creado';
    ELSE
        RAISE NOTICE '⚠️  Trigger update_patients_updated_at ya existe';
    END IF;

    -- Trigger para appointments
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_appointments_updated_at' 
        AND tgrelid = 'appointments'::regclass
    ) THEN
        CREATE TRIGGER update_appointments_updated_at 
        BEFORE UPDATE ON appointments
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Trigger update_appointments_updated_at creado';
    ELSE
        RAISE NOTICE '⚠️  Trigger update_appointments_updated_at ya existe';
    END IF;

    -- Trigger para medical_reports
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_medical_reports_updated_at' 
        AND tgrelid = 'medical_reports'::regclass
    ) THEN
        CREATE TRIGGER update_medical_reports_updated_at 
        BEFORE UPDATE ON medical_reports
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Trigger update_medical_reports_updated_at creado';
    ELSE
        RAISE NOTICE '⚠️  Trigger update_medical_reports_updated_at ya existe';
    END IF;
END $$;

-- ============================================
-- FUNCIÓN: Crear doctor automáticamente al registrar usuario
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.doctors (user_id, email, first_name, last_name, specialty)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', 'Doctor'),
    COALESCE(new.raw_user_meta_data->>'last_name', 'Apellido'),
    COALESCE(new.raw_user_meta_data->>'specialty', 'Medicina General')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para nuevos usuarios (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
        AND tgrelid = 'auth.users'::regclass
    ) THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
        RAISE NOTICE '✅ Trigger on_auth_user_created creado';
    ELSE
        RAISE NOTICE '⚠️  Trigger on_auth_user_created ya existe';
    END IF;
END
$$;

-- ============================================
-- VALIDACIONES Y AJUSTES FINALES
-- ============================================

-- Asegurar que ai_suggestions sea JSONB
DO $$
BEGIN
    -- Verificar si la columna existe y es del tipo correcto
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'medical_reports' 
        AND column_name = 'ai_suggestions'
        AND data_type != 'jsonb'
    ) THEN
        -- Convertir a JSONB si no lo es
        ALTER TABLE medical_reports 
        ALTER COLUMN ai_suggestions TYPE JSONB USING ai_suggestions::jsonb;
    END IF;
    
    -- Establecer valor por defecto si no lo tiene
    ALTER TABLE medical_reports 
    ALTER COLUMN ai_suggestions SET DEFAULT '[]'::jsonb;
    
END $$;

-- ============================================
-- LIMPIEZA DE DUPLICADOS (Si existen)
-- ============================================

-- Eliminar reportes duplicados manteniendo el más reciente
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY appointment_id 
           ORDER BY created_at DESC
         ) as row_num
  FROM medical_reports 
  WHERE appointment_id IS NOT NULL 
  AND report_type != 'BORRADOR'
)
DELETE FROM medical_reports 
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- ============================================
-- PERMISOS Y POLÍTICAS (RLS)
-- ============================================

-- NOTA: Row Level Security está deshabilitado temporalmente
-- para permitir el registro. Habilitar después de configurar
-- las políticas apropiadas.

-- ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE medical_reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Base de datos configurada correctamente';
    RAISE NOTICE '✅ Tablas creadas: doctors, patients, appointments, medical_reports';
    RAISE NOTICE '✅ Índices únicos aplicados para evitar duplicados';
    RAISE NOTICE '✅ Campo ai_suggestions configurado como JSONB';
    RAISE NOTICE '✅ Triggers de actualización automática activos';
    RAISE NOTICE '✅ Sistema listo para guardar sugerencias de IA';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANTE: Las sugerencias de IA se guardan en:';
    RAISE NOTICE '   1. El campo "content" del reporte (incluidas en el texto)';
    RAISE NOTICE '   2. El campo "ai_suggestions" como JSONB (para consultas)';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Para habilitar Row Level Security:';
    RAISE NOTICE '   Descomenta las líneas ALTER TABLE ... ENABLE ROW LEVEL SECURITY';
    RAISE NOTICE '   y configura las políticas apropiadas';
    RAISE NOTICE '========================================';
END $$;