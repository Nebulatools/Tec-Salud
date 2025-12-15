-- Simplify roles to two vistas: user vs doctor (admin). Map any doctor_specialist -> doctor_admin.
BEGIN;

-- Normalize existing roles
UPDATE public.app_users SET role = 'doctor_admin' WHERE role = 'doctor_specialist';

-- Recreate trigger function mapping doctor_specialist -> doctor_admin
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
  IF desired_role IN ('doctor_admin', 'doctor_specialist', 'doctor') THEN
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

COMMIT;
