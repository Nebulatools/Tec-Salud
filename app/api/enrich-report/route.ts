import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ai, MODEL } from '@/lib/ai/openrouter'
import { COMPLIANCE_FIELDS_SCHEMA, type ComplianceContext } from '@/lib/compliance/fields-schema'
import {
  ClinicalReportDataSchema,
  type ClinicalReportData,
  isFieldPresent,
  getMissingFields,
} from '@/lib/schemas/clinical-report'
import {
  renderClinicalReportToMarkdown,
  updateFieldInReport,
} from '@/lib/schemas/clinical-report-renderer'

// =============================================================================
// TYPES & VALIDATION
// =============================================================================

const RequestSchema = z.object({
  transcript: z.string().min(1, 'Transcript is required'),
  // Field-specific responses for deterministic updates
  fieldResponses: z.array(z.object({
    fieldId: z.string(),
    value: z.string(),
  })).optional(),
  // Existing structured data to update
  existingStructuredData: z.record(z.unknown()).optional(),
  // Legacy: existing markdown report (for backward compatibility)
  existingReport: z.string().optional(),
  // Patient/doctor info to inject
  patientInfo: z.object({
    id: z.string().optional(),
    nombre: z.string().optional(),
    edad: z.number().optional(),
    sexo: z.enum(['Masculino', 'Femenino', 'Otro']).optional(),
    fecha_nacimiento: z.string().optional(),
  }).optional(),
  doctorInfo: z.object({
    nombre: z.string().optional(),
    especialidad: z.string().optional(),
    cedula_profesional: z.string().optional(),
  }).optional(),
  context: z.object({
    specialty: z.string().optional(),
    hasLabOrders: z.boolean().optional(),
    isFollowUp: z.boolean().optional(),
    patientAge: z.number().optional(),
    reportType: z.string().optional(),
    baselineFormCompleted: z.boolean().optional(),
    specialtyQuestionsAnswered: z.boolean().optional(),
  }).optional(),
})

interface ComplianceData {
  score: number
  status: 'compliant' | 'needs_attention' | 'critical_missing'
  summary: {
    critical: { missing: number; total: number }
    important: { missing: number; total: number }
    conditional: { missing: number; total: number }
  }
  missingFields: Array<{
    field: { id: string; name: string; priority: string }
    status: 'present' | 'missing' | 'incomplete'
    value?: string
    suggestions?: string[]
    priorityLabel: string
    priorityColor: string
  }>
}

interface QuestionForDoctor {
  fieldId: string
  fieldName: string
  question: string
  priority: string
}

interface EnrichReportResponse {
  improvedReport: string
  structuredData: ClinicalReportData
  missingInformation: string[]
  questionsForDoctor: QuestionForDoctor[]
  compliance: ComplianceData
}

// =============================================================================
// CONSTANTS
// =============================================================================

const QUESTION_TEMPLATES: Record<string, string> = {
  motivo_consulta: '¿Cuál es el motivo principal de la consulta?',
  diagnostico: '¿Cuál es el diagnóstico o impresión diagnóstica?',
  signos_vitales: '¿Cuáles son los signos vitales del paciente (TA, FC, Temp)?',
  exploracion_fisica: '¿Cuáles fueron los hallazgos de la exploración física?',
  plan_tratamiento: '¿Cuál es el plan de tratamiento indicado?',
  seguimiento: '¿Cuándo debe regresar el paciente a consulta?',
  alergias: '¿El paciente tiene alergias conocidas?',
  antecedentes: '¿Cuáles son los antecedentes médicos relevantes?',
  medicamentos_actuales: '¿Qué medicamentos toma actualmente el paciente?',
  resultados_laboratorio: '¿Cuál es la interpretación de los resultados de laboratorio?',
  evolucion: '¿Cómo ha evolucionado el paciente desde la última consulta?',
  cuestionario_especialidad: '¿Hay información relevante del cuestionario de especialidad?',
  codigo_icd: '¿Cuál es el código ICD-11 del diagnóstico?',
}

// =============================================================================
// AI EXTRACTION PROMPT
// =============================================================================

