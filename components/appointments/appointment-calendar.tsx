// Complete appointment calendar system matching the images
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, CalendarIcon, Clock, Plus, List, Users } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import AddAppointmentForm from "./add-appointment-form"
import ConfirmCancelModal from "@/components/ui/confirm-cancel-modal"
import ConfirmDeleteModal from "@/components/ui/confirm-delete-modal"
import { Switch } from "@/components/ui/switch"

interface Appointment {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: "Programada" | "Completada" | "Cancelada" | "No asistió"
  notes: string | null
  patient: {
    id: string
    first_name: string
    last_name: string
  }
}

export default function AppointmentCalendar() {
  const { user } = useAuth()
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<"week" | "list">("week")
  const [selectedFilter, setSelectedFilter] = useState("Hoy")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null)
  const [hideCompletedToday, setHideCompletedToday] = useState<boolean>(true)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  // Persist toggle in localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hideCompletedToday')
      if (saved !== null) setHideCompletedToday(saved === 'true')
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('hideCompletedToday', String(hideCompletedToday))
    } catch {}
  }, [hideCompletedToday])

  useEffect(() => {
    fetchAppointments()
  }, [user, currentDate, selectedFilter])

  useEffect(() => {
    // Update currentDate based on selectedFilter
    const today = new Date()
    if (selectedFilter === "Hoy") {
      setCurrentDate(today)
    } else if (selectedFilter === "Esta semana") {
      // Set to current week
      setCurrentDate(today)
    } else if (selectedFilter === "Este mes") {
      // Set to first day of current month
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      setCurrentDate(firstOfMonth)
    }
  }, [selectedFilter])

  // Helper: formato YYYY-MM-DD en HORA LOCAL (evita desfases por UTC)
  const ymdLocal = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const fetchAppointments = async () => {
    if (!user) return

    try {
      const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user.id).single()
      if (!doctor) return

      let query = supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          notes,
          patients!inner (
            id,
            first_name,
            last_name
          )
        `)
        .eq("doctor_id", doctor.id)

      // Apply date filters
      const today = new Date()
      
      if (selectedFilter === "Hoy") {
        // Comparación con fecha local exacta (no UTC)
        query = query.eq("appointment_date", ymdLocal(today))
      } else if (selectedFilter === "Esta semana") {
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() - today.getDay() + 1) // Monday
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6) // Sunday
        
        query = query
          .gte("appointment_date", ymdLocal(startOfWeek))
          .lte("appointment_date", ymdLocal(endOfWeek))
      } else if (selectedFilter === "Este mes") {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        query = query
          .gte("appointment_date", ymdLocal(startOfMonth))
          .lte("appointment_date", ymdLocal(endOfMonth))
      }

      const { data } = await query
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true })

      if (data) {
        const formattedAppointments = data.map((apt) => ({
          ...apt,
          patient: Array.isArray(apt.patients) ? apt.patients[0] : apt.patients,
        }))
        setAppointments(formattedAppointments)
      }
    } catch (error) {
      console.error("Error fetching appointments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAppointment = async () => {
    try {
      if (!appointmentToDelete) return
      await supabase.from('appointments').delete().eq('id', appointmentToDelete.id)
      setShowDeleteModal(false)
      setAppointmentToDelete(null)
      fetchAppointments()
    } catch (e) {
      console.error('Error deleting appointment', e)
    }
  }

  const getWeekDays = () => {
    let start = new Date(currentDate)
    
    if (selectedFilter === "Hoy") {
      // Show only current day
      return [new Date()]
    } else if (selectedFilter === "Esta semana") {
      // Show current week
      start = new Date(currentDate)
      start.setDate(currentDate.getDate() - currentDate.getDay() + 1) // Start from Monday
      
      const days = []
      for (let i = 0; i < 7; i++) {
        const day = new Date(start)
        day.setDate(start.getDate() + i)
        days.push(day)
      }
      return days
    } else if (selectedFilter === "Este mes") {
      // Show current month - all weeks of the month
      const today = new Date()
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      
      // Start from Monday of the week containing the first day
      const startDate = new Date(firstOfMonth)
      startDate.setDate(firstOfMonth.getDate() - ((firstOfMonth.getDay() + 6) % 7))
      
      // End at Sunday of the week containing the last day
      const endDate = new Date(lastOfMonth)
      endDate.setDate(lastOfMonth.getDate() + (6 - ((lastOfMonth.getDay() + 6) % 7)))
      
      const days = []
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d))
      }
      return days
    }

    // Default week view
    start.setDate(currentDate.getDate() - currentDate.getDay() + 1) // Start from Monday
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      days.push(day)
    }
    return days
  }

  const getAppointmentsForDate = (date: Date) => {
    // Filtrado por fecha en LOCAL para coincidir con appointment_date (YYYY-MM-DD)
    const dateString = ymdLocal(date)
    return appointments.filter((apt) => apt.appointment_date === dateString)
  }

  const isToday = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      const now = new Date()
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
    } catch { return false }
  }

  // Group appointments by date for list view
  const groupAppointmentsByDate = (appts: Appointment[]) => {
    const groups: Record<string, Appointment[]> = {}
    appts.forEach((apt) => {
      const dateKey = apt.appointment_date
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(apt)
    })
    // Sort dates
    const sortedKeys = Object.keys(groups).sort()
    return sortedKeys.map((date) => ({
      date,
      appointments: groups[date],
    }))
  }

  const toggleDateExpanded = (date: string) => {
    setExpandedDates((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(date)) {
        newSet.delete(date)
      } else {
        newSet.add(date)
      }
      return newSet
    })
  }

  const formatGroupDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00') // Add noon to avoid timezone issues
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return "Hoy"
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Mañana"
    } else {
      return date.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    }
  }

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":")
    const date = new Date()
    date.setHours(Number.parseInt(hours), Number.parseInt(minutes))
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Programada":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "Completada":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "Cancelada":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "No asistió":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const weekDays = getWeekDays()
  const dayNames = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"]
  
  const getDayName = (dayIndex: number, date: Date) => {
    if (selectedFilter === "Hoy") {
      return "HOY"
    } else if (selectedFilter === "Este mes") {
      return dayNames[date.getDay() === 0 ? 6 : date.getDay() - 1] // Adjust for Sunday = 0
    }
    return dayNames[dayIndex]
  }
  
  const getGridCols = () => {
    if (selectedFilter === "Hoy") {
      return "grid-cols-2" // Time column + 1 day
    } else if (selectedFilter === "Esta semana") {
      return "grid-cols-8" // Time column + 7 days
    } else if (selectedFilter === "Este mes") {
      return "grid-cols-8" // Time column + 7 days for week headers
    }
    return "grid-cols-8"
  }

  const formatDateRange = () => {
    if (selectedFilter === "Hoy") {
      const today = new Date()
      return `${today.getDate()} De ${today.toLocaleDateString("es-ES", { month: "long" })} De ${today.getFullYear()} - Hoy`
    } else if (selectedFilter === "Esta semana") {
      const start = weekDays[0]
      const end = weekDays[6]
      return `${start.getDate()} De ${start.toLocaleDateString("es-ES", { month: "long" })} - ${end.getDate()} De ${end.toLocaleDateString("es-ES", { month: "long" })} De ${end.getFullYear()}`
    } else if (selectedFilter === "Este mes") {
      const today = new Date()
      return `${today.toLocaleDateString("es-ES", { month: "long" })} De ${today.getFullYear()}`
    }
    
    const start = weekDays[0]
    const end = weekDays[6]
    return `${start.getDate()} De ${start.toLocaleDateString("es-ES", { month: "long" })} - ${end.getDate()} De ${end.toLocaleDateString("es-ES", { month: "long" })} De ${end.getFullYear()}`
  }

  // Función optimizada para calcular posición de citas
  const getAppointmentPosition = (startTime: string, endTime: string) => {
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)
    
    // Minutos desde 8:00 AM (más eficiente sin multiplicaciones repetidas)
    const startMinutes = (startHour - 8) * 60 + startMinute
    const endMinutes = (endHour - 8) * 60 + endMinute
    const duration = endMinutes - startMinutes
    
    // Constante optimizada: 64px/60min = 1.0667px/min
    const PIXELS_PER_MINUTE = 1.0667
    
    return {
      top: Math.max(0, startMinutes * PIXELS_PER_MINUTE),
      height: Math.max(24, duration * PIXELS_PER_MINUTE) // Mínimo 24px para legibilidad
    }
  }

  const handleStartConsultation = (appointment: Appointment) => {
    // Redireccionar a la página dedicada de consulta
    router.push(`/consultas/${appointment.id}`)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Header skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="h-8 w-32 rounded animate-shimmer" />
          <div className="h-10 w-48 rounded animate-shimmer" style={{ animationDelay: '0.1s' }} />
        </div>
        {/* Filter skeleton */}
        <div className="flex items-center gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-9 w-24 rounded-full animate-shimmer" style={{ animationDelay: `${i * 0.05}s` }} />
          ))}
        </div>
        {/* Calendar skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-12 w-full rounded animate-shimmer" />
              <div className="grid grid-cols-7 gap-2">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="h-32 rounded animate-shimmer" style={{ animationDelay: `${i * 0.03}s` }} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }


  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header con gradiente */}
      <div className="bg-gradient-to-r from-zuli-veronica to-zuli-indigo rounded-2xl p-6 text-white relative overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/20 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/20 translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Consultas</h1>
            <p className="text-white/80 mt-1">Gestiona tu agenda y citas con pacientes</p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle - Polished segmented control */}
            <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("list")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  viewMode === "list"
                    ? "bg-white text-zuli-veronica shadow-md"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <List className="mr-2 h-4 w-4" />
                Lista
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("week")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  viewMode === "week"
                    ? "bg-white text-zuli-veronica shadow-md"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                Calendario
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-gray-50 dark:bg-gray-800/50 rounded-full">
          {["Hoy", "Esta semana", "Este mes"].map((filter) => (
            <Button
              key={filter}
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFilter(filter)}
              className={`filter-pill touch-target ${
                selectedFilter === filter
                  ? "filter-pill-active"
                  : "filter-pill-inactive"
              }`}
            >
              {filter}
            </Button>
          ))}
        </div>

        <Dialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              // Intercept close to confirm
              setShowCancelConfirm(true)
              return
            }
            setIsAddDialogOpen(true)
          }}
        >
          <DialogTrigger asChild>
            <Button className="btn-zuli-gradient">
              <Plus className="mr-2 h-4 w-4" />
              Nueva consulta
            </Button>
          </DialogTrigger>
          <DialogContent
            className="max-w-2xl"
            onInteractOutside={(e) => {
              e.preventDefault()
              setShowCancelConfirm(true)
            }}
          >
            <DialogHeader>
              <DialogTitle>Programar Nueva Consulta</DialogTitle>
            </DialogHeader>
            <AddAppointmentForm
              onSuccess={() => {
                setIsAddDialogOpen(false)
                fetchAppointments()
              }}
              onCancel={() => setShowCancelConfirm(true)}
            />
          </DialogContent>
        </Dialog>

        <ConfirmCancelModal
          isOpen={showCancelConfirm}
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={() => {
            setShowCancelConfirm(false)
            setIsAddDialogOpen(false)
          }}
        />

        <ConfirmDeleteModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAppointment}
          title="Eliminar consulta"
          description="¿Deseas eliminar esta consulta? Se eliminarán notas y datos relacionados."
          itemName={appointmentToDelete ? `${appointmentToDelete.patient.first_name} ${appointmentToDelete.patient.last_name}` : undefined}
        />
      </div>

      {/* Calendar/List View */}
      {viewMode === "week" ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newDate = new Date(currentDate)
                    newDate.setDate(currentDate.getDate() - 7)
                    setCurrentDate(newDate)
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{formatDateRange()}</h2>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newDate = new Date(currentDate)
                    newDate.setDate(currentDate.getDate() + 7)
                    setCurrentDate(newDate)
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selectedFilter === "Hoy" ? (
              // Special day view - beautiful and compact with zuli colors
              <div className="space-y-6">
                {/* Today's header - zuli gradient */}
                <div className="text-center bg-gradient-to-r from-zuli-veronica/10 to-zuli-indigo/10 dark:from-zuli-veronica/20 dark:to-zuli-indigo/20 rounded-2xl p-8 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-zuli-veronica -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-zuli-indigo translate-y-1/2 -translate-x-1/2" />
                  </div>
                  <div className="relative">
                    <div className="text-sm font-semibold uppercase tracking-wider text-zuli-veronica">Hoy</div>
                    <div className="text-4xl font-bold bg-gradient-to-r from-zuli-veronica to-zuli-indigo bg-clip-text text-transparent mt-2">
                      {new Date().getDate()}
                    </div>
                    <div className="text-lg text-gray-700 dark:text-gray-300 capitalize mt-1">
                      {new Date().toLocaleDateString("es-ES", {
                        weekday: "long",
                        month: "long",
                        year: "numeric"
                      })}
                    </div>
                  </div>
                </div>

                {/* Today's appointments */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Consultas de hoy</h3>
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Ocultar completadas</span>
                      <Switch checked={hideCompletedToday} onCheckedChange={setHideCompletedToday} />
                    </div>
                  </div>

                  {getAppointmentsForDate(new Date()).length === 0 ? (
                    <div className="text-center py-16 animate-fadeIn">
                      <div className="empty-state-icon-colored">
                        <CalendarIcon className="h-12 w-12 text-zuli-veronica/60" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Sin consultas para hoy
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
                        No tienes consultas programadas para hoy. ¡Es un buen momento para organizar tu agenda!
                      </p>
                      <Button className="btn-zuli-gradient">
                        <Plus className="mr-2 h-4 w-4" />
                        Programar consulta
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {getAppointmentsForDate(new Date())
                        // Ya estamos en "Hoy", no necesitamos validar fecha; solo ocultar completadas
                        .filter((apt) => !(hideCompletedToday && apt.status === 'Completada'))
                        .map((appointment, aptIndex) => (
                        <div
                          key={appointment.id}
                          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:border-zuli-veronica/40 cursor-pointer animate-fadeInUp"
                          style={{ animationDelay: `${aptIndex * 50}ms` }}
                          onClick={() => handleStartConsultation(appointment)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-11 w-11">
                                <AvatarFallback className="bg-gradient-to-br from-zuli-veronica/20 to-zuli-indigo/20 text-zuli-veronica font-semibold">
                                  {getInitials(appointment.patient.first_name, appointment.patient.last_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                  {appointment.patient.first_name} {appointment.patient.last_name}
                                </h4>
                              </div>
                            </div>
                            <Badge className={getStatusColor(appointment.status)}>
                              {appointment.status}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Clock className="h-4 w-4" />
                              <span className="font-medium">
                                {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                              </span>
                            </div>
                            
                            {appointment.notes && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded p-2">
                                <strong>Notas:</strong> {appointment.notes}
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-4 flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1">
                              Ver detalles
                            </Button>
                            <Button
                              size="sm"
                              className="btn-zuli-gradient"
                              onClick={() => handleStartConsultation(appointment)}
                            >
                              Iniciar consulta
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Quick stats for today */}
                {getAppointmentsForDate(new Date()).length > 0 && (
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {getAppointmentsForDate(new Date()).length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total citas</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {getAppointmentsForDate(new Date()).filter(apt => apt.status === "Completada").length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Completadas</div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {getAppointmentsForDate(new Date()).filter(apt => apt.status === "Programada").length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Pendientes</div>
                    </div>
                  </div>
                )}
              </div>
            ) : selectedFilter === "Este mes" ? (
              // Month view with weeks - polished grid
              <div className="space-y-4">
                {/* Month header with styled day names */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {dayNames.map((dayName, idx) => (
                    <div
                      key={dayName}
                      className={`text-center text-xs font-semibold uppercase tracking-wider py-3 rounded-lg ${
                        idx >= 5
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                          : 'bg-gradient-to-r from-zuli-veronica/5 to-zuli-indigo/5 text-zuli-veronica'
                      }`}
                    >
                      {dayName}
                    </div>
                  ))}
                </div>

                {/* Month grid with improved styling */}
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day, dayIndex) => {
                    const isCurrentMonth = day.getMonth() === new Date().getMonth()
                    const isTodayDate = day.toDateString() === new Date().toDateString()
                    const dayAppointments = getAppointmentsForDate(day)
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6

                    return (
                      <div
                        key={dayIndex}
                        className={`min-h-[120px] p-2 border rounded-xl transition-all duration-200 hover:shadow-md ${
                          isCurrentMonth
                            ? isWeekend
                              ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-zuli-veronica/30'
                            : 'bg-gray-100/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800'
                        } ${isTodayDate ? 'ring-2 ring-zuli-veronica shadow-lg shadow-zuli-veronica/10' : ''}`}
                      >
                        <div className={`flex items-center justify-between mb-2`}>
                          <span className={`text-sm font-semibold ${
                            isTodayDate
                              ? 'bg-zuli-veronica text-white px-2 py-0.5 rounded-full'
                              : isCurrentMonth
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-400 dark:text-gray-500'
                          }`}>
                            {day.getDate()}
                          </span>
                          {dayAppointments.length > 0 && !isTodayDate && (
                            <span className="w-2 h-2 rounded-full bg-zuli-veronica"></span>
                          )}
                        </div>

                        <div className="space-y-1">
                          {dayAppointments.slice(0, 2).map((appointment) => (
                            <div
                              key={appointment.id}
                              className={`border-l-2 p-1.5 rounded-r text-xs cursor-pointer transition-all duration-200 ${
                                appointment.status === 'Completada'
                                  ? 'bg-green-50 dark:bg-green-900/30 border-green-500 hover:bg-green-100 dark:hover:bg-green-900/50'
                                  : appointment.status === 'Cancelada'
                                    ? 'bg-red-50 dark:bg-red-900/30 border-red-400 hover:bg-red-100 dark:hover:bg-red-900/50'
                                    : 'bg-gradient-to-r from-zuli-veronica/10 to-zuli-indigo/5 border-zuli-veronica hover:from-zuli-veronica/20 hover:to-zuli-indigo/10'
                              }`}
                              title={`${appointment.patient.first_name} ${appointment.patient.last_name} - ${formatTime(appointment.start_time)} - ${appointment.status}`}
                              onClick={() => handleStartConsultation(appointment)}
                            >
                              <div className="font-medium text-gray-900 dark:text-white truncate">
                                {appointment.patient.first_name}
                              </div>
                              <div className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(appointment.start_time)}
                              </div>
                            </div>
                          ))}
                          {dayAppointments.length > 2 && (
                            <div className="text-xs text-zuli-veronica font-medium text-center py-1 bg-zuli-veronica/5 rounded-full">
                              +{dayAppointments.length - 2} más
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              // Week/Day view with time slots - clean design
              <div className={`grid ${getGridCols()} gap-1 relative`}>
                {/* Columna de horas - minimal */}
                <div className="space-y-0 pr-2">
                  <div className="h-14"></div>
                  {Array.from({ length: 12 }, (_, i) => (
                    <div key={i} className="h-16 flex items-start text-[11px] font-medium text-gray-400 dark:text-gray-500 text-right pr-2 -mt-2">
                      {`${String(i + 8).padStart(2, '0')}:00`}
                    </div>
                  ))}
                </div>

                {/* Days columns */}
                {weekDays.map((day, dayIndex) => {
                  const isTodayColumn = day.toDateString() === new Date().toDateString()

                  return (
                    <div key={dayIndex} className="relative">
                      {/* Day header - clean minimal design */}
                      <div className="text-center h-14 flex flex-col items-center justify-center">
                        <div className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                          {getDayName(dayIndex, day)}
                        </div>
                        <div className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold mt-0.5 ${
                          isTodayColumn
                            ? 'bg-zuli-veronica text-white'
                            : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}>
                          {day.getDate()}
                        </div>
                      </div>

                      {/* Líneas de tiempo - clean lines */}
                      <div className="absolute inset-0 top-14 pointer-events-none border-l border-gray-100 dark:border-gray-800">
                        {Array.from({ length: 12 }, (_, i) => (
                          <div
                            key={i}
                            className="h-16 border-t border-gray-100 dark:border-gray-800"
                          ></div>
                        ))}
                      </div>

                      {/* Citas posicionadas por tiempo */}
                      <div className="relative h-[768px] mt-14">
                        {getAppointmentsForDate(day).map((appointment) => {
                          const { top, height } = getAppointmentPosition(appointment.start_time, appointment.end_time)
                          const showBadge = height > 50

                          // Status-based colors - clean solid colors
                          const getAppointmentStyle = () => {
                            if (appointment.status === 'Completada') {
                              return 'bg-green-50 dark:bg-green-900/30 border-l-green-500 hover:bg-green-100 dark:hover:bg-green-900/50'
                            } else if (appointment.status === 'Cancelada' || appointment.status === 'No asistió') {
                              return 'bg-gray-50 dark:bg-gray-800 border-l-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }
                            return 'bg-zuli-veronica/10 dark:bg-zuli-veronica/20 border-l-zuli-veronica hover:bg-zuli-veronica/20 dark:hover:bg-zuli-veronica/30'
                          }

                          return (
                            <div
                              key={appointment.id}
                              className={`absolute left-0.5 right-0.5 border-l-3 px-2 py-1.5 rounded-r text-xs cursor-pointer transition-colors duration-150 z-10 ${getAppointmentStyle()}`}
                              style={{ top, height: Math.max(height, 28) }}
                              title={`${appointment.patient.first_name} ${appointment.patient.last_name} - ${formatTime(appointment.start_time)} a ${formatTime(appointment.end_time)}`}
                              onClick={() => handleStartConsultation(appointment)}
                            >
                              <div className="font-medium text-gray-900 dark:text-white truncate leading-tight">
                                {appointment.patient.first_name} {appointment.patient.last_name}
                              </div>
                              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                {formatTime(appointment.start_time)}
                              </div>
                              {showBadge && (
                                <Badge className={`text-[10px] px-1 py-0 mt-0.5 ${getStatusColor(appointment.status)}`}>
                                  {appointment.status}
                                </Badge>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* List View with Collapsible Groups */
        <div className="space-y-4 animate-fadeIn">
          {/* Header Card */}
          <Card className="border-none shadow-sm bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedFilter === "Hoy" && "Consultas de hoy"}
                    {selectedFilter === "Esta semana" && "Consultas de esta semana"}
                    {selectedFilter === "Este mes" && "Consultas de este mes"}
                  </CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {appointments.length} consulta{appointments.length !== 1 ? 's' : ''} programada{appointments.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {selectedFilter === 'Hoy' && (
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Ocultar completadas</span>
                    <Switch checked={hideCompletedToday} onCheckedChange={setHideCompletedToday} />
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Empty State */}
          {appointments.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center animate-fadeIn">
                  <div className="empty-state-icon-colored">
                    <CalendarIcon className="h-12 w-12 text-zuli-veronica/60" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Sin consultas programadas
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
                    No hay consultas para este período. ¡Es un buen momento para organizar tu agenda!
                  </p>
                  <Button className="btn-zuli-gradient" onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Programar consulta
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Collapsible Date Groups */
            <div className="space-y-3">
              {groupAppointmentsByDate(
                selectedFilter === 'Hoy'
                  ? appointments.filter(a => !(hideCompletedToday && a.status === 'Completada'))
                  : appointments
              ).map((group, groupIndex) => {
                const isExpanded = expandedDates.has(group.date)
                const isTodayGroup = isToday(group.date)
                const completedCount = group.appointments.filter(a => a.status === 'Completada').length
                const pendingCount = group.appointments.filter(a => a.status === 'Programada').length

                return (
                  <Card
                    key={group.date}
                    className={`overflow-hidden transition-all duration-200 animate-fadeInUp ${
                      isTodayGroup ? 'ring-2 ring-zuli-veronica/30' : ''
                    }`}
                    style={{ animationDelay: `${groupIndex * 50}ms` }}
                  >
                    {/* Collapsible Header */}
                    <button
                      onClick={() => toggleDateExpanded(group.date)}
                      className="w-full px-4 py-4 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50 hover:from-gray-100 hover:to-gray-50 dark:hover:from-gray-700 dark:hover:to-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isTodayGroup
                            ? 'bg-gradient-to-br from-zuli-veronica to-zuli-indigo text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                          <CalendarIcon className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <h3 className={`font-semibold capitalize ${
                            isTodayGroup
                              ? 'text-zuli-veronica'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {formatGroupDate(group.date)}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {group.appointments.length} cita{group.appointments.length !== 1 ? 's' : ''}
                            </span>
                            {pendingCount > 0 && (
                              <Badge variant="outline" className="text-xs px-2 py-0 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                                {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
                              </Badge>
                            )}
                            {completedCount > 0 && (
                              <Badge variant="outline" className="text-xs px-2 py-0 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                                {completedCount} completada{completedCount !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={`p-2 rounded-full transition-colors ${
                        isExpanded
                          ? 'bg-zuli-veronica/10 text-zuli-veronica'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <CardContent className="pt-0 pb-3 px-3 animate-fadeIn">
                        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-2">
                          {group.appointments.map((appointment, aptIndex) => (
                            <div
                              key={appointment.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-zuli-veronica/30 hover:shadow-md transition-all duration-200 animate-fadeInUp"
                              style={{ animationDelay: `${aptIndex * 30}ms` }}
                            >
                              <div className="flex items-center gap-4">
                                <Avatar className="h-11 w-11">
                                  <AvatarFallback className="bg-gradient-to-br from-zuli-veronica/20 to-zuli-indigo/20 text-zuli-veronica font-semibold">
                                    {getInitials(appointment.patient.first_name, appointment.patient.last_name)}
                                  </AvatarFallback>
                                </Avatar>

                                <div>
                                  <h4 className="font-semibold text-gray-900 dark:text-white">
                                    {appointment.patient.first_name} {appointment.patient.last_name}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
                                      <Clock className="h-3.5 w-3.5" />
                                      <span className="font-medium">
                                        {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 sm:ml-auto">
                                <Badge className={`${getStatusColor(appointment.status)} font-medium`}>
                                  {appointment.status}
                                </Badge>
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() => {
                                      setAppointmentToDelete(appointment)
                                      setShowDeleteModal(true)
                                    }}
                                  >
                                    Eliminar
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="btn-zuli-gradient"
                                    onClick={() => handleStartConsultation(appointment)}
                                  >
                                    Iniciar consulta
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
