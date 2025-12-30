import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { format, addHours, addMinutes, subMinutes } from "date-fns"
import { es } from "date-fns/locale"
import { sendAppointmentReminder, type AppointmentReminderData } from "@/lib/email/resend"

// Use service role for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET

interface AppointmentWithDetails {
  id: string
  appointment_date: string
  start_time: string
  status: string
  patient_id: string
  doctor_id: string
  patients: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    user_id: string | null
  }
  doctors: {
    id: string
    first_name: string
    last_name: string
    specialty: string | null
  }
}

interface NotificationPrefs {
  email_appointment_reminders: boolean
  push_enabled: boolean
  push_appointment_reminders: boolean
  sms_enabled: boolean
  sms_appointment_reminders: boolean
  reminder_24h: boolean
  reminder_1h: boolean
}

const defaultPrefs: NotificationPrefs = {
  email_appointment_reminders: true,
  push_enabled: true,
  push_appointment_reminders: true,
  sms_enabled: false,
  sms_appointment_reminders: false,
  reminder_24h: true,
  reminder_1h: true,
}

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization")
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const results = {
    processed: 0,
    sent24h: 0,
    sent1h: 0,
    skipped: 0,
    errors: [] as string[],
  }

  try {
    // Find appointments for 24h reminder (23-25 hours from now)
    const reminder24hStart = addHours(now, 23)
    const reminder24hEnd = addHours(now, 25)

    // Find appointments for 1h reminder (55-65 minutes from now)
    const reminder1hStart = addMinutes(now, 55)
    const reminder1hEnd = addMinutes(now, 65)

    // Get appointments needing 24h reminders
    const { data: appointments24h, error: error24h } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        start_time,
        status,
        patient_id,
        doctor_id,
        patients!inner (
          id,
          first_name,
          last_name,
          email,
          user_id
        ),
        doctors!inner (
          id,
          first_name,
          last_name,
          specialty
        )
      `)
      .in("status", ["scheduled", "confirmed"])
      .gte("appointment_date", reminder24hStart.toISOString().split("T")[0])
      .lte("appointment_date", reminder24hEnd.toISOString().split("T")[0])

    if (error24h) {
      console.error("Error fetching 24h appointments:", error24h)
      results.errors.push(`24h fetch error: ${error24h.message}`)
    }

    // Get appointments needing 1h reminders
    const { data: appointments1h, error: error1h } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        start_time,
        status,
        patient_id,
        doctor_id,
        patients!inner (
          id,
          first_name,
          last_name,
          email,
          user_id
        ),
        doctors!inner (
          id,
          first_name,
          last_name,
          specialty
        )
      `)
      .in("status", ["scheduled", "confirmed"])
      .gte("appointment_date", reminder1hStart.toISOString().split("T")[0])
      .lte("appointment_date", reminder1hEnd.toISOString().split("T")[0])

    if (error1h) {
      console.error("Error fetching 1h appointments:", error1h)
      results.errors.push(`1h fetch error: ${error1h.message}`)
    }

    // Process 24h reminders
    for (const apt of (appointments24h as unknown as AppointmentWithDetails[]) || []) {
      results.processed++

      // Check if this exact reminder was already sent
      const reminderKey = `24h_${apt.id}`
      const { data: existingNotification } = await supabase
        .from("notifications")
        .select("id")
        .eq("appointment_id", apt.id)
        .eq("type", "appointment_reminder")
        .contains("metadata", { reminder_type: "24h" })
        .single()

      if (existingNotification) {
        results.skipped++
        continue
      }

      // Get user preferences
      const prefs = await getUserPreferences(apt.patients.user_id)

      if (!prefs.reminder_24h || !prefs.email_appointment_reminders) {
        results.skipped++
        continue
      }

      // Calculate if appointment is actually in 24h window
      const appointmentDateTime = combineDateTime(apt.appointment_date, apt.start_time)
      const hoursUntil = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

      if (hoursUntil < 23 || hoursUntil > 25) {
        results.skipped++
        continue
      }

      // Send the reminder
      const sent = await sendReminder(apt, "24h", prefs)
      if (sent) {
        results.sent24h++
      } else {
        results.errors.push(`Failed to send 24h reminder for appointment ${apt.id}`)
      }
    }

    // Process 1h reminders
    for (const apt of (appointments1h as unknown as AppointmentWithDetails[]) || []) {
      results.processed++

      // Check if this exact reminder was already sent
      const { data: existingNotification } = await supabase
        .from("notifications")
        .select("id")
        .eq("appointment_id", apt.id)
        .eq("type", "appointment_reminder")
        .contains("metadata", { reminder_type: "1h" })
        .single()

      if (existingNotification) {
        results.skipped++
        continue
      }

      // Get user preferences
      const prefs = await getUserPreferences(apt.patients.user_id)

      if (!prefs.reminder_1h || !prefs.email_appointment_reminders) {
        results.skipped++
        continue
      }

      // Calculate if appointment is actually in 1h window
      const appointmentDateTime = combineDateTime(apt.appointment_date, apt.start_time)
      const minutesUntil = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60)

      if (minutesUntil < 55 || minutesUntil > 65) {
        results.skipped++
        continue
      }

      // Send the reminder
      const sent = await sendReminder(apt, "1h", prefs)
      if (sent) {
        results.sent1h++
      } else {
        results.errors.push(`Failed to send 1h reminder for appointment ${apt.id}`)
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    })
  } catch (error) {
    console.error("Error in appointment reminders cron:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        results,
      },
      { status: 500 }
    )
  }
}

