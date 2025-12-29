import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get doctor profile
    const { data: doctor } = await supabase
      .from('doctors')
      .select('id, user_id, first_name, last_name, specialty')
      .eq('user_id', user.id)
      .single()

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }

    // Verify doctor owns this prescription
    const { data: prescription, error: fetchError } = await supabase
      .from('prescriptions')
      .select(`
        *,
        patient:patients(first_name, last_name, date_of_birth)
      `)
      .eq('id', id)
      .eq('doctor_id', doctor.id)
      .single()

    if (fetchError || !prescription) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })
    }

    if (prescription.status !== 'draft') {
      return NextResponse.json(
        { error: 'Prescription already signed or cancelled' },
        { status: 400 }
      )
    }

    // Update prescription to signed status
    // Note: PDF generation would be handled client-side with @react-pdf/renderer
    // and the URL would be updated after upload to storage
    const { data: updated, error: updateError } = await supabase
      .from('prescriptions')
      .update({
        status: 'signed',
        signed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        patient:patients(first_name, last_name, date_of_birth),
        doctor:doctors(first_name, last_name, specialty)
      `)
      .single()

    if (updateError) {
      console.error('Error signing prescription:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Sign prescription error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
