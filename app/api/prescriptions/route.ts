import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreatePrescriptionSchema } from '@/lib/schemas/prescription'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: doctor } = await supabase
      .from('doctors')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }

    const body = await request.json()
    const validation = CreatePrescriptionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { patient_id, appointment_id, medications, diagnosis, notes, valid_days } = validation.data

    // Verify patient belongs to doctor
    const { data: patient } = await supabase
      .from('patients')
      .select('id, doctor_id')
      .eq('id', patient_id)
      .single()

    if (!patient || patient.doctor_id !== doctor.id) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Calculate valid_until date
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + valid_days)

    const { data: prescription, error } = await supabase
      .from('prescriptions')
      .insert({
        doctor_id: doctor.id,
        patient_id,
        appointment_id: appointment_id || null,
        medications,
        diagnosis: diagnosis || null,
        notes: notes || null,
        status: 'draft',
        valid_until: validUntil.toISOString().split('T')[0],
      })
      .select(`
        *,
        patient:patients(first_name, last_name, date_of_birth),
        doctor:doctors(first_name, last_name, specialty)
      `)
      .single()

    if (error) {
      console.error('Prescription creation error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(prescription)
  } catch (error) {
    console.error('Prescription creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patient_id')
    const status = searchParams.get('status')
    const appointmentId = searchParams.get('appointment_id')

    // Check if user is a doctor
    const { data: doctor } = await supabase
      .from('doctors')
      .select('id')
      .eq('user_id', user.id)
      .single()

    // Check if user is a patient
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    let query = supabase
      .from('prescriptions')
      .select(`
        *,
        patient:patients(first_name, last_name, date_of_birth),
        doctor:doctors(first_name, last_name, specialty),
        appointment:appointments(appointment_date, start_time)
      `)
      .order('created_at', { ascending: false })

    if (doctor) {
      // Doctor can see all their prescriptions
      query = query.eq('doctor_id', doctor.id)
    } else if (patient) {
      // Patient can only see their own prescriptions
      query = query.eq('patient_id', patient.id)
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (patientId && doctor) {
      query = query.eq('patient_id', patientId)
    }

    if (appointmentId) {
      query = query.eq('appointment_id', appointmentId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Prescription fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
