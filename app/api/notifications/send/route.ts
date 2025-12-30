import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  sendAppointmentReminder,
  sendAppointmentConfirmation,
  sendPrescriptionReady,
  type AppointmentReminderData,
  type AppointmentConfirmationData,
  type PrescriptionReadyData,
} from "@/lib/email/resend"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// Use service role for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type NotificationType =
  | "appointment_reminder"
  | "appointment_confirmation"
  | "appointment_cancelled"
  | "prescription_ready"
  | "lab_results_ready"
  | "rating_request"
  | "system_alert"

interface SendNotificationRequest {
  type: NotificationType
  userId?: string
  userEmail?: string // Direct email if known (from auth session)
  patientId?: string
  appointmentId?: string
  prescriptionId?: string
  metadata?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const body: SendNotificationRequest = await request.json()
    const { type, userId, userEmail, patientId, appointmentId, prescriptionId, metadata } = body

    if (!type) {
      return NextResponse.json({ error: "type is required" }, { status: 400 })
    }

    // Get recipient email
    let recipientEmail: string | null = null
    let recipientName: string = ""
    let doctorId: string | null = null

    // Use direct email if provided (from auth session)
    if (userEmail) {
      recipientEmail = userEmail
    }

    // Try to get email and name from app_users if we have userId
    if (userId) {
      const { data: userData } = await supabase
        .from("app_users")
        .select("email, first_name, last_name")
        .eq("id", userId)
        .single()

      if (userData?.email) {
        recipientEmail = recipientEmail || userData.email
        recipientName = `${userData.first_name || ""} ${userData.last_name || ""}`.trim()
      }

      // Also try patient_baseline_forms for the name if not found
      if (!recipientName) {
        const { data: baselineForm } = await supabase
          .from("patient_baseline_forms")
          .select("general_info")
          .eq("patient_user_id", userId)
          .single()

        if (baselineForm?.general_info) {
          const gi = baselineForm.general_info as { first_name?: string; last_name?: string }
          recipientName = `${gi.first_name || ""} ${gi.last_name || ""}`.trim()
        }
      }
    }

    if (!recipientEmail && patientId) {
      const { data: patientData } = await supabase
        .from("patients")
        .select("email, first_name, last_name, doctor_id")
        .eq("id", patientId)
        .single()

      if (patientData?.email) {
        recipientEmail = patientData.email
        recipientName = `${patientData.first_name || ""} ${patientData.last_name || ""}`.trim()
        doctorId = patientData.doctor_id
      }
    }

    if (!recipientEmail) {
      return NextResponse.json(
        { error: "No email address found for recipient" },
        { status: 400 }
      )
    }

    // Check user notification preferences before sending email
    if (userId) {
      const preferenceField = getPreferenceFieldForType(type)
      if (preferenceField) {
        const { data: preferences } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", userId)
          .single()

        // If preferences exist and the specific notification type is disabled, skip sending
        if (preferences) {
          const prefRecord = preferences as Record<string, unknown>
          if (prefRecord[preferenceField] === false) {
            return NextResponse.json({
              success: true,
              skipped: true,
              reason: "User has disabled this notification type",
              notificationId: null,
              emailId: null,
            })
          }
        }
      }
    }

