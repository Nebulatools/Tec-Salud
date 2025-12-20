import { NextRequest, NextResponse } from 'next/server'
import { ai, MODEL } from '@/lib/ai/openrouter'
import type { StructuredDiagnosis } from '@/types/icd'

const COMPLIANCE_PROMPT = `ROL Y MISIÓN
Eres un Asistente de Documentación Médica especializado en Cumplimiento Normativo. Tu misión es tomar la transcripción de una consulta médica y transformarla en un reporte profesional que cumpla rigurosamente con los estándares de documentación requeridos. Eres un experto en estructurar información clínica y en identificar lagunas de información de acuerdo a un marco regulatorio estricto.

IMPORTANTE: CONTEXTO Y CONSISTENCIA
- Debes ser CONSISTENTE en tu evaluación. Si la transcripción ya incluye respuestas a preguntas previamente identificadas, debes reconocerlas y NO volver a pedirlas.
- Si encuentras información adicional proporcionada por el médico (marcada como "INFORMACIÓN ADICIONAL PROPORCIONADA POR EL MÉDICO"), debes incorporarla al reporte y actualizar tu evaluación.
- El número de campos faltantes debe DISMINUIR o mantenerse igual, NUNCA aumentar cuando se proporciona información adicional.
- Cuando la información adicional incluya identificadores del paciente (Nombre, Edad, Sexo/Género) o del médico tratante, debes reflejarlos explícitamente en la sección "Información de Identificación" del reporte con líneas tipo: "Nombre del paciente:", "Edad:", "Sexo:", "Nombre del médico tratante:". Si están presentes, NO deben aparecer como faltantes.

CONTEXTO REGULATORIO Y FUENTE DE VERDAD
Tu única y exclusiva fuente de verdad para el contenido y la estructura del reporte médico es la siguiente lista de requerimientos obligatorios, extraída del Apéndice A ("Documentation Contents of the Medical Record"). Solo solicita campos que sean relevantes y aplicables al tipo de consulta.

LISTA DE CAMPOS OBLIGATORIOS DEL REPORTE MÉDICO:

  * Información de Identificación: Nombre del paciente, Edad, Sexo, Fecha y hora de consulta, Nombre del médico tratante.
  * Información Clínica Principal: Motivo de consulta, Historia de la enfermedad actual, Antecedentes médicos relevantes, Registro de alergias, Medicamentos actuales, Examen Físico, Diagnóstico/Impresión diagnóstica, Plan de tratamiento, Indicaciones para el paciente.
  * Resultados y Procedimientos (solo si aplican): Resultados de laboratorio, Resultados de estudios, Interconsultas solicitadas.
  * Seguimiento: Próxima cita o instrucciones de seguimiento.

METODOLOGÍA: PROCESO OBLIGATORIO DE DOS PASOS
Debes procesar el input del usuario siguiendo rigurosamente estas dos fases en orden.

  * Fase 1: Estructuración del Reporte Médico: Analiza la transcripción completa, extrae la información clínica relevante y re-escríbela en un formato de reporte profesional, usando encabezados claros basados en la lista de arriba.
  * Fase 2: Auditoría de Cumplimiento y Generación de Preguntas: Compara el reporte estructurado con la LISTA DE CAMPOS OBLIGATORIOS. Identifica todos los campos mandatorios que faltan. Para cada uno, genera una pregunta clara y específica para el médico.

INPUT DEL USUARIO
El input será la transcripción en texto plano de una consulta médica.

FORMATO DE SALIDA
Tu respuesta final DEBE ser un único objeto JSON, sin ningún texto o explicación adicional. La estructura del JSON debe ser rigurosamente la siguiente:

{
  "improvedReport": "El reporte completo basado en la información disponible en la transcripción, estructurado profesionalmente con formato Markdown.",
  "missingInformation": [
    "Nombre del campo faltante 1",
    "Nombre del campo faltante 2"
  ],
  "questionsForDoctor": [
    "Pregunta específica para obtener el campo 1",
    "Pregunta específica para obtener el campo 2"
  ]
}

  * improvedReport: Un string que contiene el reporte médico completo y formateado.
  * missingInformation: Un array de strings, donde cada string es el nombre exacto del campo faltante según la lista de requerimientos.
  * questionsForDoctor: Un array de strings, donde cada string es la pregunta correspondiente para el médico.
  * Si el reporte está completo, los arrays missingInformation y questionsForDoctor deben estar vacíos [].`

