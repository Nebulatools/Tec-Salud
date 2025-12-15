import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { lab_order_id, patient_user_id, specialty_id } = body

    if (!lab_order_id || !patient_user_id) {
      return NextResponse.json({ error: "lab_order_id y patient_user_id son requeridos" }, { status: 400 })
    }

    const { data: order, error: orderError } = await supabase
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

    const { data: labs } = await supabase
      .from("lab_results")
      .select("storage_path, uploaded_at")
      .eq("lab_order_id", lab_order_id)

    const { data: baseline } = await supabase
      .from("patient_baseline_forms")
      .select("general_info, vitals, lifestyle, conditions")
      .eq("patient_user_id", patient_user_id)
      .maybeSingle()

    const { data: responses } = await supabase
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

    const responsesSummary =
      responses
        ?.map((r: any) => `• ${r.specialist_questions?.prompt ?? "Pregunta"} → ${JSON.stringify(r.answer)}`)
        .join("\n") ?? ""

    const summary = [
      "Resumen automático del pasante virtual:",
      `- Formularios base: ${baseline ? "completo" : "no disponible"}`,
      `- Respuestas especialidad: ${responses?.length ?? 0}`,
      responsesSummary ? `- Detalle respuestas:\n${responsesSummary}` : null,
      `- Estudios cargados: ${labs?.length ?? 0}`,
      `- Pruebas solicitadas: ${JSON.stringify(parsedTests.tests)}`,
      parsedTests.lab_provider ? `- Laboratorio elegido: ${parsedTests.lab_provider}` : null,
    ]
      .filter(Boolean)
      .join("\n")

    const { data: run, error: runError } = await supabase
      .from("virtual_intern_runs")
      .insert({
        doctor_id: doctorId,
        patient_user_id,
        patient_id: order.patient_id,
        lab_order_id,
        specialty_id: specialty_id ?? order.specialty_id,
        status: "succeeded",
        summary,
        suggestions: ["Revisa resultados y confirma plan", "Considera seguimiento presencial si aplica"],
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
