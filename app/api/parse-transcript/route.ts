import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const EXTRACTION_PROMPT = `
ROL Y MISIÓN
Eres un asistente clínico. Tu tarea es LEER una transcripción de consulta y devolver SOLO un JSON con 4 categorías clínicas claves.

FORMATO OBLIGATORIO DE SALIDA (sin texto adicional):
{
  "patient": { "id": "<patientId_aportado>", "name": "Nombre Apellido" },
  "symptoms": ["tos", "fiebre"],
  "diagnoses": ["infección respiratoria alta"],
  "medications": [
    {"name":"amoxicilina","dose":"500 mg","route":"VO","frequency":"cada 8 h","duration":"7 días"}
  ]
}

REGLAS
- No inventes: si no hay datos, deja arrays vacíos y strings vacíos.
- Normaliza síntomas y diagnósticos como strings claros en español.
- Medications es un array de objetos con exactamente cinco campos de texto: name, dose, route, frequency, duration.
- Usa el patientId proporcionado como patient.id. Si no hay nombre, deja "".
`;

export async function POST(request: NextRequest) {
  console.log('=== PARSE TRANSCRIPT API CALLED ===');

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error: Missing API key' },
        { status: 500 }
      );
    }

    const { transcript, appointmentId, patientId } = await request.json();
    console.log('Received transcript length:', transcript?.length || 0);
    console.log('Received appointmentId:', appointmentId || '');
    console.log('Received patientId:', patientId || '');

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    // Try to resolve patient name from DB (best-effort, optional)
    let patientName = '';
    if (patientId) {
      try {
        const { data: p } = await supabase
          .from('patients')
          .select('first_name, last_name')
          .eq('id', patientId)
          .maybeSingle();
        if (p) {
          patientName = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
        }
      } catch (e) {
        console.warn('Patient lookup failed, continuing without name');
      }
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.1,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    });

    const userContext = `\n\nPACIENTE:\n- patientId: ${patientId || ''}\n- appointmentId: ${appointmentId || ''}\n- nombre_conocido: ${patientName || ''}`;

    console.log('Calling Gemini for structured extraction...');
    const result = await model.generateContent(
      EXTRACTION_PROMPT + `\n\nTRANSCRIPCIÓN:\n` + transcript + userContext
    );
    const response = await result.response;
    const text = response.text();

    console.log('AI extraction response length:', text?.length || 0);
    console.log('AI extraction preview:', text?.substring(0, 200));

    let raw: any;
    try {
      raw = JSON.parse(text || '{}');
    } catch (parseError) {
      console.error('Error parsing extraction AI response:', parseError);
      console.error('Raw extraction AI response:', text);
      return NextResponse.json(
        { error: 'Invalid response format from AI', details: text?.substring(0, 500) },
        { status: 500 }
      );
    }

    // Sanitize output
    const safeString = (v: any) => (typeof v === 'string' ? v : '');
    const safeStringArray = (v: any): string[] => Array.isArray(v) ? v.map((x) => safeString(x).trim()).filter(Boolean) : [];
    const safeMeds = (v: any): Array<{name: string, dose: string, route: string, frequency: string, duration: string}> => {
      if (!Array.isArray(v)) return [];
      return v.map((m) => ({
        name: safeString(m?.name),
        dose: safeString(m?.dose),
        route: safeString(m?.route),
        frequency: safeString(m?.frequency),
        duration: safeString(m?.duration),
      }));
    };

    const sanitized = {
      patient: {
        id: safeString(raw?.patient?.id) || safeString(patientId) || '',
        name: safeString(raw?.patient?.name) || patientName || '',
      },
      symptoms: safeStringArray(raw?.symptoms),
      diagnoses: safeStringArray(raw?.diagnoses),
      medications: safeMeds(raw?.medications),
    };

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error('Error in parse-transcript API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

