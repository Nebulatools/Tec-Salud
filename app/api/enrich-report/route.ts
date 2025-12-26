import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ai, MODEL } from '@/lib/ai/openrouter'
import { evaluateCompliance, formatComplianceForUI, type ComplianceContext } from '@/lib/compliance/fields-schema'

// =============================================================================
// TYPES & VALIDATION
// =============================================================================

const RequestSchema = z.object({
  transcript: z.string().min(1, 'Transcript is required'),
  additionalInfo: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).optional(),
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
  status: string
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

interface EnrichReportResponse {
  improvedReport: string
  missingInformation: string[]
  questionsForDoctor: string[]
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
} as const

// Prompt determinístico de estructura (alineado al plan):
// La IA solo estructura el reporte; la detección de faltantes se hace con el schema en backend.
const REPORT_STRUCTURE_PROMPT = `ROL: Eres un asistente de documentación médica.

TAREA: Toma la transcripción de una consulta médica y estructúrala en un reporte profesional con formato Markdown.

IMPORTANTE:
- Si existe una sección "=== INFORMACIÓN ADICIONAL ===" con preguntas y respuestas, úsala para completar el reporte.
- Extrae SOLO información explícitamente mencionada en la transcripción o en la información adicional.
- NO inventes información.

ESTRUCTURA DEL REPORTE (usa exactamente estos encabezados y bullets):

## Información de Identificación
*  **Nombre del paciente:** [extraer o marcar [Faltante]]
*  **Edad:** [extraer o marcar [Faltante]]
*  **Sexo:** [extraer o marcar [Faltante]]
*  **Fecha y hora de consulta:** [extraer o marcar [Faltante]]
*  **Nombre del médico tratante:** [extraer o marcar [Faltante]]

## Información Clínica Principal
*  **Motivo de consulta:** [extraer]
*  **Historia de la enfermedad actual:** [extraer]
*  **Antecedentes médicos relevantes:** [extraer o "No referidos"]
*  **Registro de alergias:** [extraer o "No referidas"]
*  **Medicamentos actuales:** [extraer o "No referidos"]
*  **Examen físico:** [extraer hallazgos]
*  **Diagnóstico/Impresión diagnóstica:** [extraer]
*  **Plan de tratamiento:** [extraer]
*  **Indicaciones para el paciente:** [extraer]

## Resultados y Procedimientos (si aplican)
*  **Resultados de laboratorio:** [extraer si se mencionan]
*  **Resultados de estudios:** [extraer si se mencionan]
*  **Interconsultas solicitadas:** [extraer si se mencionan]

## Seguimiento
*  **Próxima cita o instrucciones de seguimiento:** [extraer]

REGLAS:
1. Marca como [Faltante] los campos sin información (excepto antecedentes/alergias/medicamentos: usar "No referido/a" si no se mencionan).
2. Si NO hay mención de labs/estudios/interconsultas, incluye la sección "Resultados y Procedimientos (si aplican)" pero llena con "No aplica".
3. Mantén el formato Markdown exacto (encabezados y bullets).

FORMATO DE SALIDA: JSON con estructura:
{
  "improvedReport": "El reporte en Markdown"
}`

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

// =============================================================================
// UTILITY FUNCTIONS (defined once, not per-request)
// =============================================================================

/**
 * Robust JSON parser for AI responses
 * Handles: BOM, markdown blocks, unescaped newlines, malformed JSON
 */
function parseAIJson<T = Record<string, unknown>>(raw: string): T | null {
  const cleaned = raw
    .trim()
    .replace(/^\uFEFF/, '')
    .replace(/^```json?\s*/i, '')
    .replace(/```\s*$/, '')

  // Fast path: direct parse
  try {
    return JSON.parse(cleaned)
  } catch {
    // Continue
  }

  // Fix unescaped newlines in strings
  try {
    const fixed = cleaned.replace(
      /"((?:[^"\\]|\\.)*)"/g,
      (m) => m.replace(/[\r\n]+/g, '\\n').replace(/\t/g, '\\t')
    )
    return JSON.parse(fixed)
  } catch {
    // Continue
  }

  // Extract JSON by balanced braces (handles prefix text)
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

/**
 * Extracts improvedReport from text via regex (last resort)
 */
function extractReportByRegex(text: string): string | undefined {
  const match = text.match(/"improvedReport"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/)
  if (!match?.[1]) return undefined

  return match[1]
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

/**
 * Builds full transcript with additional info
 */
function buildFullTranscript(
  transcript: string,
  additionalInfo?: Array<{ question: string; answer: string }>
): string {
  if (!additionalInfo?.length) return transcript

  const additions = additionalInfo
    .map(({ question, answer }) => `P: ${question}\nR: ${answer}`)
    .join('\n\n')

  return `${transcript}\n\n=== INFORMACIÓN ADICIONAL ===\n${additions}`
}

// =============================================================================
// API HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = performance.now()

  try {
    // Validate API key at runtime (allows for hot-reload of env vars)
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Parse and validate request
    const body = await request.json()
    const validation = RequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { transcript, additionalInfo } = validation.data
    const fullTranscript = buildFullTranscript(transcript, additionalInfo)

    // STEP 1: AI report structuring + field extraction (single call)
    const aiResponse = await ai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: REPORT_STRUCTURE_PROMPT },
        { role: 'user', content: fullTranscript },
      ],
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    })

    const responseText = aiResponse.choices[0]?.message?.content ?? ''

    // STEP 2: Parse AI response - get report only
    interface AIResponse {
      improvedReport?: string
    }

    const parsed = parseAIJson<AIResponse>(responseText)
    let improvedReport = parsed?.improvedReport

    if (!improvedReport) {
      // Regex fallback for report only
      improvedReport = extractReportByRegex(responseText)
    }

    if (!improvedReport) {
      console.error('Failed to parse AI response:', responseText.slice(0, 500))
      return NextResponse.json(
        { error: 'Failed to generate report' },
        { status: 500 }
      )
    }

    // STEP 3: Deterministic compliance evaluation (schema-based)
    const context = inferContextFromTranscript(fullTranscript, validation.data.context)
    const report = evaluateCompliance('ad-hoc', improvedReport, context)
    const ui = formatComplianceForUI(report)

    // Solo bloquear el flujo por CRITICAL + IMPORTANT; CONDITIONAL es recomendado
    const blockingMissing = [
      ...report.criticalMissing,
      ...report.importantMissing,
    ]

    // Orden estable: críticos primero, luego importantes
    const missingInformation = blockingMissing.map(r => r.field.name)
    const questionsForDoctor = blockingMissing.map(r =>
      QUESTION_TEMPLATES[r.field.id] ?? `Por favor proporcione: ${r.field.name}`
    )

    const compliance: ComplianceData = {
      score: ui.score,
      status: ui.status,
      summary: ui.summary,
      missingFields: ui.missingFields.map((r: any) => ({
        field: {
          id: r.field.id,
          name: r.field.name,
          priority: r.field.priority,
        },
        status: r.status,
        value: r.value,
        suggestions: r.suggestions,
        priorityLabel: r.priorityLabel,
        priorityColor: r.priorityColor,
      })),
    }

    const response: EnrichReportResponse = {
      improvedReport,
      missingInformation,
      questionsForDoctor,
      compliance,
    }

    // Log performance
    const duration = Math.round(performance.now() - startTime)
    console.log(`[enrich-report] ${duration}ms | status=${compliance.status} | score=${compliance.score} | len=${improvedReport.length}`)

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
