import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin, isSupabaseAdminService } from "@/lib/supabase-admin"
import OpenAI from "openai"

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseAdminService) {
      return NextResponse.json(
        { error: "Configura SUPABASE_SERVICE_ROLE_KEY en el backend para ejecutar el pasante virtual (RLS bloquea con anon key)." },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { lab_order_id, patient_user_id, specialty_id } = body

    if (!lab_order_id || !patient_user_id) {
      return NextResponse.json({ error: "lab_order_id y patient_user_id son requeridos" }, { status: 400 })
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("lab_orders")
      .select("id, doctor_id, patient_id, patient_user_id, specialty_id, recommended_tests")
      .eq("id", lab_order_id)
      .maybeSingle()

    if (orderError || !order) {
      return NextResponse.json({ error: "No se encontró la orden" }, { status: 404 })
    }

    const doctorId = order.doctor_id
    if (!doctorId) {
      return NextResponse.json({ error: "Orden sin doctor asignado" }, { status: 400 })
    }

    const { data: labs } = await supabaseAdmin
      .from("lab_results")
      .select("storage_path, uploaded_at")
      .eq("lab_order_id", lab_order_id)

    const { data: baseline } = await supabaseAdmin
      .from("patient_baseline_forms")
      .select("general_info, vitals, lifestyle, conditions")
      .eq("patient_user_id", patient_user_id)
      .maybeSingle()

    const { data: responses } = await supabaseAdmin
      .from("specialist_responses")
      .select("answer, specialist_questions(prompt)")
      .eq("patient_user_id", patient_user_id)
      .eq("specialty_id", specialty_id ?? order.specialty_id)

    const parsedTests = (() => {
      const rec = order.recommended_tests
      if (!rec) return { tests: [], lab_provider: null }
      if (Array.isArray(rec)) return { tests: rec, lab_provider: null }
      if (typeof rec === "object") return { tests: rec.tests ?? rec, lab_provider: (rec as any).lab_provider ?? null }
      return { tests: [], lab_provider: null }
    })()

    // --- LLM (OpenAI) ---
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json({ error: "Configura OPENAI_API_KEY para ejecutar el pasante virtual (LLM requerido)." }, { status: 500 })
    }
    const openaiModel = process.env.OPENAI_MODEL || "gpt-4o-mini"
    const openai = new OpenAI({ apiKey: openaiKey })

    const responsesSummary =
      responses
        ?.map((r: any) => `• ${r.specialist_questions?.prompt ?? "Pregunta"} → ${JSON.stringify(r.answer)}`)
        .join("\n") ?? "Sin respuestas"

    const labsSummary =
      labs && labs.length > 0
        ? labs.map((l) => `• ${l.storage_path} (${l.uploaded_at})`).join("\n")
        : "Sin resultados cargados"

    const prompt = `
Eres un pasante virtual médico. Resume de forma concisa y sugiere los siguientes pasos clínicos.

Contexto:
- Paciente user_id: ${patient_user_id}
- Doctor id: ${doctorId}
- Especialidad: ${specialty_id ?? order.specialty_id ?? "N/D"}
- Pruebas solicitadas: ${JSON.stringify(parsedTests.tests)}
- Laboratorio elegido: ${parsedTests.lab_provider ?? "N/D"}
- Baseline: ${JSON.stringify(baseline ?? {})}
- Respuestas de especialidad:
${responsesSummary}
- Resultados de laboratorio cargados:
${labsSummary}

Devuelve un resumen corto (2-4 líneas) y una lista de 3-5 sugerencias accionables para el médico.
`

    let llmSummary = "Sin resumen LLM"
    let llmSuggestions: string[] = []
    try {
      const completion = await openai.chat.completions.create({
        model: openaiModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      })
      const text = completion.choices?.[0]?.message?.content || ""
      llmSummary = text.trim() || llmSummary
      llmSuggestions = text
        .split(/\n|•|-/)
        .map((s) => s.trim())
        .filter((s) => s.length > 3)
        .slice(0, 5)
    } catch (err: any) {
      return NextResponse.json({ error: `LLM error: ${err.message ?? "desconocido"}` }, { status: 500 })
    }

    const { data: run, error: runError } = await supabaseAdmin
      .from("virtual_intern_runs")
      .insert({
        doctor_id: doctorId,
        patient_user_id,
        patient_id: order.patient_id,
        lab_order_id,
        specialty_id: specialty_id ?? order.specialty_id,
        status: "succeeded",
        summary: llmSummary,
        suggestions: llmSuggestions.length ? llmSuggestions : ["Revisa resultados y confirma plan"],
        completed_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle()

    if (runError) {
      return NextResponse.json({ error: runError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, run })
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
