import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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
}`;

export async function POST(request: NextRequest) {
  console.log('=== CLINICAL SUGGESTIONS API CALLED ===');
  
  try {
    // Verificar variables de entorno
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error: Missing API key' },
        { status: 500 }
      );
    }

    const { reportText } = await request.json();
    console.log('Received report text length:', reportText?.length || 0);

    if (!reportText) {
      return NextResponse.json(
        { error: 'Report text is required' },
        { status: 400 }
      );
    }

    console.log('Initializing Gemini model...');
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.3,
        topK: 1,
        topP: 0.3,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      }
    });

    console.log('Calling Gemini API for suggestions...');
    const result = await model.generateContent(SUGGESTIONS_PROMPT + "\n\nREPORTE MÉDICO:\n" + reportText);
    const response = await result.response;
    const text = response.text();
    
    console.log('Suggestions AI Response length:', text?.length || 0);
    console.log('Suggestions AI Response preview:', text?.substring(0, 200));
    
    try {
      const parsedResponse = JSON.parse(text);
      console.log('Successfully parsed suggestions response');
      return NextResponse.json(parsedResponse);
    } catch (parseError) {
      console.error('Error parsing suggestions AI response:', parseError);
      console.error('Raw suggestions AI response:', text);
      return NextResponse.json(
        { error: 'Invalid response format from AI', details: text?.substring(0, 500) },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in get-clinical-suggestions API:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}