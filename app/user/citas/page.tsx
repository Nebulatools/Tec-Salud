"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  User,
  MapPin,
  Phone,
  CheckCircle,
  XCircle,
  CalendarCheck,
  CalendarX,
  Video,
} from "lucide-react"
import { format, isPast, isToday, isTomorrow } from "date-fns"
import { es } from "date-fns/locale"

interface Appointment {
  id: string
  scheduled_time: string
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show"
  reason: string | null
  notes: string | null
  is_virtual: boolean
  doctor: {
    id: string
    first_name: string
    last_name: string
    specialty: string | null
    phone: string | null
  }
  medical_unit: {
    id: string
    name: string
    address_line: string | null
    phone: string | null
  } | null
}

const statusConfig = {
  scheduled: {
    label: "Programada",
    icon: Calendar,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    badgeVariant: "default" as const,
  },
  confirmed: {
    label: "Confirmada",
    icon: CalendarCheck,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    badgeVariant: "default" as const,
  },
  completed: {
    label: "Completada",
    icon: CheckCircle,
    color: "text-gray-600",
    bgColor: "bg-gray-50 dark:bg-gray-800",
    badgeVariant: "secondary" as const,
  },
  cancelled: {
    label: "Cancelada",
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    badgeVariant: "destructive" as const,
  },
  no_show: {
    label: "No asistió",
    icon: CalendarX,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    badgeVariant: "outline" as const,
  },
}

export default function PatientCitasPage() {
  const { user, loading: authLoading } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("upcoming")

  useEffect(() => {
    async function fetchAppointments() {
      if (!user) return

      try {
        // First get patient ID linked to this user
        const { data: patient, error: patientError } = await supabase
          .from("patients")
          .select("id")
          .eq("user_id", user.id)
          .single()

        if (patientError || !patient) {
          setError("No se encontró tu perfil de paciente.")
          setLoading(false)
          return
        }

        // Fetch appointments for this patient
        const { data, error: appointmentsError } = await supabase
          .from("appointments")
          .select(`
            id,
            scheduled_time,
            status,
            reason,
            notes,
            is_virtual,
            doctors (
              id,
              first_name,
              last_name,
              specialty,
              phone
            ),
            medical_units (
              id,
              name,
              address_line,
              phone
            )
          `)
          .eq("patient_id", patient.id)
          .order("scheduled_time", { ascending: true })

        if (appointmentsError) throw appointmentsError

        // Transform data
        const transformed = (data || []).map((apt) => ({
          ...apt,
          doctor: apt.doctors,
          medical_unit: apt.medical_units,
        })) as unknown as Appointment[]

        setAppointments(transformed)
      } catch (err) {
        console.error("Error fetching appointments:", err)
        setError("Error al cargar las citas.")
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchAppointments()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [user, authLoading])

  const upcomingAppointments = appointments.filter(
    (apt) =>
      !isPast(new Date(apt.scheduled_time)) &&
      ["scheduled", "confirmed"].includes(apt.status)
  )

  const pastAppointments = appointments.filter(
    (apt) =>
      isPast(new Date(apt.scheduled_time)) ||
      ["completed", "cancelled", "no_show"].includes(apt.status)
  )

  const handleCancel = async (appointmentId: string) => {
    if (!confirm("¿Estás seguro de que deseas cancelar esta cita?")) return

    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentId)

      if (error) throw error

      // Update local state
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId ? { ...apt, status: "cancelled" } : apt
        )
      )
    } catch (err) {
      console.error("Error cancelling appointment:", err)
      alert("Error al cancelar la cita. Intenta de nuevo.")
    }
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded animate-shimmer" />
          <div className="h-4 w-72 rounded animate-shimmer" style={{ animationDelay: "0.1s" }} />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-24 rounded animate-shimmer" style={{ animationDelay: `${i * 0.1}s` }} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-16 animate-fadeIn">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Calendar className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Inicia sesión
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
          Necesitas iniciar sesión para ver tus citas médicas.
        </p>
        <Button onClick={() => (window.location.href = "/login")}>
          Iniciar sesión
        </Button>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 animate-fadeIn">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Error
          </h2>
          <p className="text-red-600 dark:text-red-300">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Hoy"
    if (isTomorrow(date)) return "Mañana"
    return format(date, "EEEE d 'de' MMMM", { locale: es })
  }

  const renderAppointmentCard = (appointment: Appointment) => {
    const status = statusConfig[appointment.status]
    const StatusIcon = status.icon
    const appointmentDate = new Date(appointment.scheduled_time)
    const canCancel =
      ["scheduled", "confirmed"].includes(appointment.status) &&
      !isPast(appointmentDate)

    return (
      <Card key={appointment.id} className="overflow-hidden">
        <CardContent className="p-0">
          {/* Date Header */}
          <div className={`px-4 py-2 ${status.bgColor} border-b`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className={`h-4 w-4 ${status.color}`} />
                <span className="font-medium text-sm capitalize">
                  {getDateLabel(appointmentDate)}
                </span>
              </div>
              <Badge variant={status.badgeVariant}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Time */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-zuli-indigo/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-zuli-indigo" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {format(appointmentDate, "HH:mm")}
                </p>
                <p className="text-sm text-gray-500">
                  {format(appointmentDate, "d 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>
              {appointment.is_virtual && (
                <Badge variant="outline" className="ml-auto">
                  <Video className="h-3 w-3 mr-1" />
                  Virtual
                </Badge>
              )}
            </div>

            {/* Doctor */}
            <div className="flex items-start gap-2 text-sm">
              <User className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}
                </p>
                {appointment.doctor.specialty && (
                  <p className="text-gray-500">{appointment.doctor.specialty}</p>
                )}
              </div>
            </div>

            {/* Location */}
            {appointment.medical_unit && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {appointment.medical_unit.name}
                  </p>
                  {appointment.medical_unit.address_line && (
                    <p className="text-gray-500">
                      {appointment.medical_unit.address_line}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Reason */}
            {appointment.reason && (
              <div className="text-sm bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
                <p className="text-gray-500 text-xs uppercase mb-0.5">Motivo</p>
                <p className="text-gray-700 dark:text-gray-300">
                  {appointment.reason}
                </p>
              </div>
            )}

            {/* Actions */}
            {canCancel && (
              <div className="flex gap-2 pt-2">
                {appointment.doctor.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      (window.location.href = `tel:${appointment.doctor.phone}`)
                    }
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Llamar
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-red-600 hover:bg-red-50"
                  onClick={() => handleCancel(appointment.id)}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Mis Citas
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gestiona tus citas médicas
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming" className="relative">
            Próximas
            {upcomingAppointments.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-zuli-indigo text-white text-xs rounded-full flex items-center justify-center">
                {upcomingAppointments.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 space-y-4">
          {upcomingAppointments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Sin citas próximas
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  No tienes citas programadas. Escanea el código QR de tu doctor
                  para agendar una cita.
                </p>
              </CardContent>
            </Card>
          ) : (
            upcomingAppointments.map(renderAppointmentCard)
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4 space-y-4">
          {pastAppointments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Sin historial
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  Tu historial de citas aparecerá aquí.
                </p>
              </CardContent>
            </Card>
          ) : (
            pastAppointments.map(renderAppointmentCard)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
