import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { patientUserId, doctorId, specialistResponses } = body

    if (!patientUserId || !doctorId) {
      return NextResponse.json(
        { error: "patientUserId y doctorId son requeridos" },
        { status: 400 }
      )
    }

    // 1. Verificar si ya existe una vinculación
    const { data: existingLink } = await supabaseAdmin
      .from("doctor_patient_links")
      .select("id, status")
      .eq("doctor_id", doctorId)
      .eq("patient_user_id", patientUserId)
      .maybeSingle()

    let linkId: string

    if (existingLink) {
      // Si existe pero está revocado o rechazado, actualizarlo a pending
      if (existingLink.status === "revoked" || existingLink.status === "rejected") {
        await supabaseAdmin
          .from("doctor_patient_links")
          .update({ status: "pending", requested_by: "patient" })
          .eq("id", existingLink.id)
      }
      linkId = existingLink.id
    } else {
      // 2. Crear nueva vinculación doctor-paciente
      const { data: newLink, error: linkError } = await supabaseAdmin
        .from("doctor_patient_links")
        .insert({
          doctor_id: doctorId,
          patient_user_id: patientUserId,
          status: "pending",
          requested_by: "patient",
        })
        .select("id")
        .single()

      if (linkError) {
        console.error("Error creating link:", linkError)
        return NextResponse.json(
          { error: "Error al crear vinculación con el especialista" },
          { status: 500 }
        )
      }
      linkId = newLink.id
    }

    // 3. Guardar respuestas del cuestionario si existen
    if (specialistResponses && Object.keys(specialistResponses).length > 0) {
      // Obtener IDs de preguntas para este doctor
      const { data: questions } = await supabaseAdmin
        .from("specialist_questions")
        .select("id")
        .eq("doctor_id", doctorId)

      if (questions) {
        const questionIds = questions.map((q) => q.id)

        // Insertar respuestas
        for (const [questionId, answer] of Object.entries(specialistResponses)) {
          if (questionIds.includes(questionId)) {
            await supabaseAdmin.from("specialist_responses").upsert({
              question_id: questionId,
              patient_user_id: patientUserId,
              answer,
            })
          }
        }
      }
    }

    // 4. Crear un registro de cita pendiente (opcional - para tracking)
    // Nota: La tabla appointments requiere appointment_date, start_time, end_time
    // Por ahora solo creamos la vinculación - el doctor asignará la cita después
    // Si quisieras crear una cita placeholder:
    // const { data: appointment } = await supabaseAdmin.from("appointments").insert({
    //   doctor_id: doctorId,
    //   patient_user_id: patientUserId,
    //   appointment_date: new Date().toISOString().split('T')[0],
    //   start_time: '09:00',
    //   end_time: '09:30',
    //   status: "Programada",
    //   notes: "Cita solicitada desde marketplace - pendiente confirmar horario",
    // }).select("id").single()
    // Por ahora no creamos cita, solo la vinculación
    // El doctor asignará la cita después desde su dashboard

    return NextResponse.json({
      success: true,
      linkId,
      appointmentId: null,
      message: "Solicitud enviada. El especialista confirmará la fecha de tu cita.",
    })
  } catch (error) {
    console.error("Book appointment error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
