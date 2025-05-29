import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const language = formData.get('language') as string || 'es-MX'

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'No audio file provided' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    // Convert audio file to base64
    const arrayBuffer = await audioFile.arrayBuffer()
    const audioBytes = new Uint8Array(arrayBuffer)
    const base64Audio = Buffer.from(audioBytes).toString('base64')

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // Create the request for audio transcription
    const prompt = `
      Por favor transcribe el siguiente audio a texto en español. 
      El audio contiene una consulta médica entre doctor y paciente.
      Devuelve únicamente la transcripción del texto, sin comentarios adicionales.
      
      Formato esperado: transcripción directa del audio hablado.
    `

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: audioFile.type,
          data: base64Audio
        }
      }
    ])

    const transcript = result.response.text()

    return NextResponse.json({
      success: true,
      transcript: transcript.trim(),
      language: language
    })

  } catch (error) {
    console.error('Transcription error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown transcription error' 
      },
      { status: 500 }
    )
  }
} 