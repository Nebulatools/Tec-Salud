import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const COMPLIANCE_PROMPT = `ROL Y MISIÓN
Eres un Asistente de Documentación Médica especializado en Cumplimiento Normativo. Tu misión es tomar la transcripción de una consulta médica y transformarla en un reporte profesional que cumpla rigurosamente con los estándares de documentación requeridos. Eres un experto en estructurar información clínica y en identificar lagunas de información de acuerdo a un marco regulatorio estricto.

CONTEXTO REGULATORIO Y FUENTE DE VERDAD
Tu única y exclusiva fuente de verdad para el contenido y la estructura del reporte médico es la siguiente lista de requerimientos obligatorios, extraída del Apéndice A ("Documentation Contents of the Medical Record"). No debes asumir, inferir o añadir ninguna sección o campo que no esté explícitamente en esta lista.

LISTA DE CAMPOS OBLIGATORIOS DEL REPORTE MÉDICO:

  * Información de Identificación: Nombre del paciente, Dirección en admisión, Número de identificación (Medicare, Medi-Cal, Hospital, etc.), Edad, Sexo, Estado Civil, Estatus Legal, Nombre de soltera de la madre, Lugar de nacimiento, Autorización legal para admisión (si aplica), Grado escolar (si aplica), Preferencia religiosa, Fecha y hora de admisión/llegada, Fecha y hora de alta/salida, Nombre/dirección/teléfono de responsable, Nombre del médico tratante, Idioma principal.
  * Información Clínica Principal: Impresión diagnóstica inicial, Diagnóstico final/de alta, Registro de alergias, Directivas anticipadas (si aplica), Historial Médico (inmunización, pruebas, nutrición, psiquiátrico, quirúrgico, médico pasado, social, familiar, neonatal), Examen Físico, Reportes de consultas, Órdenes (medicamentos, tratamientos, recetas, dieta, etc.), Notas de progreso (con diagnóstico actual), Notas de enfermería, Hoja de signos vitales.
  * Resultados y Procedimientos: Resultados de laboratorio, Resultados de Rayos X, Formularios de consentimiento, Registro de Emergencias, Lista de problemas, Registro de anestesia, Reporte de operaciones/procedimientos, Reporte de patología, Instrucciones pre/postoperatorias.
  * Registros Específicos (si aplica): Registro de parto, Terapia física/ocupacional/respiratoria, Plan de Educación, Fotografías del paciente, Instrucciones de alta, Resumen de alta.
  * Comunicaciones: Copias de cartas a pacientes, Encuentros telefónicos documentados.

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
  * Si el reporte está completo, los arrays missingInformation y questionsForDoctor deben estar vacíos [].`;

export async function POST(request: NextRequest) {
  console.log('=== ENRICH REPORT API CALLED ===');
  
  try {
    // Verificar variables de entorno
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error: Missing API key' },
        { status: 500 }
      );
    }

    const { transcript } = await request.json();
    console.log('Received transcript length:', transcript?.length || 0);

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    console.log('Initializing Gemini model...');
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.1,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      }
    });

    console.log('Calling Gemini API...');
    const result = await model.generateContent(COMPLIANCE_PROMPT + "\n\nTRANSCRIPCIÓN:\n" + transcript);
    
    console.log('Getting response...');
    const response = await result.response;
    const text = response.text();
    
    console.log('AI Response length:', text?.length || 0);
    console.log('AI Response preview:', text?.substring(0, 200));
    
    try {
      const parsedResponse = JSON.parse(text);
      console.log('Successfully parsed AI response');
      return NextResponse.json(parsedResponse);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw AI response:', text);
      return NextResponse.json(
        { error: 'Invalid response format from AI', details: text?.substring(0, 500) },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in enrich-report API:', error);
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