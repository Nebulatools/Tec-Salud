import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  console.log('=== CLINICAL EXTRACTIONS API - POST ===');

  try {
    const body = await request.json();
    const { appointmentId, patientId, doctorId: incomingDoctorId, extraction } = body || {};

    console.log('Received payload keys:', Object.keys(body || {}));
    console.log('appointmentId:', appointmentId || '');
    console.log('patientId:', patientId || '');

    // Validate extraction object and sanitize
    const safeString = (v: unknown) => (typeof v === 'string' ? v : '');
    const safeStringArray = (v: unknown): string[] => Array.isArray(v) ? v.map((x) => safeString(x).trim()).filter(Boolean) : [];
    const safeMeds = (v: unknown): Array<{name: string, dose: string, route: string, frequency: string, duration: string}> => {
      if (!Array.isArray(v)) return [];
      return v.map((m: unknown) => {
        const med = m as Record<string, unknown>;
        return {
          name: safeString(med?.name),
          dose: safeString(med?.dose),
          route: safeString(med?.route),
          frequency: safeString(med?.frequency),
          duration: safeString(med?.duration),
        };
      });
    };

    const ex = extraction && typeof extraction === 'object' ? extraction as Record<string, unknown> : {};
    const patient = ex?.patient as Record<string, unknown> | undefined;
    const sanitized = {
      patient: {
        id: safeString(patient?.id) || safeString(patientId) || '',
        name: safeString(patient?.name) || '',
      },
      symptoms: safeStringArray(ex?.symptoms),
      diagnoses: safeStringArray(ex?.diagnoses),
      medications: safeMeds(ex?.medications),
    };

    // Resolve doctor id if missing (same strategy as /api/medical-reports)
    let doctorId = safeString(incomingDoctorId);
    if (!doctorId) {
      const { data: doctor } = await supabase
        .from('doctors')
        .select('id')
        .limit(1)
        .single();
      if (doctor?.id) {
        doctorId = doctor.id;
      } else {
        console.error('No doctors found in database');
        return NextResponse.json(
          { error: 'No doctors found in database' },
          { status: 400 }
        );
      }
    }

    const insertData = {
      appointment_id: appointmentId || null,
      patient_id: patientId || null,
      doctor_id: doctorId || null,
      patient_snapshot: { id: sanitized.patient.id, name: sanitized.patient.name },
      symptoms: sanitized.symptoms,
      diagnoses: sanitized.diagnoses,
      medications: sanitized.medications,
    };

    console.log('Inserting clinical extraction...');
    const { data, error } = await supabase
      .from('clinical_extractions')
      .insert([insertData])
      .select('*')
      .single();

    if (error) {
      console.error('Database error on insert:', error);
      return NextResponse.json(
        { error: 'Error saving clinical extraction to database', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in clinical-extractions POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log('=== CLINICAL EXTRACTIONS API - GET ===');

  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');
    const appointmentId = searchParams.get('appointment_id');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    const limit = Math.min(Math.max(parseInt(limitParam || '20', 10) || 20, 1), 100);
    const offset = Math.max(parseInt(offsetParam || '0', 10) || 0, 0);
    const rangeFrom = offset;
    const rangeTo = offset + limit - 1;

    let query = supabase
      .from('clinical_extractions')
      .select('*')
      .order('extracted_at', { ascending: false });

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }
    if (appointmentId) {
      query = query.eq('appointment_id', appointmentId);
    }

    const { data, error } = await query.range(rangeFrom, rangeTo);

    if (error) {
      console.error('Database error on fetch:', error);
      return NextResponse.json(
        { error: 'Error fetching clinical extractions from database' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in clinical-extractions GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