    // Create notification record
    const { data: notification, error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: userId || null,
        patient_id: patientId || null,
        doctor_id: doctorId,
        type,
        channel: "email",
        status: "pending",
        title: getNotificationTitle(type),
        body: getNotificationBody(type, recipientName),
        appointment_id: appointmentId || null,
        prescription_id: prescriptionId || null,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (notificationError) {
      console.error("Error creating notification:", notificationError)
      return NextResponse.json(
        { error: "Failed to create notification record" },
        { status: 500 }
      )
    }

    // Send the email based on type
    let emailResult

    switch (type) {
      case "appointment_reminder":
      case "appointment_confirmation": {
        if (!appointmentId) {
          return NextResponse.json(
            { error: "appointmentId is required for appointment notifications" },
            { status: 400 }
          )
        }

        // Fetch appointment details
        const { data: appointment } = await supabase
          .from("appointments")
          .select(`
            id,
            appointment_date,
            start_time,
            doctors:doctor_id (
              first_name,
              last_name,
              specialty
            )
          `)
          .eq("id", appointmentId)
          .single()

        if (!appointment) {
          return NextResponse.json(
            { error: "Appointment not found" },
            { status: 404 }
          )
        }

        const doctor = appointment.doctors as unknown as {
          first_name: string
          last_name: string
          specialty: string | null
        }

        const appointmentData: AppointmentReminderData & AppointmentConfirmationData = {
          patientName: recipientName || "Paciente",
          doctorName: `${doctor.first_name} ${doctor.last_name}`,
          specialty: doctor.specialty || undefined,
          date: format(new Date(appointment.appointment_date), "EEEE d 'de' MMMM, yyyy", { locale: es }),
          time: appointment.start_time?.substring(0, 5) || "",
          appointmentId,
        }

        if (type === "appointment_reminder") {
          emailResult = await sendAppointmentReminder(recipientEmail, appointmentData)
        } else {
          emailResult = await sendAppointmentConfirmation(recipientEmail, appointmentData)
        }
        break
      }

      case "prescription_ready": {
        if (!prescriptionId) {
          return NextResponse.json(
            { error: "prescriptionId is required for prescription notifications" },
            { status: 400 }
          )
        }

        // Fetch prescription details
        const { data: prescription } = await supabase
          .from("prescriptions")
          .select(`
            id,
            medications,
            doctors:doctor_id (
              first_name,
              last_name
            )
          `)
          .eq("id", prescriptionId)
          .single()

        if (!prescription) {
          return NextResponse.json(
            { error: "Prescription not found" },
            { status: 404 }
          )
        }

        const prescriptionDoctor = prescription.doctors as unknown as {
          first_name: string
          last_name: string
        }
        const medications = (prescription.medications as Array<unknown>) || []

        const prescriptionData: PrescriptionReadyData = {
          patientName: recipientName || "Paciente",
          doctorName: `${prescriptionDoctor.first_name} ${prescriptionDoctor.last_name}`,
          prescriptionId,
          medicationCount: medications.length,
        }

        emailResult = await sendPrescriptionReady(recipientEmail, prescriptionData)
        break
      }

      default:
        // For other types, skip email for now
        emailResult = { success: true, id: null }
    }

    // Update notification status
    const updateData: Record<string, unknown> = {
      status: emailResult.success ? "sent" : "failed",
      sent_at: emailResult.success ? new Date().toISOString() : null,
      error_message: emailResult.error || null,
    }

    await supabase
      .from("notifications")
      .update(updateData)
      .eq("id", notification.id)

    // Log the email
    if (emailResult.id) {
      await supabase.from("email_logs").insert({
        notification_id: notification.id,
        resend_id: emailResult.id,
        to_email: recipientEmail,
        from_email: process.env.RESEND_FROM_EMAIL || "noreply@zulihealth.com",
        subject: getNotificationTitle(type),
        status: emailResult.success ? "sent" : "failed",
        error_message: emailResult.error || null,
      })
    }

    return NextResponse.json({
      success: emailResult.success,
      notificationId: notification.id,
      emailId: emailResult.id,
      error: emailResult.error,
    })
  } catch (error) {
    console.error("Error in notifications API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

function getNotificationTitle(type: NotificationType): string {
  const titles: Record<NotificationType, string> = {
    appointment_reminder: "Recordatorio de Cita",
    appointment_confirmation: "Cita Confirmada",
    appointment_cancelled: "Cita Cancelada",
    prescription_ready: "Nueva Receta Disponible",
    lab_results_ready: "Resultados de Laboratorio Listos",
    rating_request: "Califica tu Consulta",
    system_alert: "Aviso del Sistema",
  }
  return titles[type] || "Notificación"
}

function getNotificationBody(type: NotificationType, name: string): string {
  const bodies: Record<NotificationType, string> = {
    appointment_reminder: `Hola ${name}, te recordamos que tienes una cita programada.`,
    appointment_confirmation: `Hola ${name}, tu cita ha sido confirmada exitosamente.`,
    appointment_cancelled: `Hola ${name}, tu cita ha sido cancelada.`,
    prescription_ready: `Hola ${name}, tienes una nueva receta médica disponible.`,
    lab_results_ready: `Hola ${name}, tus resultados de laboratorio están listos.`,
    rating_request: `Hola ${name}, por favor califica tu última consulta.`,
    system_alert: `Hola ${name}, tienes un nuevo aviso del sistema.`,
  }
  return bodies[type] || "Tienes una nueva notificación."
}

// Map notification types to user preference field names
function getPreferenceFieldForType(type: NotificationType): string | null {
  const mapping: Partial<Record<NotificationType, string>> = {
    appointment_confirmation: "email_appointment_confirmations",
    appointment_reminder: "email_appointment_reminders",
    prescription_ready: "email_prescription_ready",
    lab_results_ready: "email_lab_results",
    rating_request: "email_appointment_reminders", // Use reminder preference for rating requests
  }
  return mapping[type] || null
}