const STRUCTURED_EXTRACTION_PROMPT = `ROL: Eres un asistente de documentación médica que extrae información estructurada de transcripciones de consultas.

TAREA: Analiza la transcripción y extrae TODA la información clínica en formato JSON estructurado.

REGLAS CRÍTICAS:
1. Extrae SOLO información explícitamente mencionada en la transcripción
2. NO inventes información
3. Usa null para campos que no se mencionan
4. Para listas vacías, usa []
5. Presta especial atención a signos vitales, diagnósticos y tratamientos

FORMATO DE SALIDA - JSON con esta estructura exacta:

{
  "paciente": {
    "nombre": "string o null",
    "edad": "number o null",
    "sexo": "'Masculino' | 'Femenino' | 'Otro' | null"
  },
  "consulta": {
    "fecha": "YYYY-MM-DD (usa fecha actual si no se menciona)",
    "tipo": "'primera_vez' | 'seguimiento' | 'urgencia'"
  },
  "motivo_consulta": "string - razón de la consulta",
  "diagnosticos": [
    {
      "descripcion": "string",
      "codigo_icd": "string o null",
      "tipo": "'principal' | 'secundario' | 'diferencial'"
    }
  ],
  "signos_vitales": {
    "presion_arterial": {
      "sistolica": "number o null",
      "diastolica": "number o null",
      "raw": "string como '120/80' o null"
    },
    "frecuencia_cardiaca": "number o null",
    "temperatura": "number o null",
    "saturacion_oxigeno": "number o null",
    "peso": "number o null"
  },
  "exploracion_fisica": "string - hallazgos del examen físico",
  "sintomas": [
    {
      "descripcion": "string",
      "duracion": "string o null",
      "intensidad": "'leve' | 'moderada' | 'severa' | null"
    }
  ],
  "antecedentes": {
    "personales_patologicos": ["string"],
    "familiares": ["string"],
    "quirurgicos": ["string"]
  },
  "alergias": {
    "tiene_alergias": "boolean",
    "lista": ["string"],
    "nkda": "boolean - true si no tiene alergias conocidas"
  },
  "medicamentos_actuales": [
    {
      "nombre": "string",
      "dosis": "string o null",
      "frecuencia": "string o null"
    }
  ],
  "plan_tratamiento": {
    "medicamentos": [
      {
        "nombre": "string",
        "dosis": "string",
        "via": "string o null",
        "frecuencia": "string",
        "duracion": "string o null",
        "indicaciones": "string o null"
      }
    ],
    "indicaciones_generales": "string o null",
    "recomendaciones": ["string"]
  },
  "seguimiento": {
    "proxima_cita": "string - ej: 'en 2 semanas' o 'YYYY-MM-DD'",
    "indicaciones": "string o null",
    "estudios_solicitados": ["string"]
  },
  "evolucion": "string o null - solo para consultas de seguimiento",
  "resultados_laboratorio": [
    {
      "estudio": "string",
      "resultado": "string",
      "interpretacion": "string o null"
    }
  ],
  "notas_adicionales": "string o null"
}`

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function parseAIJson<T = Record<string, unknown>>(raw: string): T | null {
  const cleaned = raw
    .trim()
    .replace(/^\uFEFF/, '')
    .replace(/^```json?\s*/i, '')
    .replace(/```\s*$/, '')

  try {
    return JSON.parse(cleaned)
  } catch {
    // Continue
  }

  // Fix unescaped newlines
  try {
    const fixed = cleaned.replace(
      /"((?:[^"\\]|\\.)*)"/g,
      (m) => m.replace(/[\r\n]+/g, '\\n').replace(/\t/g, '\\t')
    )
    return JSON.parse(fixed)
  } catch {
    // Continue
  }

  // Extract by balanced braces
  const start = cleaned.indexOf('{')
  if (start === -1) return null

  let depth = 0, end = -1, inStr = false, esc = false

  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i]
    if (esc) { esc = false; continue }
    if (c === '\\' && inStr) { esc = true; continue }
    if (c === '"') { inStr = !inStr; continue }
    if (!inStr) {
      if (c === '{') depth++
      else if (c === '}' && --depth === 0) { end = i; break }
    }
  }

  if (end !== -1) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1))
    } catch {
      // Failed
    }
  }

  return null
}

function inferContextFromTranscript(transcript: string, provided?: ComplianceContext): ComplianceContext {
  const base: ComplianceContext = { ...(provided ?? {}) }
  const t = transcript.toLowerCase()

  if (base.hasLabOrders === undefined) {
    base.hasLabOrders =
      /\b(laboratorio|laboratorios|an[aá]lisis|perfil|hemograma|qu[ií]mica|glucosa|colesterol|tsh|pcr)\b/i.test(t)
  }
  if (base.isFollowUp === undefined) {
    base.isFollowUp =
      /\b(control|seguimiento|revisi[oó]n|segunda\s+consulta|desde\s+la\s+[úu]ltima\s+consulta)\b/i.test(t)
  }

  return base
}

/**
 * Calculate compliance from structured data (deterministic - no regex!)
 */