async function getUserPreferences(userId: string | null): Promise<NotificationPrefs> {
  if (!userId) return defaultPrefs

  const { data } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (!data) return defaultPrefs

  return {
    email_appointment_reminders: data.email_appointment_reminders ?? true,
    push_enabled: data.push_enabled ?? true,
    push_appointment_reminders: data.push_appointment_reminders ?? true,
    sms_enabled: data.sms_enabled ?? false,
    sms_appointment_reminders: data.sms_appointment_reminders ?? false,
    reminder_24h: data.reminder_24h ?? true,
    reminder_1h: data.reminder_1h ?? true,
  }
}

function combineDateTime(dateStr: string, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number)
  const date = new Date(dateStr)
  date.setHours(hours, minutes, 0, 0)
  return date
}

async function sendReminder(
  appointment: AppointmentWithDetails,
  reminderType: "24h" | "1h",
  prefs: NotificationPrefs
): Promise<boolean> {
  const patient = appointment.patients
  const doctor = appointment.doctors

  if (!patient.email) {
    console.warn(`No email for patient ${patient.id}`)
    return false
  }

  const patientName = `${patient.first_name || ""} ${patient.last_name || ""}`.trim() || "Paciente"
  const doctorName = `${doctor.first_name} ${doctor.last_name}`

  const appointmentDate = new Date(appointment.appointment_date)
  const formattedDate = format(appointmentDate, "EEEE d 'de' MMMM, yyyy", { locale: es })
  const formattedTime = appointment.start_time.substring(0, 5)

  // Create notification record first
  const { data: notification, error: notifError } = await supabase
    .from("notifications")
    .insert({
      user_id: patient.user_id,
      patient_id: patient.id,
      doctor_id: doctor.id,
      type: "appointment_reminder",
      channel: "email",
      status: "pending",
      title: reminderType === "24h" ? "Recordatorio: Cita mañana" : "Recordatorio: Cita en 1 hora",
      body: `Tu cita con Dr. ${doctorName} es ${reminderType === "24h" ? "mañana" : "en 1 hora"} a las ${formattedTime}`,
      appointment_id: appointment.id,
      metadata: {
        reminder_type: reminderType,
        sent_at: new Date().toISOString(),
      },
    })
    .select()
    .single()

  if (notifError) {
    console.error("Error creating notification:", notifError)
    return false
  }

  // Send email if enabled
  if (prefs.email_appointment_reminders) {
    const emailData: AppointmentReminderData = {
      patientName,
      doctorName,
      specialty: doctor.specialty || undefined,
      date: formattedDate,
      time: formattedTime,
      appointmentId: appointment.id,
    }

    const result = await sendAppointmentReminder(patient.email, emailData)

    // Update notification status
    await supabase
      .from("notifications")
      .update({
        status: result.success ? "sent" : "failed",
        sent_at: result.success ? new Date().toISOString() : null,
        error_message: result.error || null,
      })
      .eq("id", notification.id)

    // Log the email
    if (result.id) {
      await supabase.from("email_logs").insert({
        notification_id: notification.id,
        resend_id: result.id,
        to_email: patient.email,
        from_email: process.env.RESEND_FROM_EMAIL || "noreply@zulihealth.com",
        subject: `Recordatorio: Cita con Dr. ${doctorName}`,
        status: result.success ? "sent" : "failed",
        error_message: result.error || null,
      })
    }

    return result.success
  }

  return true
}
