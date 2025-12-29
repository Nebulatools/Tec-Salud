"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  User,
  CheckCircle,
  XCircle,
  CalendarX,
  Plus,
  UserPlus,
  Link2,
  Stethoscope,
} from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, isPast, isToday, isTomorrow, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface Appointment {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: "Programada" | "Completada" | "Cancelada" | "No asistió"
  notes: string | null
  doctor: {
    id: string
    first_name: string
    last_name: string
    specialty: string | null
  }
}

interface LinkedDoctor {
  id: string
  first_name: string
  last_name: string
  specialty: string | null
  email: string | null
}

interface DoctorPatientLink {
  id: string
  status: "pending" | "accepted" | "rejected" | "revoked"
  doctor: LinkedDoctor
}

const statusConfig = {
  "Programada": {
    label: "Programada",
    icon: Calendar,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    badgeVariant: "default" as const,
  },
  "Completada": {
    label: "Completada",
    icon: CheckCircle,
    color: "text-gray-600",
    bgColor: "bg-gray-50 dark:bg-gray-800",
    badgeVariant: "secondary" as const,
  },
  "Cancelada": {
    label: "Cancelada",
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    badgeVariant: "destructive" as const,
  },
  "No asistió": {
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
  const [linkedDoctors, setLinkedDoctors] = useState<DoctorPatientLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("upcoming")

  // New appointment dialog state
  const [showNewAppointmentDialog, setShowNewAppointmentDialog] = useState(false)
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [appointmentNotes, setAppointmentNotes] = useState("")
  const [creatingAppointment, setCreatingAppointment] = useState(false)

  // Link doctor dialog state
  const [showLinkDoctorDialog, setShowLinkDoctorDialog] = useState(false)
  const [linkCode, setLinkCode] = useState("")
  const [linkingDoctor, setLinkingDoctor] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  // Patient ID state
  const [patientId, setPatientId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      if (!user) return

      try {
        // First get patient ID linked to this user
        const { data: patient, error: patientError } = await supabase
          .from("patients")
          .select("id")
          .eq("user_id", user.id)
          .single()

        if (patientError || !patient) {
          // No patient profile yet - that's ok, they can still link to a doctor
          setLoading(false)
          return
        }

        setPatientId(patient.id)

        // Fetch linked doctors
        const { data: links, error: linksError } = await supabase
          .from("doctor_patient_links")
          .select(`
            id,
            status,
            doctors (
              id,
              first_name,
              last_name,
              specialty,
              email
            )
          `)
          .eq("patient_user_id", user.id)
          .in("status", ["accepted", "pending"])

        if (!linksError && links) {
          const transformedLinks = links.map((link) => ({
            id: link.id,
            status: link.status as DoctorPatientLink["status"],
            doctor: link.doctors as unknown as LinkedDoctor,
          }))
          setLinkedDoctors(transformedLinks)
        }

        // Fetch appointments for this patient
        const { data, error: appointmentsError } = await supabase
          .from("appointments")
          .select(`
            id,
            appointment_date,
            start_time,
            end_time,
            status,
            notes,
            doctors (
              id,
              first_name,
              last_name,
              specialty
            )
          `)
          .eq("patient_id", patient.id)
          .order("appointment_date", { ascending: true })

        if (appointmentsError) {
          console.error("Error fetching appointments:", appointmentsError.message, appointmentsError.details, appointmentsError.hint)
          throw appointmentsError
        }

        // Transform data
        const transformed = (data || []).map((apt) => ({
          ...apt,
          doctor: apt.doctors,
        })) as unknown as Appointment[]

        setAppointments(transformed)
      } catch (err: unknown) {
        const error = err as { message?: string; details?: string; hint?: string }
        console.error("Error fetching data:", error.message || err, error.details, error.hint)
        setError("Error al cargar los datos.")
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchData()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [user, authLoading])

  // Handle linking to a doctor via code
  const handleLinkDoctor = async () => {
    if (!linkCode.trim() || !user) return

    setLinkingDoctor(true)
    setLinkError(null)

    try {
      // Find the QR link by short_code
      const { data: qrLink, error: qrError } = await supabase
        .from("qr_links")
        .select("id, doctor_id, expires_at")
        .eq("short_code", linkCode.trim().toUpperCase())
        .single()

      if (qrError || !qrLink) {
        setLinkError("Código no válido. Verifica el código e intenta de nuevo.")
        return
      }

      // Check if expired
      if (qrLink.expires_at && new Date(qrLink.expires_at) < new Date()) {
        setLinkError("Este código ha expirado. Pide un nuevo código a tu doctor.")
        return
      }

      // Check if already linked
      const { data: existingLink } = await supabase
        .from("doctor_patient_links")
        .select("id, status")
        .eq("doctor_id", qrLink.doctor_id)
        .eq("patient_user_id", user.id)
        .single()

      if (existingLink) {
        if (existingLink.status === "accepted") {
          setLinkError("Ya estás vinculado con este doctor.")
        } else if (existingLink.status === "pending") {
          setLinkError("Ya tienes una solicitud pendiente con este doctor.")
        } else {
          // Re-activate the link
          await supabase
            .from("doctor_patient_links")
            .update({ status: "pending" })
            .eq("id", existingLink.id)

          setShowLinkDoctorDialog(false)
          setLinkCode("")
          // Refresh data
          window.location.reload()
        }
        return
      }

      // Get or create patient record
      let currentPatientId = patientId

      if (!currentPatientId) {
        // Create patient record for this user
        const { data: newPatient, error: patientError } = await supabase
          .from("patients")
          .insert({
            user_id: user.id,
            doctor_id: qrLink.doctor_id,
            first_name: user.user_metadata?.first_name || user.email?.split("@")[0] || "Paciente",
            last_name: user.user_metadata?.last_name || "",
            email: user.email,
          })
          .select("id")
          .single()

        if (patientError) {
          console.error("Error creating patient:", patientError)
          setLinkError("Error al crear tu perfil de paciente.")
          return
        }

        currentPatientId = newPatient.id
        setPatientId(currentPatientId)
      }

      // Create the link
      const { error: linkError } = await supabase
        .from("doctor_patient_links")
        .insert({
          doctor_id: qrLink.doctor_id,
          patient_user_id: user.id,
          patient_id: currentPatientId,
          status: "accepted", // Auto-accept when using code
          requested_by: "patient",
        })

      if (linkError) {
        console.error("Error linking doctor:", linkError)
        setLinkError("Error al vincularte con el doctor.")
        return
      }

      setShowLinkDoctorDialog(false)
      setLinkCode("")
      // Refresh data
      window.location.reload()
    } catch (err) {
      console.error("Error:", err)
      setLinkError("Error inesperado. Intenta de nuevo.")
    } finally {
      setLinkingDoctor(false)
    }
  }

  // Handle creating a new appointment
  const handleCreateAppointment = async () => {
    if (!selectedDoctorId || !selectedDate || !selectedTime || !user) return

    setCreatingAppointment(true)

    try {
      // Find doctor info from linked doctors
      const selectedDoctor = linkedDoctors.find(
        (link) => link.doctor.id === selectedDoctorId
      )?.doctor

      // Get or create patient record for this doctor
      let appointmentPatientId = patientId

      if (!appointmentPatientId) {
        // Create patient record
        const { data: newPatient, error: patientError } = await supabase
          .from("patients")
          .insert({
            user_id: user.id,
            doctor_id: selectedDoctorId,
            first_name: user.user_metadata?.first_name || user.email?.split("@")[0] || "Paciente",
            last_name: user.user_metadata?.last_name || "",
            email: user.email,
          })
          .select("id")
          .single()

        if (patientError) {
          console.error("Error creating patient:", patientError)
          alert("Error al crear el perfil de paciente.")
          return
        }

        appointmentPatientId = newPatient.id
        setPatientId(appointmentPatientId)
      }

      // Calculate end time (30 min after start)
      const [hours, minutes] = selectedTime.split(":").map(Number)
      const endHours = hours + Math.floor((minutes + 30) / 60)
      const endMinutes = (minutes + 30) % 60
      const endTime = `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}:00`

      // Create appointment
      const { data: newAppointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          doctor_id: selectedDoctorId,
          patient_id: appointmentPatientId,
          patient_user_id: user.id,
          appointment_date: format(selectedDate, "yyyy-MM-dd"),
          start_time: `${selectedTime}:00`,
          end_time: endTime,
          status: "Programada",
          notes: appointmentNotes || null,
        })
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          notes
        `)
        .single()

      if (appointmentError) {
        console.error("Error creating appointment:", appointmentError)
        alert("Error al crear la cita.")
        return
      }

      // Add to local state
      if (newAppointment && selectedDoctor) {
        const newApt: Appointment = {
          ...newAppointment,
          status: newAppointment.status as Appointment["status"],
          doctor: selectedDoctor,
        }
        setAppointments((prev) => [...prev, newApt])
      }

      // Reset form
      setShowNewAppointmentDialog(false)
      setSelectedDoctorId("")
      setSelectedDate(undefined)
      setSelectedTime("")
      setAppointmentNotes("")
    } catch (err) {
      console.error("Error:", err)
      alert("Error inesperado al crear la cita.")
    } finally {
      setCreatingAppointment(false)
    }
  }

  // Available time slots
  const timeSlots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
  ]

  // Get accepted doctors only for appointments
  const acceptedDoctors = linkedDoctors.filter((link) => link.status === "accepted")

  // Helper to create Date from appointment_date and start_time
  const getAppointmentDateTime = (apt: Appointment) => {
    return new Date(`${apt.appointment_date}T${apt.start_time}`)
  }

  const upcomingAppointments = appointments.filter(
    (apt) =>
      !isPast(getAppointmentDateTime(apt)) &&
      apt.status === "Programada"
  )

  const pastAppointments = appointments.filter(
    (apt) =>
      isPast(getAppointmentDateTime(apt)) ||
      ["Completada", "Cancelada", "No asistió"].includes(apt.status)
  )

  const handleCancel = async (appointmentId: string) => {
    if (!confirm("¿Estás seguro de que deseas cancelar esta cita?")) return

    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "Cancelada" })
        .eq("id", appointmentId)

      if (error) throw error

      // Update local state
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId ? { ...apt, status: "Cancelada" } : apt
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
          <CalendarIcon className="h-8 w-8 text-gray-400" />
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
    const appointmentDate = getAppointmentDateTime(appointment)
    const canCancel =
      appointment.status === "Programada" &&
      !isPast(appointmentDate)

    return (
      <Card key={appointment.id} className="overflow-hidden">
        <CardContent className="p-0">
          {/* Date Header */}
          <div className={`px-4 py-2 ${status.bgColor} border-b`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className={`h-4 w-4 ${status.color}`} />
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

            {/* Notes */}
            {appointment.notes && (
              <div className="text-sm bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
                <p className="text-gray-500 text-xs uppercase mb-0.5">Notas</p>
                <p className="text-gray-700 dark:text-gray-300">
                  {appointment.notes}
                </p>
              </div>
            )}

            {/* Actions */}
            {canCancel && (
              <div className="flex gap-2 pt-2">
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Mis Citas
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestiona tus citas médicas
          </p>
        </div>
        <div className="flex gap-2">
          {/* Link Doctor Button */}
          <Dialog open={showLinkDoctorDialog} onOpenChange={setShowLinkDoctorDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Link2 className="h-4 w-4 mr-2" />
                Vincular Doctor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Vincular con un Doctor
                </DialogTitle>
                <DialogDescription>
                  Ingresa el código que te proporcionó tu doctor para vincularte y poder agendar citas.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="linkCode">Código del Doctor</Label>
                  <Input
                    id="linkCode"
                    placeholder="Ej: ABC123"
                    value={linkCode}
                    onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                    className="text-center text-lg font-mono tracking-widest"
                    maxLength={10}
                  />
                  <p className="text-xs text-gray-500">
                    Tu doctor puede darte este código desde su panel de administración.
                  </p>
                </div>
                {linkError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {linkError}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowLinkDoctorDialog(false)
                    setLinkCode("")
                    setLinkError(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleLinkDoctor}
                  disabled={!linkCode.trim() || linkingDoctor}
                >
                  {linkingDoctor ? "Vinculando..." : "Vincular"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* New Appointment Button */}
          <Dialog open={showNewAppointmentDialog} onOpenChange={setShowNewAppointmentDialog}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={acceptedDoctors.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Cita
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Agendar Nueva Cita
                </DialogTitle>
                <DialogDescription>
                  Selecciona un doctor, fecha y hora para tu cita.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Doctor Selection */}
                <div className="space-y-2">
                  <Label>Doctor</Label>
                  <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {acceptedDoctors.map((link) => (
                        <SelectItem key={link.doctor.id} value={link.doctor.id}>
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-gray-400" />
                            <span>
                              Dr. {link.doctor.first_name} {link.doctor.last_name}
                            </span>
                            {link.doctor.specialty && (
                              <span className="text-gray-400 text-sm">
                                • {link.doctor.specialty}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Selection */}
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Popover modal={true}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? (
                          format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es })
                        ) : (
                          "Selecciona una fecha"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[100]" align="start" sideOffset={4}>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) =>
                          date < new Date() || date > addDays(new Date(), 60)
                        }
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time Selection */}
                <div className="space-y-2">
                  <Label>Hora</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una hora" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time} hrs
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas (opcional)</Label>
                  <Input
                    id="notes"
                    placeholder="Motivo de la consulta o notas adicionales"
                    value={appointmentNotes}
                    onChange={(e) => setAppointmentNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewAppointmentDialog(false)
                    setSelectedDoctorId("")
                    setSelectedDate(undefined)
                    setSelectedTime("")
                    setAppointmentNotes("")
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateAppointment}
                  disabled={
                    !selectedDoctorId ||
                    !selectedDate ||
                    !selectedTime ||
                    creatingAppointment
                  }
                >
                  {creatingAppointment ? "Creando..." : "Agendar Cita"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Linked Doctors Section */}
      {linkedDoctors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Mis Doctores ({acceptedDoctors.length} vinculado{acceptedDoctors.length !== 1 ? "s" : ""})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {linkedDoctors.map((link) => (
                <div
                  key={link.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                    link.status === "accepted"
                      ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                      : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
                  )}
                >
                  <User className="h-4 w-4" />
                  <span>
                    Dr. {link.doctor.first_name} {link.doctor.last_name}
                  </span>
                  {link.status === "pending" && (
                    <Badge variant="outline" className="text-xs">
                      Pendiente
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            {linkedDoctors.some((link) => link.status === "pending") && (
              <p className="text-xs text-gray-500 mt-2">
                Los doctores pendientes deben aprobar tu solicitud antes de que puedas agendar citas.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* No doctors linked message */}
      {linkedDoctors.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Vincula tu primer doctor
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Para agendar citas, primero necesitas vincularte con un doctor usando el código que te proporcionó.
            </p>
            <Button onClick={() => setShowLinkDoctorDialog(true)}>
              <Link2 className="h-4 w-4 mr-2" />
              Vincular con Código
            </Button>
          </CardContent>
        </Card>
      )}

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
                  <CalendarIcon className="h-8 w-8 text-gray-400" />
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
