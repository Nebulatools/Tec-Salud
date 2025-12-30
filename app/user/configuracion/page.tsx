"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Settings,
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  Clock,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NotificationPreferences {
  // Email preferences
  email_appointment_reminders: boolean
  email_appointment_confirmations: boolean
  email_prescription_ready: boolean
  email_lab_results: boolean
  email_rating_requests: boolean
  email_marketing: boolean
  // Push preferences
  push_enabled: boolean
  push_appointment_reminders: boolean
  push_appointment_confirmations: boolean
  // SMS preferences
  sms_enabled: boolean
  sms_appointment_reminders: boolean
  // Reminder timing
  reminder_24h: boolean
  reminder_1h: boolean
}

const defaultPreferences: NotificationPreferences = {
  email_appointment_reminders: true,
  email_appointment_confirmations: true,
  email_prescription_ready: true,
  email_lab_results: true,
  email_rating_requests: true,
  email_marketing: false,
  push_enabled: true,
  push_appointment_reminders: true,
  push_appointment_confirmations: true,
  sms_enabled: false,
  sms_appointment_reminders: false,
  reminder_24h: true,
  reminder_1h: true,
}

export default function ConfiguracionPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences)

  useEffect(() => {
    async function loadPreferences() {
      if (!user) return

      try {
        const { data, error: fetchError } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()

        if (fetchError) throw fetchError

        if (data) {
          setPreferences({
            email_appointment_reminders: data.email_appointment_reminders ?? true,
            email_appointment_confirmations: data.email_appointment_confirmations ?? true,
            email_prescription_ready: data.email_prescription_ready ?? true,
            email_lab_results: data.email_lab_results ?? true,
            email_rating_requests: data.email_rating_requests ?? true,
            email_marketing: data.email_marketing ?? false,
            push_enabled: data.push_enabled ?? true,
            push_appointment_reminders: data.push_appointment_reminders ?? true,
            push_appointment_confirmations: data.push_appointment_confirmations ?? true,
            sms_enabled: data.sms_enabled ?? false,
            sms_appointment_reminders: data.sms_appointment_reminders ?? false,
            reminder_24h: data.reminder_24h ?? true,
            reminder_1h: data.reminder_1h ?? true,
          })
        }
      } catch (err) {
        console.error("Error loading preferences:", err)
      } finally {
        setLoading(false)
      }
    }

    loadPreferences()
  }, [user])

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { error: upsertError } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            user_id: user.id,
            ...preferences,
          },
          { onConflict: "user_id" }
        )

      if (upsertError) throw upsertError

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      const e = err as { message?: string }
      console.error("Error saving preferences:", e.message || err)
      setError("Error al guardar las preferencias. Intenta de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-zuli-veronica/20 border-t-zuli-veronica mx-auto" />
          <p className="text-gray-500 mt-3">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="h-6 w-6 text-zuli-veronica" />
          Configuración
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Personaliza tus preferencias de notificaciones y comunicación
        </p>
      </div>

      {/* Email Notifications */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Notificaciones por Email</CardTitle>
              <CardDescription>
                Configura qué emails deseas recibir
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <PreferenceRow
            label="Recordatorios de citas"
            description="Recibe recordatorios antes de tus citas"
            checked={preferences.email_appointment_reminders}
            onChange={(val) => updatePreference("email_appointment_reminders", val)}
          />
          <Separator />
          <PreferenceRow
            label="Confirmaciones de citas"
            description="Recibe confirmación cuando agendes una cita"
            checked={preferences.email_appointment_confirmations}
            onChange={(val) => updatePreference("email_appointment_confirmations", val)}
          />
          <Separator />
          <PreferenceRow
            label="Recetas listas"
            description="Recibe aviso cuando tengas una nueva receta"
            checked={preferences.email_prescription_ready}
            onChange={(val) => updatePreference("email_prescription_ready", val)}
          />
          <Separator />
          <PreferenceRow
            label="Resultados de laboratorio"
            description="Recibe aviso cuando tus resultados estén listos"
            checked={preferences.email_lab_results}
            onChange={(val) => updatePreference("email_lab_results", val)}
          />
          <Separator />
          <PreferenceRow
            label="Solicitudes de calificación"
            description="Recibe invitación para calificar tus consultas"
            checked={preferences.email_rating_requests}
            onChange={(val) => updatePreference("email_rating_requests", val)}
          />
          <Separator />
          <PreferenceRow
            label="Comunicaciones de marketing"
            description="Recibe novedades y promociones de ZULI"
            checked={preferences.email_marketing}
            onChange={(val) => updatePreference("email_marketing", val)}
          />
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Smartphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Notificaciones Push</CardTitle>
              <CardDescription>
                Configura las notificaciones en tu dispositivo
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <PreferenceRow
            label="Habilitar notificaciones push"
            description="Recibe notificaciones en tu dispositivo"
            checked={preferences.push_enabled}
            onChange={(val) => updatePreference("push_enabled", val)}
            highlight
          />
          {preferences.push_enabled && (
            <>
              <Separator />
              <PreferenceRow
                label="Recordatorios de citas"
                description="Recordatorios push antes de tus citas"
                checked={preferences.push_appointment_reminders}
                onChange={(val) => updatePreference("push_appointment_reminders", val)}
              />
              <Separator />
              <PreferenceRow
                label="Confirmaciones de citas"
                description="Confirmación push al agendar"
                checked={preferences.push_appointment_confirmations}
                onChange={(val) => updatePreference("push_appointment_confirmations", val)}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* SMS Notifications */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Notificaciones SMS</CardTitle>
              <CardDescription>
                Configura las notificaciones por mensaje de texto
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <PreferenceRow
            label="Habilitar SMS"
            description="Recibe notificaciones por mensaje de texto"
            checked={preferences.sms_enabled}
            onChange={(val) => updatePreference("sms_enabled", val)}
            highlight
          />
          {preferences.sms_enabled && (
            <>
              <Separator />
              <PreferenceRow
                label="Recordatorios de citas por SMS"
                description="Recordatorios SMS antes de tus citas"
                checked={preferences.sms_appointment_reminders}
                onChange={(val) => updatePreference("sms_appointment_reminders", val)}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Reminder Timing */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Tiempo de Recordatorios</CardTitle>
              <CardDescription>
                Elige cuándo recibir recordatorios antes de tus citas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <PreferenceRow
            label="24 horas antes"
            description="Recibe recordatorio un día antes de tu cita"
            checked={preferences.reminder_24h}
            onChange={(val) => updatePreference("reminder_24h", val)}
          />
          <Separator />
          <PreferenceRow
            label="1 hora antes"
            description="Recibe recordatorio una hora antes de tu cita"
            checked={preferences.reminder_1h}
            onChange={(val) => updatePreference("reminder_1h", val)}
          />
        </CardContent>
      </Card>

      {/* Status messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>Preferencias guardadas correctamente</AlertDescription>
        </Alert>
      )}

      {/* Save button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full btn-zuli-gradient"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Guardar Preferencias
          </>
        )}
      </Button>
    </div>
  )
}

// Preference row component
function PreferenceRow({
  label,
  description,
  checked,
  onChange,
  highlight = false,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-2",
        highlight && "p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg -mx-3"
      )}
    >
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="shrink-0"
      />
    </div>
  )
}
