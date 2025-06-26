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
  try {
    const { reportText } = await request.json();

    if (!reportText) {
      return NextResponse.json(
        { error: 'Report text is required' },
        { status: 400 }
      );
    }

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

    const result = await model.generateContent(SUGGESTIONS_PROMPT + "\n\nREPORTE MÉDICO:\n" + reportText);
    const response = await result.response;
    const text = response.text();
    
    try {
      const parsedResponse = JSON.parse(text);
      return NextResponse.json(parsedResponse);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return NextResponse.json(
        { error: 'Invalid response format from AI' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in get-clinical-suggestions API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}