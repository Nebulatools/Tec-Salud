import { NextRequest, NextResponse } from 'next/server'
import { ai, MODEL } from '@/lib/ai/openrouter'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const language = (formData.get('language') as string) || 'es-MX'

    if (!audioFile) {
      return NextResponse.json({ success: false, error: 'No audio file provided' }, { status: 400 })
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    // Convert audio file to base64
    const arrayBuffer = await audioFile.arrayBuffer()
    const base64Audio = Buffer.from(arrayBuffer).toString('base64')

    // Determine audio format from MIME type
    const mimeType = audioFile.type || 'audio/webm'
    const format = mimeType.split('/')[1]?.split(';')[0] || 'webm'

    const prompt = `Por favor transcribe el siguiente audio a texto en español.
El audio contiene una consulta médica entre doctor y paciente.
Devuelve únicamente la transcripción del texto, sin comentarios adicionales.

Formato esperado: transcripción directa del audio hablado.`

    const response = await ai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'input_audio',
              input_audio: {
                data: base64Audio,
                format: format,
              },
            },
          ] as unknown as string, // OpenAI SDK types don't include input_audio yet
        },
      ],
    })

    const transcript = response.choices[0]?.message?.content || ''

    return NextResponse.json({
      success: true,
      transcript: transcript.trim(),
      language: language,
    })
  } catch (error) {
    console.error('Transcription error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown transcription error',
      },
      { status: 500 }
    )
  }
}
