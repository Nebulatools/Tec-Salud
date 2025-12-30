import { Resend } from "resend"

// Lazy-initialize Resend client to avoid build-time errors when API key is not set
let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY environment variable is not set")
    }
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

// Default sender - should be a verified domain in Resend
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || "ZULI Health <noreply@zulihealth.com>"

export interface EmailResult {
  success: boolean
  id?: string
  error?: string
}

export interface AppointmentReminderData {
  patientName: string
  doctorName: string
  specialty?: string
  date: string // formatted date string
  time: string
  location?: string
  appointmentId: string
}

export interface AppointmentConfirmationData {
  patientName: string
  doctorName: string
  specialty?: string
  date: string
  time: string
  location?: string
  appointmentId: string
}

export interface PrescriptionReadyData {
  patientName: string
  doctorName: string
  prescriptionId: string
  medicationCount: number
}

/**
 * Send an appointment reminder email
 */
export async function sendAppointmentReminder(
  to: string,
  data: AppointmentReminderData
): Promise<EmailResult> {
  try {
    const { data: result, error } = await getResend().emails.send({
      from: DEFAULT_FROM,
      to: [to],
      subject: `Recordatorio: Cita con Dr. ${data.doctorName} - ${data.date}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #7C3AED; margin: 0; font-size: 24px;">ZULI Health</h1>
            </div>

            <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">Recordatorio de Cita</h2>

            <p style="color: #4b5563; margin: 0 0 24px 0; font-size: 16px;">
              Hola <strong>${data.patientName}</strong>, te recordamos que tienes una cita programada:
            </p>

            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Doctor:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">Dr. ${data.doctorName}</td>
                </tr>
                ${data.specialty ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Especialidad:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.specialty}</td>
                </tr>
                ` : ""}
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Fecha:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${data.date}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Hora:</td>
                  <td style="padding: 8px 0; color: #7C3AED; font-size: 18px; font-weight: 700;">${data.time}</td>
                </tr>
                ${data.location ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Ubicación:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.location}</td>
                </tr>
                ` : ""}
              </table>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
              Por favor llega 10 minutos antes de tu cita. Si necesitas cancelar o reprogramar,
              hazlo con al menos 24 horas de anticipación.
            </p>

            <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ZULI Health - Tu salud, nuestra prioridad
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return { success: false, error: message }
  }
}

/**
 * Send an appointment confirmation email
 */
export async function sendAppointmentConfirmation(
  to: string,
  data: AppointmentConfirmationData
): Promise<EmailResult> {
  try {
    const { data: result, error } = await getResend().emails.send({
      from: DEFAULT_FROM,
      to: [to],
      subject: `Cita Confirmada con Dr. ${data.doctorName} - ${data.date}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #7C3AED; margin: 0; font-size: 24px;">ZULI Health</h1>
            </div>

            <div style="text-align: center; margin-bottom: 24px;">
              <div style="width: 64px; height: 64px; background-color: #10b981; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 32px;">✓</span>
              </div>
            </div>

            <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">¡Cita Confirmada!</h2>

            <p style="color: #4b5563; margin: 0 0 24px 0; font-size: 16px; text-align: center;">
              Hola <strong>${data.patientName}</strong>, tu cita ha sido agendada exitosamente.
            </p>

            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Doctor:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">Dr. ${data.doctorName}</td>
                </tr>
                ${data.specialty ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Especialidad:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.specialty}</td>
                </tr>
                ` : ""}
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Fecha:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${data.date}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Hora:</td>
                  <td style="padding: 8px 0; color: #7C3AED; font-size: 18px; font-weight: 700;">${data.time}</td>
                </tr>
                ${data.location ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Ubicación:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.location}</td>
                </tr>
                ` : ""}
              </table>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
              Te enviaremos un recordatorio 24 horas y 1 hora antes de tu cita.
            </p>

            <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ZULI Health - Tu salud, nuestra prioridad
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return { success: false, error: message }
  }
}

/**
 * Send a prescription ready notification
 */
export async function sendPrescriptionReady(
  to: string,
  data: PrescriptionReadyData
): Promise<EmailResult> {
  try {
    const { data: result, error } = await getResend().emails.send({
      from: DEFAULT_FROM,
      to: [to],
      subject: `Nueva Receta Disponible - Dr. ${data.doctorName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #7C3AED; margin: 0; font-size: 24px;">ZULI Health</h1>
            </div>

            <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">Receta Médica Disponible</h2>

            <p style="color: #4b5563; margin: 0 0 24px 0; font-size: 16px;">
              Hola <strong>${data.patientName}</strong>, el Dr. ${data.doctorName} te ha emitido una nueva receta médica.
            </p>

            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">Medicamentos prescritos</p>
              <p style="color: #7C3AED; font-size: 32px; font-weight: 700; margin: 0;">${data.medicationCount}</p>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
              Puedes ver y descargar tu receta ingresando a tu portal de paciente en ZULI Health.
            </p>

            <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ZULI Health - Tu salud, nuestra prioridad
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return { success: false, error: message }
  }
}

/**
 * Send a generic email
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string
): Promise<EmailResult> {
  try {
    const { data: result, error } = await getResend().emails.send({
      from: DEFAULT_FROM,
      to: [to],
      subject,
      html: htmlContent,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return { success: false, error: message }
  }
}

export { getResend as resend }
