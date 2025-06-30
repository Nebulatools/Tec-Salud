-- 1. Check if your user has a doctor record
SELECT 
    u.id as user_id,
    u.email as user_email,
    d.id as doctor_id,
    d.first_name,
    d.last_name
FROM auth.users u
LEFT JOIN public.doctors d ON u.id = d.user_id
WHERE u.email = 'YOUR_EMAIL_HERE'; -- Replace with your actual email

-- 2. If no doctor exists, create one
-- Replace the values below with your actual information
INSERT INTO public.doctors (user_id, email, first_name, last_name, specialty)
SELECT 
    id as user_id,
    email,
    COALESCE(raw_user_meta_data->>'first_name', 'Doctor'),
    COALESCE(raw_user_meta_data->>'last_name', 'Name'),
    COALESCE(raw_user_meta_data->>'specialty', 'General Medicine')
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE' -- Replace with your actual email
AND NOT EXISTS (
    SELECT 1 FROM public.doctors WHERE user_id = auth.users.id
);

-- 3. Verify the doctor was created
SELECT * FROM public.doctors WHERE email = 'YOUR_EMAIL_HERE';

-- 4. Check if there are any medical reports
SELECT 
    mr.id,
    mr.title,
    mr.created_at,
    d.first_name as doctor_name,
    p.first_name as patient_name
FROM medical_reports mr
LEFT JOIN doctors d ON mr.doctor_id = d.id
LEFT JOIN patients p ON mr.patient_id = p.id
ORDER BY mr.created_at DESC;