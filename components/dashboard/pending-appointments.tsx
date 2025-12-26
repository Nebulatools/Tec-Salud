// Pending appointments with exact design from image
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Calendar, Clock, Plus, ArrowRight, Trash2 } from "lucide-react"
import ConfirmDeleteModal from "@/components/ui/confirm-delete-modal"
import Link from "next/link"

interface Appointment {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: string
  patient_id: string
  patient: {
    id: string
    first_name: string
    last_name: string
  }
}

export default function PendingAppointments() {
  const { user } = useAuth()
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null)

  const fetchPendingAppointments = async () => {
    if (!user) return

    try {
      const { data: doctor, error: doctorError } = await supabase.from("doctors").select("id").eq("user_id", user.id).single()
      
      if (doctorError) {
        console.error("Error fetching doctor:", doctorError)
        console.error("User ID:", user.id)
        console.error("Make sure there's a doctor record for this user in the database")
        
        // Si no hay doctor, mostrar mensaje más claro
        if (doctorError.code === 'PGRST116') {
          console.error("No doctor found for this user. Please run the fix-doctor-user.sql script")
        }
        return
      }
      
      if (!doctor) return

      const today = new Date().toISOString().split("T")[0]
      
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          patient_id,
          patients!inner (
            id,
            first_name,
            last_name
          )
        `)
        .eq("doctor_id", doctor.id)
        .eq("status", "Programada")
        .gte("appointment_date", today)
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(6)

      if (error) {
        console.error("Error fetching appointments:", error)
        return
      }

      if (data) {
        const formattedAppointments: Appointment[] = (data as any[]).map((apt: any) => ({
          id: apt.id,
          appointment_date: apt.appointment_date,
          start_time: apt.start_time,
          end_time: apt.end_time,
          status: apt.status,
          patient_id: apt.patient_id,
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

  useEffect(() => {
    fetchPendingAppointments()
  }, [user])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
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

  const handleStartConsultation = (appointment: Appointment) => {
    // Redireccionar a la página dedicada de consulta
    router.push(`/consultas/${appointment.id}`)
  }

  const handleDelete = async () => {
    try {
      if (!appointmentToDelete) return
      await supabase.from('appointments').delete().eq('id', appointmentToDelete.id)
      setShowDeleteModal(false)
      setAppointmentToDelete(null)
      fetchPendingAppointments()
    } catch (e) {
      console.error('Error deleting appointment', e)
    }
  }

  if (loading) {
    return (
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-gray-700 dark:text-gray-200">Consultas Pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="border border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-5 w-32 rounded animate-shimmer" />
                    <div className="h-8 w-8 rounded animate-shimmer" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-24 rounded animate-shimmer" style={{ animationDelay: '0.1s' }} />
                    <div className="h-4 w-28 rounded animate-shimmer" style={{ animationDelay: '0.15s' }} />
                  </div>
                  <div className="mt-3 h-9 w-full rounded animate-shimmer" style={{ animationDelay: '0.2s' }} />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="card-shadow">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-gray-700 dark:text-gray-200">Consultas Pendientes</CardTitle>
        <Link href="/consultas">
          <Button variant="ghost" size="sm" className="text-zuli-veronica hover:text-zuli-veronica-600 group">
            Ver todas
            <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <div className="text-center py-12 animate-fadeIn">
            <div className="empty-state-icon-colored">
              <Calendar className="h-12 w-12 text-zuli-veronica/60" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Sin consultas programadas
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
              No tienes consultas pendientes. ¡Es un buen momento para organizar tu agenda!
            </p>
            <Link href="/consultas">
              <Button className="btn-zuli-gradient animate-pulse-subtle">
                <Plus className="mr-2 h-4 w-4" />
                Programar consulta
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {appointments.map((appointment, index) => (
              <Card
                key={appointment.id}
                className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-2 border-gray-100 dark:border-gray-700 hover:border-zuli-veronica/30 overflow-hidden animate-fadeInUp"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Top accent bar on hover */}
                <div className="h-1 bg-gradient-to-r from-zuli-veronica to-zuli-indigo opacity-0 group-hover:opacity-100 transition-opacity" />

                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 truncate pr-2">
                      {appointment.patient.first_name} {appointment.patient.last_name}
                    </h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                      onClick={() => { setAppointmentToDelete(appointment); setShowDeleteModal(true) }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="h-4 w-4 text-zuli-indigo" />
                      <span>{formatDate(appointment.appointment_date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="h-4 w-4 text-zuli-cyan-600" />
                      <span>{formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <Button
                      className="w-full btn-zuli-gradient text-sm group/btn"
                      onClick={() => handleStartConsultation(appointment)}
                    >
                      Iniciar Consulta
                      <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Eliminar consulta"
        description="¿Deseas eliminar esta consulta? Se eliminarán notas y datos relacionados."
        itemName={appointmentToDelete ? `${appointmentToDelete.patient.first_name} ${appointmentToDelete.patient.last_name}` : undefined}
      />
    </Card>
  )
}
