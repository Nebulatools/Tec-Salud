// Complete appointment calendar system matching the images
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { ChevronLeft, ChevronRight, CalendarIcon, Clock, Plus, List, Filter, Download, Upload } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import AddAppointmentForm from "./add-appointment-form"

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
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<"week" | "list">("week")
  const [selectedFilter, setSelectedFilter] = useState("Hoy")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  useEffect(() => {
    fetchAppointments()
  }, [user, currentDate, selectedFilter])

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
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)

      if (selectedFilter === "Hoy") {
        query = query.eq("appointment_date", today.toISOString().split("T")[0])
      } else if (selectedFilter === "Esta semana") {
        query = query
          .gte("appointment_date", startOfWeek.toISOString().split("T")[0])
          .lte("appointment_date", endOfWeek.toISOString().split("T")[0])
      } else if (selectedFilter === "Este mes") {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        query = query
          .gte("appointment_date", startOfMonth.toISOString().split("T")[0])
          .lte("appointment_date", endOfMonth.toISOString().split("T")[0])
      }

      const { data } = await query
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true })

      if (data) {
        const formattedAppointments = data.map((apt) => ({
          ...apt,
          patient: apt.patients,
        }))
        setAppointments(formattedAppointments)
      }
    } catch (error) {
      console.error("Error fetching appointments:", error)
    } finally {
      setLoading(false)
    }
  }

  const getWeekDays = () => {
    const start = new Date(currentDate)
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
    const dateString = date.toISOString().split("T")[0]
    return appointments.filter((apt) => apt.appointment_date === dateString)
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

  const formatDateRange = () => {
    const start = weekDays[0]
    const end = weekDays[6]
    return `${start.getDate()} De ${start.toLocaleDateString("es-ES", { month: "long" })} - ${end.getDate()} De ${end.toLocaleDateString("es-ES", { month: "long" })} De ${end.getFullYear()}`
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
              className={viewMode === "list" ? "bg-teal-600 hover:bg-teal-700" : ""}
            >
              <List className="mr-2 h-4 w-4" />
              Lista
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
              className={viewMode === "week" ? "bg-teal-600 hover:bg-teal-700" : ""}
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
          <input
            type="text"
            placeholder="Buscar paciente o consulta"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-800 dark:border-gray-600"
          />
        </div>

        <div className="flex items-center gap-2">
          {["Hoy", "Esta semana", "Este mes"].map((filter) => (
            <Button
              key={filter}
              variant={selectedFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter(filter)}
              className={
                selectedFilter === filter
                  ? "bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900 dark:text-teal-300"
                  : ""
              }
            >
              {filter}
            </Button>
          ))}

          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>

          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>

          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="mr-2 h-4 w-4" />
                Nueva consulta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Programar Nueva Consulta</DialogTitle>
              </DialogHeader>
              <AddAppointmentForm
                onSuccess={() => {
                  setIsAddDialogOpen(false)
                  fetchAppointments()
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
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

              <div className="flex items-center gap-2">
                {["Hoy", "Día", "Semana", "Mes"].map((view, index) => (
                  <Button
                    key={view}
                    variant={index === 2 ? "default" : "ghost"}
                    size="sm"
                    className={index === 2 ? "bg-teal-600 hover:bg-teal-700" : ""}
                  >
                    {view}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-8 gap-4">
              {/* Time column */}
              <div className="space-y-16">
                <div className="h-12"></div> {/* Header space */}
                {Array.from({ length: 12 }, (_, i) => (
                  <div key={i} className="text-sm text-gray-500 dark:text-gray-400 text-right pr-2">
                    {`${i + 8}:00`}
                  </div>
                ))}
              </div>

              {/* Days columns */}
              {weekDays.map((day, dayIndex) => (
                <div key={dayIndex} className="space-y-2">
                  {/* Day header */}
                  <div className="text-center p-2">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{dayNames[dayIndex]}</div>
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

                  {/* Appointments for this day */}
                  <div className="space-y-1 min-h-[600px]">
                    {getAppointmentsForDate(day).map((appointment) => (
                      <div
                        key={appointment.id}
                        className="bg-teal-100 dark:bg-teal-900 border-l-4 border-teal-500 p-2 rounded text-xs"
                      >
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {appointment.patient.first_name.substring(0, 5)}...
                        </div>
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Clock className="h-3 w-3" />
                          {formatTime(appointment.start_time)}...
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* List View */
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedFilter === "Hoy" && "Consultas de hoy"}
              {selectedFilter === "Esta semana" && "Consultas de esta semana"}
              {selectedFilter === "Este mes" && "Consultas de este mes"}
            </CardTitle>
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
                {appointments.map((appointment) => (
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
                      <Button size="sm" variant="ghost">
                        <Plus className="h-4 w-4" />
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
