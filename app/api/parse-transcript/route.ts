import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const EXTRACTION_PROMPT = `
ROL Y MISIÓN
Eres un asistente clínico. Tu tarea es LEER una transcripción de consulta médica y devolver SOLO un JSON con datos clínicos e identificación de participantes.

FORMATO OBLIGATORIO DE SALIDA (sin texto adicional):
{
  "patient": { "id": "<patientId_aportado>", "name": "Nombre Apellido" },
  "symptoms": ["tos", "fiebre"],
  "diagnoses": ["infección respiratoria alta"],
  "medications": [
    {"name":"amoxicilina","dose":"500 mg","route":"VO","frequency":"cada 8 h","duration":"7 días"}
  ],
  "speakerRoles": {
    "SPEAKER_0": "Doctor",
    "SPEAKER_1": "Paciente",
    "SPEAKER_2": "Madre"
  }
}

REGLAS PARA DATOS CLÍNICOS
- No inventes: si no hay datos, deja arrays vacíos y strings vacíos.
- Normaliza síntomas y diagnósticos como strings claros en español.
- Medications es un array de objetos con exactamente cinco campos de texto: name, dose, route, frequency, duration.
- Usa el patientId proporcionado como patient.id. Si no hay nombre, deja "".

REGLAS PARA IDENTIFICACIÓN DE SPEAKERS
- La transcripción puede contener etiquetas como [Speaker 0], [Speaker 1], SPEAKER_0, etc.
- Identifica quién es cada speaker basándote en el CONTEXTO de lo que dicen:
  * Doctor: hace preguntas diagnósticas, usa terminología médica, da indicaciones, receta medicamentos
  * Paciente: describe síntomas propios, responde preguntas sobre su salud, usa "me duele", "tengo", "siento"
  * Madre/Padre: habla de síntomas de otra persona ("mi hijo tiene", "ella ha tenido"), acompaña al paciente
  * Hijo/Hija: paciente menor de edad
  * Familiar: acompañante genérico que aporta información del paciente
  * Cuidador: persona a cargo del paciente
- Usa etiquetas descriptivas en español: "Doctor", "Paciente", "Madre", "Padre", "Hijo", "Hija", "Familiar", "Cuidador"
- Si no puedes determinar el rol, usa "Participante"
- El objeto speakerRoles debe mapear EXACTAMENTE los speakers que aparecen en la transcripción
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
      model: process.env.GEMINI_MODEL || 'gemini-1.5-pro-002',
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

    const trySafeParse = (t: string) => {
      try {
        return JSON.parse(t);
      } catch {}
      // Heurística: recorta a partir del primer '{' y cierra llaves/corchetes abiertos
      const start = t.indexOf('{');
      if (start === -1) return null;
      let candidate = t.slice(start);
      // Si hay texto después de la última '}'/']', intenta recortar al último '}'
      const lastBrace = candidate.lastIndexOf('}');
      const lastBracket = candidate.lastIndexOf(']');
      const lastCloser = Math.max(lastBrace, lastBracket);
      if (lastCloser > 0 && lastCloser < candidate.length - 1) {
        candidate = candidate.slice(0, lastCloser + 1);
      }
      // Balanceo básico de llaves/corchetes (ignora comillas para simplicidad)
      let openCurly = 0, openSquare = 0;
      for (const ch of candidate) {
        if (ch === '{') openCurly++;
        else if (ch === '}') openCurly = Math.max(0, openCurly - 1);
        else if (ch === '[') openSquare++;
        else if (ch === ']') openSquare = Math.max(0, openSquare - 1);
      }
      candidate += '}'.repeat(openCurly) + ']'.repeat(openSquare);
      try {
        return JSON.parse(candidate);
      } catch {
        return null;
      }
    };

    let raw: any = trySafeParse(text || '{}');
    if (!raw) {
      console.error('Error parsing extraction AI response. Raw text (truncated):', text?.substring(0, 500));
      // Devolver estructura mínima válida para no romper el flujo
      raw = { patient: { id: patientId || '', name: patientName || '' }, symptoms: [], diagnoses: [], medications: [] };
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
    const safeSpeakerRoles = (v: unknown): Record<string, string> => {
      if (!v || typeof v !== 'object') return {};
      const roles: Record<string, string> = {};
      for (const [key, value] of Object.entries(v as Record<string, unknown>)) {
        if (typeof key === 'string' && typeof value === 'string') {
          roles[key] = value;
        }
      }
      return roles;
    };

    const rawObj = raw as Record<string, unknown>;
    const rawPatient = rawObj?.patient as Record<string, unknown> | undefined;
    const sanitized = {
      patient: {
        id: safeString(rawPatient?.id) || safeString(patientId) || '',
        name: safeString(rawPatient?.name) || patientName || '',
      },
      symptoms: safeStringArray(rawObj?.symptoms),
      diagnoses: safeStringArray(rawObj?.diagnoses),
      medications: safeMeds(rawObj?.medications),
      speakerRoles: safeSpeakerRoles(rawObj?.speakerRoles),
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
