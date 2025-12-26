import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin, isSupabaseAdminService } from "@/lib/supabase-admin"
import OpenAI from "openai"

interface DataSourcesAnalyzed {
  baseline_form: boolean
  specialty_responses: boolean
  lab_results: boolean
  medical_reports: boolean
  clinical_extractions: boolean
  patient_info: boolean
}

interface Finding {
  source: string
  type: 'observation' | 'concern' | 'improvement' | 'pattern'
  description: string
  relevance: 'high' | 'medium' | 'low'
}

interface Alert {
  type: 'critical' | 'warning' | 'info'
  source: string
  message: string
  recommendation?: string
}

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseAdminService) {
      return NextResponse.json(
        { error: "Configura SUPABASE_SERVICE_ROLE_KEY en el backend para ejecutar el pasante virtual (RLS bloquea con anon key)." },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { lab_order_id, patient_user_id, specialty_id, patient_id } = body

    if (!patient_user_id) {
      return NextResponse.json({ error: "patient_user_id es requerido" }, { status: 400 })
    }

    // Inicializar tracking de fuentes analizadas
    const dataSourcesAnalyzed: DataSourcesAnalyzed = {
      baseline_form: false,
      specialty_responses: false,
      lab_results: false,
      medical_reports: false,
      clinical_extractions: false,
      patient_info: false,
    }

    const findings: Finding[] = []
    const alerts: Alert[] = []

    // 1. ORDEN DE LABORATORIO (opcional)
    let order: any = null
    let doctorId: string | null = null
    let finalPatientId = patient_id

    if (lab_order_id) {
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from("lab_orders")
        .select("id, doctor_id, patient_id, patient_user_id, specialty_id, recommended_tests, status")
        .eq("id", lab_order_id)
        .maybeSingle()

      if (!orderError && orderData) {
        order = orderData
        doctorId = order.doctor_id
        finalPatientId = finalPatientId || order.patient_id
      }
    }

    // Obtener doctor_id de otra fuente si no hay orden
    if (!doctorId) {
      const { data: link } = await supabaseAdmin
        .from("doctor_patient_links")
        .select("doctor_id")
        .eq("patient_user_id", patient_user_id)
        .eq("status", "accepted")
        .maybeSingle()

      if (link) {
        doctorId = link.doctor_id
      }
    }

    if (!doctorId) {
      return NextResponse.json({ error: "No se pudo determinar el doctor asociado" }, { status: 400 })
    }

    // 2. INFORMACIÓN DEL PACIENTE (Fuente 1)
    const { data: patientInfo } = await supabaseAdmin
      .from("patients")
      .select("id, first_name, last_name, date_of_birth, gender, allergies, current_medications, medical_history")
      .eq("user_id", patient_user_id)
      .maybeSingle()

    if (patientInfo) {
      dataSourcesAnalyzed.patient_info = true
      finalPatientId = finalPatientId || patientInfo.id

      // Extraer hallazgos de info del paciente
      if (patientInfo.allergies && patientInfo.allergies.trim()) {
        findings.push({
          source: 'patient_info',
          type: 'observation',
          description: `Alergias documentadas: ${patientInfo.allergies}`,
          relevance: 'high',
        })
      }
      if (patientInfo.current_medications && patientInfo.current_medications.trim()) {
        findings.push({
          source: 'patient_info',
          type: 'observation',
          description: `Medicamentos actuales: ${patientInfo.current_medications}`,
          relevance: 'medium',
        })
      }
    }

    // 3. CUESTIONARIO BASE (Fuente 2)
    const { data: baseline } = await supabaseAdmin
      .from("patient_baseline_forms")
      .select("general_info, vitals, lifestyle, conditions, submitted_at")
      .eq("patient_user_id", patient_user_id)
      .order("submitted_at", { ascending: false })
      .maybeSingle()

    if (baseline) {
      dataSourcesAnalyzed.baseline_form = true

      // Analizar condiciones preexistentes
      if (baseline.conditions && Object.keys(baseline.conditions).length > 0) {
        const conditions = baseline.conditions as Record<string, unknown>
        const activeConditions = Object.entries(conditions)
          .filter(([_, v]) => v === true || v === 'yes')
          .map(([k]) => k)

        if (activeConditions.length > 0) {
          findings.push({
            source: 'baseline_form',
            type: 'observation',
            description: `Condiciones preexistentes: ${activeConditions.join(', ')}`,
            relevance: 'high',
          })
        }
      }

      // Analizar signos vitales si hay anomalías
      if (baseline.vitals) {
        const vitals = baseline.vitals as Record<string, unknown>
        // Ejemplo: detectar hipertensión
        const systolic = Number(vitals.systolic_bp || vitals.ta_sistolica || 0)
        const diastolic = Number(vitals.diastolic_bp || vitals.ta_diastolica || 0)
        if (systolic > 140 || diastolic > 90) {
          alerts.push({
            type: 'warning',
            source: 'baseline_form',
            message: `Presión arterial elevada registrada: ${systolic}/${diastolic} mmHg`,
            recommendation: 'Verificar presión arterial actual y considerar evaluación de hipertensión',
          })
        }
      }
    }

    // 4. RESPUESTAS DE ESPECIALIDAD (Fuente 3)
    const effectiveSpecialtyId = specialty_id ?? order?.specialty_id
    let responses: any[] = []

    if (effectiveSpecialtyId) {
      const { data: responsesData } = await supabaseAdmin
        .from("specialist_responses")
        .select("answer, submitted_at, specialist_questions(prompt, field_type)")
        .eq("patient_user_id", patient_user_id)
        .eq("specialty_id", effectiveSpecialtyId)
        .order("submitted_at", { ascending: false })

      if (responsesData && responsesData.length > 0) {
        responses = responsesData
        dataSourcesAnalyzed.specialty_responses = true

        findings.push({
          source: 'specialty_responses',
          type: 'observation',
          description: `${responses.length} respuestas de cuestionario de especialidad disponibles`,
          relevance: 'medium',
        })
      }
    }

    // 5. RESULTADOS DE LABORATORIO (Fuente 4)
    let labs: any[] = []
    if (lab_order_id) {
      const { data: labsData } = await supabaseAdmin
        .from("lab_results")
        .select("id, storage_path, uploaded_at, mime_type")
        .eq("lab_order_id", lab_order_id)

      if (labsData && labsData.length > 0) {
        labs = labsData
        dataSourcesAnalyzed.lab_results = true

        findings.push({
          source: 'lab_results',
          type: 'observation',
          description: `${labs.length} resultado(s) de laboratorio cargados`,
          relevance: 'high',
        })
      }
    }

    // 6. REPORTES MÉDICOS PREVIOS (Fuente 5)
    const { data: medicalReports } = await supabaseAdmin
      .from("medical_reports")
      .select("id, title, content, report_type, created_at, ai_suggestions")
      .eq("patient_user_id", patient_user_id)
      .order("created_at", { ascending: false })
      .limit(5)

    if (medicalReports && medicalReports.length > 0) {
      dataSourcesAnalyzed.medical_reports = true

      findings.push({
        source: 'medical_reports',
        type: 'observation',
        description: `${medicalReports.length} reporte(s) médico(s) previo(s) disponibles`,
        relevance: 'medium',
      })

      // Extraer sugerencias de IA previas
      const allSuggestions = medicalReports
        .flatMap(r => r.ai_suggestions || [])
        .filter((s, i, arr) => arr.indexOf(s) === i) // Únicos
        .slice(0, 5)

      if (allSuggestions.length > 0) {
        findings.push({
          source: 'medical_reports',
          type: 'pattern',
          description: `Sugerencias previas de IA: ${allSuggestions.join('; ')}`,
          relevance: 'medium',
        })
      }
    }

    // 7. EXTRACCIONES CLÍNICAS CON ICD-11 (Fuente 6)
    const { data: clinicalExtractions } = await supabaseAdmin
      .from("clinical_extractions")
      .select("id, symptoms, diagnoses, medications, structured_diagnoses, extracted_at, appointment_id")
      .eq("patient_user_id", patient_user_id)
      .order("extracted_at", { ascending: false })
      .limit(10)

    if (clinicalExtractions && clinicalExtractions.length > 0) {
      dataSourcesAnalyzed.clinical_extractions = true

      // Consolidar diagnósticos únicos
      const allDiagnoses = [...new Set(clinicalExtractions.flatMap(e => e.diagnoses || []))]
      const allSymptoms = [...new Set(clinicalExtractions.flatMap(e => e.symptoms || []))]

      // Procesar diagnósticos estructurados con códigos ICD-11
      const structuredDx = clinicalExtractions.flatMap(e => e.structured_diagnoses || [])
      const icdCodes = structuredDx
        .filter((dx: any) => dx?.icd11_code)
        .map((dx: any) => `${dx.icd11_code}: ${dx.icd11_title || dx.original_text}`)

      if (icdCodes.length > 0) {
        findings.push({
          source: 'clinical_extractions',
          type: 'observation',
          description: `Códigos ICD-11: ${icdCodes.slice(0, 3).join(' | ')}${icdCodes.length > 3 ? ` (+${icdCodes.length - 3} más)` : ''}`,
          relevance: 'high',
        })
      } else if (allDiagnoses.length > 0) {
        findings.push({
          source: 'clinical_extractions',
          type: 'observation',
          description: `Diagnósticos registrados: ${allDiagnoses.slice(0, 5).join(', ')}${allDiagnoses.length > 5 ? '...' : ''}`,
          relevance: 'high',
        })
      }

      if (allSymptoms.length > 0) {
        findings.push({
          source: 'clinical_extractions',
          type: 'observation',
          description: `Síntomas reportados: ${allSymptoms.slice(0, 5).join(', ')}${allSymptoms.length > 5 ? '...' : ''}`,
          relevance: 'medium',
        })
      }

      // Detectar patrones de medicamentos
      const allMedications = clinicalExtractions.flatMap(e => e.medications || [])
      if (allMedications.length > 0) {
        const medNames = [...new Set(allMedications.map((m: any) => m.name))]
        findings.push({
          source: 'clinical_extractions',
          type: 'pattern',
          description: `Medicamentos prescritos: ${medNames.slice(0, 5).join(', ')}`,
          relevance: 'medium',
        })
      }
    }

    // --- PREPARAR CONTEXTO PARA LLM ---
    const parsedTests = (() => {
      if (!order?.recommended_tests) return { tests: [], lab_provider: null }
      const rec = order.recommended_tests
      if (Array.isArray(rec)) return { tests: rec, lab_provider: null }
      if (typeof rec === "object") return { tests: rec.tests ?? rec, lab_provider: (rec as any).lab_provider ?? null }
      return { tests: [], lab_provider: null }
    })()

    const responsesSummary = responses.length > 0
      ? responses.map((r: any) => `• ${r.specialist_questions?.prompt ?? "Pregunta"}: ${JSON.stringify(r.answer)}`).join("\n")
      : "Sin respuestas de especialidad"

    const labsSummary = labs.length > 0
      ? labs.map((l) => `• ${l.storage_path} (${l.uploaded_at})`).join("\n")
      : "Sin resultados de laboratorio"

    const reportsSummary = medicalReports && medicalReports.length > 0
      ? medicalReports.slice(0, 3).map(r => `• ${r.title} (${r.report_type}) - ${r.created_at}`).join("\n")
      : "Sin reportes previos"

    const extractionsSummary = clinicalExtractions && clinicalExtractions.length > 0
      ? `${clinicalExtractions.length} extracciones con diagnósticos y síntomas registrados`
      : "Sin extracciones clínicas"

    const findingsSummary = findings.map(f => `[${f.source}] ${f.description}`).join("\n")
    const alertsSummary = alerts.map(a => `[${a.type.toUpperCase()}] ${a.message}`).join("\n")

    // --- LLM (OpenAI) ---
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json({ error: "Configura OPENAI_API_KEY para ejecutar el pasante virtual (LLM requerido)." }, { status: 500 })
    }
    const openaiModel = process.env.OPENAI_MODEL || "gpt-4o-mini"
    const openai = new OpenAI({ apiKey: openaiKey })

    const prompt = `
Eres un pasante virtual médico altamente capacitado. Analiza TODAS las fuentes de datos del paciente y genera un resumen ejecutivo con sugerencias accionables para el médico tratante.

## FUENTES DE DATOS ANALIZADAS:
${Object.entries(dataSourcesAnalyzed).map(([k, v]) => `- ${k}: ${v ? '✓ Disponible' : '✗ No disponible'}`).join('\n')}

## INFORMACIÓN DEL PACIENTE:
${patientInfo ? `
- Nombre: ${patientInfo.first_name} ${patientInfo.last_name}
- Género: ${patientInfo.gender}
- Fecha nacimiento: ${patientInfo.date_of_birth}
- Alergias: ${patientInfo.allergies || 'No documentadas'}
- Medicamentos actuales: ${patientInfo.current_medications || 'No documentados'}
- Historia médica: ${patientInfo.medical_history || 'No documentada'}
` : 'No disponible'}

## CUESTIONARIO BASE:
${baseline ? JSON.stringify(baseline, null, 2) : 'No completado'}

## RESPUESTAS DE ESPECIALIDAD:
${responsesSummary}

## PRUEBAS DE LABORATORIO SOLICITADAS:
${JSON.stringify(parsedTests.tests)}
Laboratorio: ${parsedTests.lab_provider ?? "N/D"}

## RESULTADOS DE LABORATORIO:
${labsSummary}

## REPORTES MÉDICOS PREVIOS:
${reportsSummary}

## EXTRACCIONES CLÍNICAS:
${extractionsSummary}

## HALLAZGOS IDENTIFICADOS:
${findingsSummary || 'Ninguno identificado'}

## ALERTAS DETECTADAS:
${alertsSummary || 'Ninguna'}

---

INSTRUCCIONES:
1. Genera un RESUMEN EJECUTIVO conciso (3-5 líneas) que integre la información de TODAS las fuentes disponibles
2. Identifica PATRONES relevantes entre las diferentes fuentes de datos
3. Genera 5-7 SUGERENCIAS ACCIONABLES priorizadas para el médico
4. Si detectas inconsistencias o vacíos de información, menciónalos

Responde en formato JSON:
{
  "summary": "Resumen ejecutivo aquí...",
  "suggestions": ["Sugerencia 1", "Sugerencia 2", ...],
  "patterns": ["Patrón identificado 1", ...],
  "gaps": ["Vacío de información 1", ...]
}
`

    let llmSummary = "Sin resumen LLM"
    let llmSuggestions: string[] = []
    let llmPatterns: string[] = []
    let llmGaps: string[] = []

    try {
      const completion = await openai.chat.completions.create({
        model: openaiModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" },
      })
      const text = completion.choices?.[0]?.message?.content || ""

      try {
        const parsed = JSON.parse(text)
        llmSummary = parsed.summary || llmSummary
        llmSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : []
        llmPatterns = Array.isArray(parsed.patterns) ? parsed.patterns : []
        llmGaps = Array.isArray(parsed.gaps) ? parsed.gaps : []
      } catch {
        // Fallback si no es JSON válido
        llmSummary = text.trim() || llmSummary
        llmSuggestions = text
          .split(/\n|•|-/)
          .map((s) => s.trim())
          .filter((s) => s.length > 3)
          .slice(0, 7)
      }
    } catch (err: any) {
      return NextResponse.json({ error: `LLM error: ${err.message ?? "desconocido"}` }, { status: 500 })
    }

    // Agregar gaps como alertas informativas
    llmGaps.forEach(gap => {
      alerts.push({
        type: 'info',
        source: 'analysis',
        message: gap,
        recommendation: 'Considerar recopilar esta información en la próxima consulta',
      })
    })

    // Agregar patrones como findings
    llmPatterns.forEach(pattern => {
      findings.push({
        source: 'analysis',
        type: 'pattern',
        description: pattern,
        relevance: 'high',
      })
    })

    // Guardar en base de datos
    const { data: run, error: runError } = await supabaseAdmin
      .from("virtual_intern_runs")
      .insert({
        doctor_id: doctorId,
        patient_user_id,
        patient_id: finalPatientId,
        lab_order_id: lab_order_id || null,
        specialty_id: effectiveSpecialtyId || null,
        status: "succeeded",
        summary: llmSummary,
        suggestions: llmSuggestions.length ? llmSuggestions : ["Revisa resultados y confirma plan"],
        findings: findings,
        alerts: alerts,
        data_sources_analyzed: dataSourcesAnalyzed,
        completed_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle()

    if (runError) {
      console.error("Error saving virtual intern run:", runError)
      // Si es error de columna no existente, intentar sin las nuevas columnas
      if (runError.message?.includes("column") || runError.code === "42703") {
        const { data: runFallback, error: runFallbackError } = await supabaseAdmin
          .from("virtual_intern_runs")
          .insert({
            doctor_id: doctorId,
            patient_user_id,
            patient_id: finalPatientId,
            lab_order_id: lab_order_id || null,
            specialty_id: effectiveSpecialtyId || null,
            status: "succeeded",
            summary: llmSummary,
            suggestions: llmSuggestions.length ? llmSuggestions : ["Revisa resultados y confirma plan"],
            completed_at: new Date().toISOString(),
          })
          .select()
          .maybeSingle()

        if (runFallbackError) {
          return NextResponse.json({ error: runFallbackError.message }, { status: 500 })
        }

        return NextResponse.json({
          ok: true,
          run: runFallback,
          findings,
          alerts,
          dataSourcesAnalyzed,
          patterns: llmPatterns,
          gaps: llmGaps,
          _note: "Ejecuta la migración SQL para guardar findings/alerts en BD"
        })
      }
      return NextResponse.json({ error: runError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      run,
      findings,
      alerts,
      dataSourcesAnalyzed,
      patterns: llmPatterns,
      gaps: llmGaps,
    })
  } catch (error) {
    console.error("Virtual intern error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