export async function POST(request: NextRequest) {
  console.log('=== ENRICH REPORT API CALLED ===')

  try {
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY not found in environment variables')
      return NextResponse.json(
        { error: 'Server configuration error: Missing API key' },
        { status: 500 }
      )
    }

    const { transcript, additionalInfo, structuredDiagnoses } = await request.json()
    console.log('Received transcript length:', transcript?.length || 0)
    console.log('Additional info provided:', additionalInfo?.length || 0)
    console.log('Structured diagnoses provided:', structuredDiagnoses?.length || 0)

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 })
    }

    // Si hay información adicional, agrégala a la transcripción
    let fullTranscript = transcript
    if (additionalInfo && additionalInfo.length > 0) {
      fullTranscript += '\n\n=== INFORMACIÓN ADICIONAL PROPORCIONADA POR EL MÉDICO ===\n'
      additionalInfo.forEach((info: { question: string; answer: string }) => {
        fullTranscript += `\nPregunta: ${info.question}\nRespuesta: ${info.answer}\n`
      })
    }

    // Si hay diagnósticos estructurados con códigos ICD, agrégalos al contexto
    if (structuredDiagnoses && structuredDiagnoses.length > 0) {
      fullTranscript += '\n\n=== DIAGNÓSTICOS CON CÓDIGOS CIE-11 (YA CODIFICADOS) ===\n'
      fullTranscript += 'IMPORTANTE: Incluye estos diagnósticos con sus códigos CIE-11 en la sección de Diagnóstico del reporte.\n\n'
      structuredDiagnoses.forEach((diag: StructuredDiagnosis, index: number) => {
        const code = diag.icd11_code || 'Sin código'
        const title = diag.icd11_title || diag.original_text
        const verified = diag.verified_by_doctor ? '✓ Verificado' : 'Pendiente verificación'
        fullTranscript += `${index + 1}. [${code}] ${title} (${verified})\n`
      })
    }

    console.log('Calling OpenRouter API...')
    const response = await ai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: COMPLIANCE_PROMPT + '\n\nTRANSCRIPCIÓN:\n' + fullTranscript,
        },
      ],
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    })

    const text = response.choices[0]?.message?.content || ''
    console.log('AI Response length:', text.length)
    console.log('AI Response preview:', text.substring(0, 200))

    try {
      const trySafeParse = (t: string) => {
        try {
          return JSON.parse(t)
        } catch {
          const start = t.indexOf('{')
          if (start === -1) return null
          let candidate = t.slice(start)
          const lastBrace = candidate.lastIndexOf('}')
          if (lastBrace > 0 && lastBrace < candidate.length - 1) {
            candidate = candidate.slice(0, lastBrace + 1)
          }
          let openCurly = 0
          for (const ch of candidate) {
            if (ch === '{') openCurly++
            else if (ch === '}') openCurly = Math.max(0, openCurly - 1)
          }
          candidate += '}'.repeat(openCurly)
          try {
            return JSON.parse(candidate)
          } catch {
            return null
          }
        }
      }

      const parsedResponse = trySafeParse(text)
      if (!parsedResponse) {
        throw new Error('Invalid JSON payload')
      }
      console.log('Successfully parsed AI response')
      return NextResponse.json(parsedResponse)
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      console.error('Raw AI response:', text)
      return NextResponse.json(
        { error: 'Invalid response format from AI', details: text.substring(0, 500) },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in enrich-report API:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    })

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
