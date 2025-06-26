import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const reportData = await request.json();

    const { data, error } = await supabase
      .from('medical_reports')
      .insert([
        {
          patient_id: reportData.patient_id,
          doctor_id: reportData.doctor_id,
          appointment_id: reportData.appointment_id,
          report_type: reportData.report_type,
          title: reportData.title,
          content: reportData.content,
          original_transcript: reportData.original_transcript,
          ai_suggestions: reportData.ai_suggestions,
          compliance_status: reportData.compliance_status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Error saving report to database' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in medical-reports API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');

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