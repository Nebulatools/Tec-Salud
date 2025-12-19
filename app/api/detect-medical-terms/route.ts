import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const MEDICAL_DETECTION_PROMPT = `
ROL Y MISIÓN
Eres un asistente médico especializado en terminología clínica en español.
Tu tarea es analizar palabras transcritas de una consulta médica e identificar
cuáles son CLÍNICAMENTE RELEVANTES y podrían afectar el diagnóstico si se transcriben incorrectamente.

FORMATO OBLIGATORIO DE SALIDA (solo JSON, sin texto adicional):
[
  {
    "word": "amoxicilina",
    "isMedical": true,
    "category": "medication"
  },
  {
    "word": "hola",
    "isMedical": false
  }
]

CATEGORÍAS MÉDICAS VÁLIDAS:
- "medication": medicamentos, fármacos, dosis (amoxicilina, paracetamol, 500mg)
- "diagnosis": diagnósticos, enfermedades, condiciones (diabetes, hipertensión, bronquitis)
- "symptom": síntomas, signos clínicos (fiebre, náuseas, mareos, tos, fatiga)
- "anatomy": partes del cuerpo, órganos (abdomen, corazón, hígado, pulmones, rodilla)
- "procedure": procedimientos médicos (radiografía, biopsia, cirugía, electrocardiograma)
- "pain_verb": verbos de dolor/sensación (duele, pica, arde, punza, late, molesta, incomoda)
- "intensity": descriptores de intensidad/severidad (mucho, poco, severo, leve, moderado, intenso, fuerte, agudo)
- "temporal": términos temporales médicos (crónico, agudo, intermitente, constante, días, semanas, meses)
- "emotional": estados emocionales/mentales relevantes (ansiedad, depresión, estrés, nervios, insomnio, angustia)
- "vital_sign": signos vitales y mediciones (presión, pulso, temperatura, saturación, frecuencia)
- "other": otros términos médicos no clasificados

CRITERIO DE CLASIFICACIÓN - INCLUIR si la palabra:
1. Podría cambiar un diagnóstico si se transcribe mal (gastritis vs gastroenteritis)
2. Es un medicamento o podría confundirse con uno
3. Describe ubicación anatómica del problema
4. Describe la severidad, frecuencia o naturaleza del síntoma
5. Afecta la interpretación clínica del caso

CRITERIO DE EXCLUSIÓN - NO incluir (isMedical: false):
1. Artículos, preposiciones, conjunciones (el, la, y, que, como, pero, porque)
2. Pronombres y palabras gramaticales (yo, me, mi, usted, esto, eso)
3. Verbos comunes no médicos (ir, venir, estar, tener, hacer, decir)
4. Saludos y muletillas (hola, bueno, gracias, ok, este, pues)
5. Números aislados sin contexto médico
6. Errores ortográficos de palabras comunes NO médicas

REGLAS:
1. Si una palabra PARECE ser un error de transcripción de un término médico, márcala como médica
2. Los verbos de sensación física SON médicos (duele, pica, arde, etc.)
3. Los adjetivos de intensidad SON médicos cuando describen síntomas
4. category solo se incluye si isMedical es true
5. Responde ÚNICAMENTE con el JSON, sin explicaciones

EJEMPLOS:
- "amoxicilina" → isMedical: true, category: "medication"
- "duele" → isMedical: true, category: "pain_verb"
- "mucho" → isMedical: true, category: "intensity" (describe severidad)
- "crónico" → isMedical: true, category: "temporal"
- "ansiedad" → isMedical: true, category: "emotional"
- "presión" → isMedical: true, category: "vital_sign"
- "el" → isMedical: false
- "hola" → isMedical: false
- "porque" → isMedical: false
`

interface MedicalTermResult {
  word: string
  isMedical: boolean
  category?: 'medication' | 'diagnosis' | 'symptom' | 'anatomy' | 'procedure' | 'pain_verb' | 'intensity' | 'temporal' | 'emotional' | 'vital_sign' | 'other'
}

export async function POST(request: NextRequest) {
  console.log('=== DETECT MEDICAL TERMS API CALLED ===')

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not found in environment variables')
      return NextResponse.json(
        { error: 'Server configuration error: Missing API key' },
        { status: 500 }
      )
    }

    const { words } = await request.json()

    if (!words || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json(
        { error: 'Words array is required' },
        { status: 400 }
      )
    }

    // Deduplicate and limit words to avoid token limits
    const wordSet = new Set(words.map((w: string) => w.toLowerCase()))
    const uniqueWords = Array.from(wordSet)
    const limitedWords = uniqueWords.slice(0, 100) // Limit to 100 unique words

    console.log(`Analyzing ${limitedWords.length} unique words`)

    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent classification
        maxOutputTokens: 2048,
      },
    })

    const prompt = `${MEDICAL_DETECTION_PROMPT}

PALABRAS A ANALIZAR:
${limitedWords.join(', ')}

Responde con un array JSON:`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    console.log('Gemini response:', text.substring(0, 200) + '...')

    // Parse the JSON response
    let medicalTerms: MedicalTermResult[] = []

    try {
      // Extract JSON from response (handle potential markdown code blocks)
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        medicalTerms = JSON.parse(jsonMatch[0])
      } else {
        console.error('No JSON array found in response')
        // Return empty results rather than failing
        medicalTerms = limitedWords.map(word => ({
          word,
          isMedical: false,
        }))
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError)
      // Return empty results rather than failing
      medicalTerms = limitedWords.map(word => ({
        word,
        isMedical: false,
      }))
    }

    // Ensure all requested words have a result (in case Gemini missed some)
    const resultMap = new Map(medicalTerms.map(t => [t.word.toLowerCase(), t]))
    const completeResults: MedicalTermResult[] = limitedWords.map(word => {
      const existing = resultMap.get(word.toLowerCase())
      return existing || { word, isMedical: false }
    })

    console.log(`Detected ${completeResults.filter(t => t.isMedical).length} medical terms`)

    return NextResponse.json(completeResults)
  } catch (error) {
    console.error('Error in detect-medical-terms API:', error)

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Invalid API key configuration' },
          { status: 401 }
        )
      }
      if (error.message.includes('quota') || error.message.includes('rate')) {
        return NextResponse.json(
          { error: 'API rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      {
        error: 'Medical term detection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
