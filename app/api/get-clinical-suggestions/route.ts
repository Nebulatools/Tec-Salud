import { NextRequest, NextResponse } from 'next/server'
import { ai, MODEL } from '@/lib/ai/openrouter'

const SUGGESTIONS_PROMPT = `ROL Y MISIÓN
Eres un Asistente Médico experto con acceso a vasta literatura médica. Tu misión es analizar una nota clínica o reporte médico y proveer sugerencias accionables para ayudar al médico tratante a considerar todos los ángulos posibles para el cuidado del paciente.

TAREA
Analiza el siguiente reporte médico. Basado en los síntomas, diagnósticos iniciales y tratamientos descritos, genera una lista de 2 a 3 sugerencias clínicas. Estas sugerencias deben ser relevantes y prudentes, como posibles estudios de laboratorio o imagen a ordenar, diagnósticos diferenciales a considerar, o puntos importantes para discutir con el paciente en el seguimiento.

INPUT DEL USUARIO
El input será el texto de un reporte médico.

FORMATO DE SALIDA
Tu respuesta final DEBE ser un único objeto JSON con la siguiente estructura:

{
  "suggestions": [
    "Sugerencia clínica 1",
    "Sugerencia clínica 2"
  ]
}`

export async function POST(request: NextRequest) {
  console.log('=== CLINICAL SUGGESTIONS API CALLED ===')

  try {
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY not found in environment variables')
      return NextResponse.json(
        { error: 'Server configuration error: Missing API key' },
        { status: 500 }
      )
    }

    const { reportText } = await request.json()
    console.log('Received report text length:', reportText?.length || 0)

    if (!reportText) {
      return NextResponse.json({ error: 'Report text is required' }, { status: 400 })
    }

    console.log('Calling OpenRouter API for suggestions...')
    const response = await ai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: SUGGESTIONS_PROMPT + '\n\nREPORTE MÉDICO:\n' + reportText,
        },
      ],
      temperature: 0.3,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    })

    const text = response.choices[0]?.message?.content || ''
    console.log('Suggestions AI Response length:', text.length)
    console.log('Suggestions AI Response preview:', text.substring(0, 200))

    const trySafeParse = (t: string) => {
      try {
        return JSON.parse(t)
      } catch {
        // Fallback: extract JSON from response
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

    const parsedResponse = trySafeParse(text) || { suggestions: [] }
    console.log('Successfully parsed suggestions response')
    return NextResponse.json(parsedResponse)
  } catch (error) {
    console.error('Error in get-clinical-suggestions API:', error)
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