function calculateCompliance(data: ClinicalReportData, context: ComplianceContext): ComplianceData {
  const allFields = COMPLIANCE_FIELDS_SCHEMA.getApplicableFields(context)

  const criticalFields = allFields.filter(f => f.priority === 'CRITICAL')
  const importantFields = allFields.filter(f => f.priority === 'IMPORTANT')
  const conditionalFields = allFields.filter(f => f.priority === 'CONDITIONAL')

  const criticalMissing = criticalFields.filter(f => !isFieldPresent(f.id, data))
  const importantMissing = importantFields.filter(f => !isFieldPresent(f.id, data))
  const conditionalMissing = conditionalFields.filter(f => !isFieldPresent(f.id, data))

  const criticalPresent = criticalFields.length - criticalMissing.length
  const importantPresent = importantFields.length - importantMissing.length
  const conditionalPresent = conditionalFields.length - conditionalMissing.length

  // Calculate score (critical=3, important=2, conditional=1)
  const totalWeight = criticalFields.length * 3 + importantFields.length * 2 + conditionalFields.length
  const achievedWeight = criticalPresent * 3 + importantPresent * 2 + conditionalPresent
  const score = totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 100) : 100

  // Determine status
  let status: 'compliant' | 'needs_attention' | 'critical_missing'
  if (criticalMissing.length > 0) {
    status = 'critical_missing'
  } else if (importantMissing.length > 0) {
    status = 'needs_attention'
  } else {
    status = 'compliant'
  }

  // Build missing fields array
  const missingFields: ComplianceData['missingFields'] = [
    ...criticalMissing.map(f => ({
      field: { id: f.id, name: f.name, priority: f.priority },
      status: 'missing' as const,
      suggestions: [`Agregar: ${f.name}`],
      priorityLabel: 'Crítico',
      priorityColor: 'red',
    })),
    ...importantMissing.map(f => ({
      field: { id: f.id, name: f.name, priority: f.priority },
      status: 'missing' as const,
      suggestions: [`Agregar: ${f.name}`],
      priorityLabel: 'Importante',
      priorityColor: 'yellow',
    })),
    ...conditionalMissing.map(f => ({
      field: { id: f.id, name: f.name, priority: f.priority },
      status: 'missing' as const,
      suggestions: [`Agregar: ${f.name}`],
      priorityLabel: 'Recomendado',
      priorityColor: 'blue',
    })),
  ]

  return {
    score,
    status,
    summary: {
      critical: { missing: criticalMissing.length, total: criticalFields.length },
      important: { missing: importantMissing.length, total: importantFields.length },
      conditional: { missing: conditionalMissing.length, total: conditionalFields.length },
    },
    missingFields,
  }
}

/**
 * Merge patient/doctor info into structured data
 */
function mergeExternalInfo(
  data: ClinicalReportData,
  patientInfo?: z.infer<typeof RequestSchema>['patientInfo'],
  doctorInfo?: z.infer<typeof RequestSchema>['doctorInfo']
): ClinicalReportData {
  const merged = { ...data }

  if (patientInfo) {
    merged.paciente = {
      ...merged.paciente,
      nombre: patientInfo.nombre || merged.paciente.nombre,
      edad: patientInfo.edad ?? merged.paciente.edad,
      sexo: patientInfo.sexo ?? merged.paciente.sexo,
      fecha_nacimiento: patientInfo.fecha_nacimiento ?? merged.paciente.fecha_nacimiento,
    }
  }

  if (doctorInfo) {
    merged.medico = {
      nombre: doctorInfo.nombre || merged.medico?.nombre || 'Doctor',
      especialidad: doctorInfo.especialidad || merged.medico?.especialidad,
      cedula_profesional: doctorInfo.cedula_profesional || merged.medico?.cedula_profesional,
    }
  }

  return merged
}

