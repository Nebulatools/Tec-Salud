// Complete appointment calendar system matching the images.
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { ChevronLeft, ChevronRight, CalendarIcon, Clock, Plus, List } from "lucide-react"
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
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </CardContent>
        </Card>
      </div>
    )
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Consultas</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              <List className="mr-2 h-4 w-4" />
              Lista
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
              className={viewMode === "week" ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Calendario
            </Button>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          {["Hoy", "Esta semana", "Este mes"].map((filter) => (
            <Button
              key={filter}
              variant={selectedFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter(filter)}
              className={
                selectedFilter === filter
                  ? "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900 dark:text-orange-300"
                  : ""
              }
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
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
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
              // Special day view - beautiful and compact
              <div className="space-y-6">
                {/* Today's header */}
                <div className="text-center bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 rounded-lg p-6">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">HOY</div>
                  <div className="text-3xl font-bold text-teal-600 dark:text-teal-400 mt-1">
                    {new Date().getDate()}
                  </div>
                  <div className="text-lg text-gray-700 dark:text-gray-300">
                    {new Date().toLocaleDateString("es-ES", { 
                      weekday: "long", 
                      month: "long", 
                      year: "numeric" 
                    })}
                  </div>
                </div>

                {/* Today's appointments */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Consultas de hoy</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Ocultar completadas de hoy</span>
                      <Switch checked={hideCompletedToday} onCheckedChange={setHideCompletedToday} />
                    </div>
                  </div>
                  
                  {getAppointmentsForDate(new Date()).length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <CalendarIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 text-lg">
                        No tienes consultas programadas para hoy
                      </p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                        
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {getAppointmentsForDate(new Date())
                        // Ya estamos en "Hoy", no necesitamos validar fecha; solo ocultar completadas
                        .filter((apt) => !(hideCompletedToday && apt.status === 'Completada'))
                        .map((appointment) => (
                        <div
                          key={appointment.id}
                          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-all duration-200 hover:border-teal-300 dark:hover:border-teal-600 cursor-pointer"
                          onClick={() => handleStartConsultation(appointment)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300">
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
                              className="bg-orange-500 hover:bg-orange-600 text-white"
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
              // Month view with weeks
              <div className="space-y-4">
                {/* Month header */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {dayNames.map((dayName) => (
                    <div key={dayName} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 p-2">
                      {dayName}
                    </div>
                  ))}
                </div>
                
                {/* Month grid */}
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day, dayIndex) => {
                    const isCurrentMonth = day.getMonth() === new Date().getMonth()
                    const isToday = day.toDateString() === new Date().toDateString()
                    const dayAppointments = getAppointmentsForDate(day)
                    
                    return (
                      <div
                        key={dayIndex}
                        className={`min-h-[120px] p-2 border rounded-lg ${
                          isCurrentMonth 
                            ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' 
                            : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800'
                        } ${isToday ? 'ring-2 ring-teal-500' : ''}`}
                      >
                        <div className={`text-sm font-medium mb-2 ${
                          isToday 
                            ? 'text-teal-600 dark:text-teal-400' 
                            : isCurrentMonth 
                              ? 'text-gray-900 dark:text-white' 
                              : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {day.getDate()}
                        </div>
                        
                        <div className="space-y-1">
                          {dayAppointments.slice(0, 3).map((appointment) => (
                            <div
                              key={appointment.id}
                              className="bg-teal-100 dark:bg-teal-900 border-l-2 border-teal-500 p-1 rounded text-xs hover:bg-teal-200 dark:hover:bg-teal-800 cursor-pointer transition-colors"
                              title={`${appointment.patient.first_name} ${appointment.patient.last_name} - ${formatTime(appointment.start_time)} - ${appointment.status}`}
                              onClick={() => handleStartConsultation(appointment)}
                            >
                              <div className="font-medium text-gray-900 dark:text-white truncate">
                                {appointment.patient.first_name}
                              </div>
                              <div className="text-gray-600 dark:text-gray-400">
                                {formatTime(appointment.start_time)}
                              </div>
                            </div>
                          ))}
                          {dayAppointments.length > 3 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                              +{dayAppointments.length - 3} más
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              // Week/Day view with time slots
              <div className={`grid ${getGridCols()} gap-4 relative`}>
                {/* Columna de horas */}
                <div className="space-y-0">
                  <div className="h-12 border-b border-gray-200 dark:border-gray-700"></div>
                  {Array.from({ length: 12 }, (_, i) => (
                    <div key={i} className="h-16 flex items-start pt-1 text-sm font-medium text-gray-500 dark:text-gray-400 text-right pr-3 border-t border-gray-100 dark:border-gray-700">
                      {`${i + 8}:00`}
                    </div>
                  ))}
                </div>

                {/* Days columns */}
                {weekDays.map((day, dayIndex) => (
                  <div key={dayIndex} className="relative">
                    {/* Day header */}
                    <div className="text-center p-2 h-12 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{getDayName(dayIndex, day)}</div>
                      <div
                        className={`text-lg font-bold mt-1 ${
                          day.toDateString() === new Date().toDateString()
                            ? "text-teal-600 dark:text-teal-400"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {day.getDate()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {day.toLocaleDateString("es-ES", { month: "short" })}
                      </div>
                    </div>

                    {/* Líneas de tiempo */}
                    <div className="absolute inset-0 top-12 pointer-events-none">
                      {Array.from({ length: 12 }, (_, i) => (
                        <div key={i} className="h-16 border-t border-gray-50 dark:border-gray-800"></div>
                      ))}
                    </div>

                    {/* Citas posicionadas por tiempo */}
                    <div className="relative h-[768px]">
                      {getAppointmentsForDate(day).map((appointment) => {
                        const { top, height } = getAppointmentPosition(appointment.start_time, appointment.end_time)
                        const showBadge = height > 45
                        
                        return (
                          <div
                            key={appointment.id}
                            className="absolute left-1 right-1 bg-gradient-to-r from-teal-100 to-teal-50 dark:from-teal-900 dark:to-teal-800 border-l-4 border-teal-500 p-2 rounded-md text-xs hover:from-teal-200 hover:to-teal-100 dark:hover:from-teal-800 dark:hover:to-teal-700 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md z-10"
                            style={{ top, height }}
                            title={`${appointment.patient.first_name} ${appointment.patient.last_name} - ${formatTime(appointment.start_time)} a ${formatTime(appointment.end_time)}`}
                            onClick={() => handleStartConsultation(appointment)}
                          >
                            <div className="font-semibold text-gray-900 dark:text-white truncate">
                              {appointment.patient.first_name} {appointment.patient.last_name}
                            </div>
                            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 mt-0.5">
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              <span>{formatTime(appointment.start_time)}</span>
                            </div>
                            {showBadge && (
                              <Badge className={`text-xs px-1.5 py-0.5 mt-1 ${getStatusColor(appointment.status)}`}>
                                {appointment.status}
                              </Badge>
                            )}
                          </div>
                        )
                      })}
                      

                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* List View */
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {selectedFilter === "Hoy" && "Consultas de hoy"}
                {selectedFilter === "Esta semana" && "Consultas de esta semana"}
                {selectedFilter === "Este mes" && "Consultas de este mes"}
              </CardTitle>
              {selectedFilter === 'Hoy' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Ocultar completadas de hoy</span>
                  <Switch checked={hideCompletedToday} onCheckedChange={setHideCompletedToday} />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  No hay consultas programadas para este período
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {(selectedFilter === 'Hoy'
                    // En vista de lista con filtro "Hoy" el backend ya trae solo hoy; ocultar completadas directamente
                    ? appointments.filter(a => !(hideCompletedToday && a.status === 'Completada'))
                    : appointments
                  ).map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300">
                          {getInitials(appointment.patient.first_name, appointment.patient.last_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {appointment.patient.first_name} {appointment.patient.last_name}
                        </h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4" />
                            {new Date(appointment.appointment_date).toLocaleDateString("es-ES")}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(appointment.status)}>{appointment.status}</Badge>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setAppointmentToDelete(appointment)
                          setShowDeleteModal(true)
                        }}
                      >
                        Eliminar
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                        onClick={() => handleStartConsultation(appointment)}
                      >
                        Iniciar consulta
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
