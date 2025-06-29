import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  console.log('=== MEDICAL REPORTS API - POST ===');
  
  try {
    const reportData = await request.json();
    console.log('Received report data:', reportData);

    // Validar y procesar patient_id
    let patientId = reportData.patient_id;
    console.log('=== PATIENT ID VALIDATION ===');
    console.log('Original patient_id:', patientId);
    
    // Verificar si el paciente existe
    if (patientId) {
      const { data: patientExists, error: patientError } = await supabase
        .from('patients')
        .select('id, first_name, last_name')
        .eq('id', patientId)
        .single();
      
      if (patientError || !patientExists) {
        console.log('Patient not found in database:', patientError?.message);
        console.log('Available patients:');
        const { data: allPatients } = await supabase
          .from('patients')
          .select('id, first_name, last_name')
          .limit(5);
        console.log(allPatients);
        
        return NextResponse.json(
          { 
            error: 'Patient not found in database',
            details: `Patient ID ${patientId} does not exist. Please select a valid patient.`,
            availablePatients: allPatients
          },
          { status: 400 }
        );
      } else {
        console.log('Patient found:', patientExists);
      }
    } else {
      return NextResponse.json(
        { error: 'patient_id is required' },
        { status: 400 }
      );
    }

    if (!reportData.content) {
      console.error('Missing content');
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      );
    }

    // Si no hay doctor_id, obtener el primer doctor de la base de datos
    let doctorId = reportData.doctor_id;
    
    if (!doctorId) {
      const { data: doctors } = await supabase
        .from('doctors')
        .select('id')
        .limit(1)
        .single();
      
      if (doctors) {
        doctorId = doctors.id;
      } else {
        console.error('No doctors found in database');
        return NextResponse.json(
          { error: 'No doctors found in database' },
          { status: 400 }
        );
      }
    }

    // Asegurarse de que ai_suggestions sea un array válido
    let aiSuggestions = reportData.ai_suggestions;
    if (aiSuggestions && !Array.isArray(aiSuggestions)) {
      console.warn('ai_suggestions is not an array, converting...');
      aiSuggestions = [];
    }

    const insertData = {
      patient_id: patientId, // Usar el patientId validado
      doctor_id: doctorId,
      appointment_id: reportData.appointment_id,
      report_type: reportData.report_type || 'Consulta Médica',
      title: reportData.title || 'Reporte sin título',
      content: reportData.content,
      original_transcript: reportData.original_transcript,
      ai_suggestions: aiSuggestions || [],
      compliance_status: reportData.compliance_status || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('AI suggestions being saved:', insertData.ai_suggestions);

    console.log('Data to save:', insertData);

    // Verificar si ya existe un reporte para esta cita
    let data, error;
    
    if (reportData.appointment_id) {
      // Buscar reporte existente
      const { data: existingReport } = await supabase
        .from('medical_reports')
        .select('id')
        .eq('appointment_id', reportData.appointment_id)
        .maybeSingle();

      if (existingReport) {
        // Actualizar reporte existente
        console.log('Updating existing report:', existingReport.id);
        const updateResult = await supabase
          .from('medical_reports')
          .update({
            ...insertData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingReport.id)
          .select()
          .single();
        
        data = updateResult.data;
        error = updateResult.error;
      } else {
        // Crear nuevo reporte
        console.log('Creating new report');
        const insertResult = await supabase
          .from('medical_reports')
          .insert([insertData])
          .select()
          .single();
        
        data = insertResult.data;
        error = insertResult.error;
      }
    } else {
      // Sin appointment_id, crear directamente
      const insertResult = await supabase
        .from('medical_reports')
        .insert([insertData])
        .select()
        .single();
      
      data = insertResult.data;
      error = insertResult.error;
    }

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { 
          error: 'Error saving report to database',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }

    console.log('Successfully saved report:', data);
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in medical-reports API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');
    const doctorId = searchParams.get('doctor_id');

    let query = supabase
      .from('medical_reports')
      .select(`
        *,
        patients (
          first_name,
          last_name
        ),
        doctors (
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    if (doctorId) {
      query = query.eq('doctor_id', doctorId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Error fetching reports from database' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);

  } catch (error) {
    console.error('Error in medical-reports GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}