// =============================================================================
// API HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = performance.now()

  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const validation = RequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const {
      transcript,
      fieldResponses,
      existingStructuredData,
      patientInfo,
      doctorInfo,
      context: providedContext,
    } = validation.data

    let structuredData: ClinicalReportData

    // =======================================================================
    // FAST PATH: Update existing structured data with field responses
    // =======================================================================
    if (fieldResponses?.length && existingStructuredData) {
      console.log(`[enrich-report] Fast path: updating ${fieldResponses.length} fields`)

      // Parse existing structured data
      const parseResult = ClinicalReportDataSchema.safeParse(existingStructuredData)
      if (!parseResult.success) {
        console.warn('[enrich-report] Invalid existingStructuredData, falling back to AI extraction')
        // Fall through to AI extraction
      } else {
        structuredData = parseResult.data

        // Apply field updates
        for (const { fieldId, value } of fieldResponses) {
          if (value.trim()) {
            structuredData = updateFieldInReport(structuredData, fieldId, value.trim())
          }
        }

        // Merge external info
        structuredData = mergeExternalInfo(structuredData, patientInfo, doctorInfo)

        // Render markdown
        const improvedReport = renderClinicalReportToMarkdown(structuredData)

        // Calculate compliance (deterministic!)
        const context = inferContextFromTranscript(transcript, providedContext)
        const compliance = calculateCompliance(structuredData, context)

        // Build questions for remaining missing fields
        const blockingMissing = compliance.missingFields.filter(
          f => f.field.priority === 'CRITICAL' || f.field.priority === 'IMPORTANT'
        )

        const questionsForDoctor: QuestionForDoctor[] = blockingMissing.map(f => ({
          fieldId: f.field.id,
          fieldName: f.field.name,
          question: QUESTION_TEMPLATES[f.field.id] ?? `Por favor proporcione: ${f.field.name}`,
          priority: f.field.priority,
        }))

        const response: EnrichReportResponse = {
          improvedReport,
          structuredData,
          missingInformation: blockingMissing.map(f => f.field.name),
          questionsForDoctor,
          compliance,
        }

        const duration = Math.round(performance.now() - startTime)
        console.log(`[enrich-report] ${duration}ms | FAST | score=${compliance.score}`)

        return NextResponse.json(response)
      }
    }

    // =======================================================================
    // STANDARD PATH: AI extraction from transcript
    // =======================================================================
    console.log('[enrich-report] Standard path: AI extraction')

    const aiResponse = await ai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: STRUCTURED_EXTRACTION_PROMPT },
        { role: 'user', content: transcript },
      ],
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    })

    const responseText = aiResponse.choices[0]?.message?.content ?? ''
    const parsed = parseAIJson<Partial<ClinicalReportData>>(responseText)

    if (!parsed) {
      console.error('[enrich-report] Failed to parse AI response:', responseText.slice(0, 500))
      return NextResponse.json(
        { error: 'Failed to extract structured data from transcript' },
        { status: 500 }
      )
    }

    // Build structured data with defaults
    structuredData = {
      paciente: {
        nombre: parsed.paciente?.nombre || patientInfo?.nombre || 'Paciente',
        edad: parsed.paciente?.edad ?? patientInfo?.edad,
        sexo: parsed.paciente?.sexo ?? patientInfo?.sexo,
        fecha_nacimiento: patientInfo?.fecha_nacimiento,
      },
      medico: {
        nombre: doctorInfo?.nombre || 'Doctor',
        especialidad: doctorInfo?.especialidad,
        cedula_profesional: doctorInfo?.cedula_profesional,
      },
      consulta: {
        fecha: parsed.consulta?.fecha || new Date().toISOString().split('T')[0],
        tipo: parsed.consulta?.tipo || 'primera_vez',
      },
      motivo_consulta: parsed.motivo_consulta || '',
      diagnosticos: parsed.diagnosticos || [],
      signos_vitales: parsed.signos_vitales,
      exploracion_fisica: parsed.exploracion_fisica,
      sintomas: parsed.sintomas,
      antecedentes: parsed.antecedentes,
      alergias: parsed.alergias,
      medicamentos_actuales: parsed.medicamentos_actuales,
      plan_tratamiento: parsed.plan_tratamiento,
      seguimiento: parsed.seguimiento,
      evolucion: parsed.evolucion,
      resultados_laboratorio: parsed.resultados_laboratorio,
      notas_adicionales: parsed.notas_adicionales,
      transcript_original: transcript,
    }

    // Merge external info
    structuredData = mergeExternalInfo(structuredData, patientInfo, doctorInfo)

    // Render markdown from structured data
    const improvedReport = renderClinicalReportToMarkdown(structuredData)

    // Calculate compliance (deterministic!)
    const context = inferContextFromTranscript(transcript, providedContext)
    const compliance = calculateCompliance(structuredData, context)

    // Build questions for missing fields
    const blockingMissing = compliance.missingFields.filter(
      f => f.field.priority === 'CRITICAL' || f.field.priority === 'IMPORTANT'
    )

    const questionsForDoctor: QuestionForDoctor[] = blockingMissing.map(f => ({
      fieldId: f.field.id,
      fieldName: f.field.name,
      question: QUESTION_TEMPLATES[f.field.id] ?? `Por favor proporcione: ${f.field.name}`,
      priority: f.field.priority,
    }))

    const response: EnrichReportResponse = {
      improvedReport,
      structuredData,
      missingInformation: blockingMissing.map(f => f.field.name),
      questionsForDoctor,
      compliance,
    }

    const duration = Math.round(performance.now() - startTime)
    console.log(`[enrich-report] ${duration}ms | AI | score=${compliance.score} | fields=${Object.keys(parsed).length}`)

    return NextResponse.json(response)

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[enrich-report] Error:', message)

    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    )
  }
}
