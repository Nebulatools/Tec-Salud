import { NextRequest, NextResponse } from 'next/server'
import { ai, MODEL } from '@/lib/ai/openrouter'
import { supabase } from '@/lib/supabase'
import { autocodeDiagnoses } from '@/lib/icd-api-client'
import type { StructuredDiagnosis } from '@/types/icd'

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
`

export async function POST(request: NextRequest) {
  console.log('=== PARSE TRANSCRIPT API CALLED ===')

  try {
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY not found in environment variables')
      return NextResponse.json(
        { error: 'Server configuration error: Missing API key' },
        { status: 500 }
      )
    }

    const { transcript, appointmentId, patientId } = await request.json()
    console.log('Received transcript length:', transcript?.length || 0)
    console.log('Received appointmentId:', appointmentId || '')
    console.log('Received patientId:', patientId || '')

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 })
    }

    // Try to resolve patient name from DB (best-effort, optional)
    let patientName = ''
    if (patientId) {
      try {
        const { data: p } = await supabase
          .from('patients')
          .select('first_name, last_name')
          .eq('id', patientId)
          .maybeSingle()
        if (p) {
          patientName = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
        }
      } catch {
        console.warn('Patient lookup failed, continuing without name')
      }
    }

    const userContext = `\n\nPACIENTE:\n- patientId: ${patientId || ''}\n- appointmentId: ${appointmentId || ''}\n- nombre_conocido: ${patientName || ''}`

    console.log('Calling OpenRouter for structured extraction...')
    const response = await ai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: EXTRACTION_PROMPT + `\n\nTRANSCRIPCIÓN:\n` + transcript + userContext,
        },
      ],
      temperature: 0.1,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    })

    const text = response.choices[0]?.message?.content || '{}'
    console.log('AI extraction response length:', text.length)
    console.log('AI extraction preview:', text.substring(0, 200))

    const trySafeParse = (t: string) => {
      try {
        return JSON.parse(t)
      } catch {
        // Heurística: recorta a partir del primer '{' y cierra llaves/corchetes abiertos
        const start = t.indexOf('{')
        if (start === -1) return null
        let candidate = t.slice(start)
        const lastBrace = candidate.lastIndexOf('}')
        const lastBracket = candidate.lastIndexOf(']')
        const lastCloser = Math.max(lastBrace, lastBracket)
        if (lastCloser > 0 && lastCloser < candidate.length - 1) {
          candidate = candidate.slice(0, lastCloser + 1)
        }
        let openCurly = 0,
          openSquare = 0
        for (const ch of candidate) {
          if (ch === '{') openCurly++
          else if (ch === '}') openCurly = Math.max(0, openCurly - 1)
          else if (ch === '[') openSquare++
          else if (ch === ']') openSquare = Math.max(0, openSquare - 1)
        }
        candidate += '}'.repeat(openCurly) + ']'.repeat(openSquare)
        try {
          return JSON.parse(candidate)
        } catch {
          return null
        }
      }
    }

    let raw: unknown = trySafeParse(text)
    if (!raw) {
      console.error('Error parsing extraction AI response. Raw text (truncated):', text.substring(0, 500))
      raw = {
        patient: { id: patientId || '', name: patientName || '' },
        symptoms: [],
        diagnoses: [],
        medications: [],
      }
    }

    // Sanitize output
    const safeString = (v: unknown) => (typeof v === 'string' ? v : '')
    const safeStringArray = (v: unknown): string[] =>
      Array.isArray(v)
        ? v
            .map((x) => safeString(x).trim())
            .filter(Boolean)
        : []
    const safeMeds = (
      v: unknown
    ): Array<{ name: string; dose: string; route: string; frequency: string; duration: string }> => {
      if (!Array.isArray(v)) return []
      return v.map((m: unknown) => {
        const med = m as Record<string, unknown>
        return {
          name: safeString(med?.name),
          dose: safeString(med?.dose),
          route: safeString(med?.route),
          frequency: safeString(med?.frequency),
          duration: safeString(med?.duration),
        }
      })
    }
    const safeSpeakerRoles = (v: unknown): Record<string, string> => {
      if (!v || typeof v !== 'object') return {}
      const roles: Record<string, string> = {}
      for (const [key, value] of Object.entries(v as Record<string, unknown>)) {
        if (typeof key === 'string' && typeof value === 'string') {
          roles[key] = value
        }
      }
      return roles
    }

    const rawObj = raw as Record<string, unknown>
    const rawPatient = rawObj?.patient as Record<string, unknown> | undefined
    const sanitized = {
      patient: {
        id: safeString(rawPatient?.id) || safeString(patientId) || '',
        name: safeString(rawPatient?.name) || patientName || '',
      },
      symptoms: safeStringArray(rawObj?.symptoms),
      diagnoses: safeStringArray(rawObj?.diagnoses),
      medications: safeMeds(rawObj?.medications),
      speakerRoles: safeSpeakerRoles(rawObj?.speakerRoles),
    }

    // Autocode diagnoses to ICD-11 (parallel, non-blocking on failure)
    let structuredDiagnoses: StructuredDiagnosis[] = []
    if (sanitized.diagnoses.length > 0) {
      try {
        console.log('Autocoding diagnoses to ICD-11...')
        structuredDiagnoses = await autocodeDiagnoses(sanitized.diagnoses)
        console.log('ICD autocode results:', structuredDiagnoses.map(d => `${d.original_text} → ${d.icd11_code || 'N/A'}`))
      } catch (error) {
        console.warn('ICD autocode failed, continuing without codes:', error)
        // Fallback: create structured diagnoses without codes
        structuredDiagnoses = sanitized.diagnoses.map(text => ({
          original_text: text,
          icd11_code: null,
          icd11_title: null,
          icd11_uri: null,
          confidence: 0,
          verified_by_doctor: false,
          coded_at: null,
        }))
      }
    }

    return NextResponse.json({
      ...sanitized,
      structuredDiagnoses,
    })
  } catch (error) {
    console.error('Error in parse-transcript API:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
