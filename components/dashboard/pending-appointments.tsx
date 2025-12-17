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
          <CardTitle className="text-gray-700">Consultas Pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="card-shadow">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-gray-700">Consultas Pendientes</CardTitle>
        <Link href="/consultas">
          <Button variant="ghost" size="sm" className="text-zuli-veronica hover:text-zuli-veronica-600">
            Ver todas
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No hay consultas programadas</p>
            <Link href="/consultas">
              <Button className="btn-zuli-gradient">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Consulta
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {appointments.map((appointment) => (
              <Card key={appointment.id} className="hover:shadow-md transition-shadow border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-700">
                      {appointment.patient.first_name} {appointment.patient.last_name}
                    </h4>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700"
                        onClick={() => { setAppointmentToDelete(appointment); setShowDeleteModal(true) }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      {formatDate(appointment.appointment_date)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      {formatTime(appointment.start_time)} : {formatTime(appointment.end_time)}
                    </div>
                  </div>

                  <div className="mt-3">
                    <Button
                      className="w-full btn-zuli-gradient text-sm"
                      onClick={() => handleStartConsultation(appointment)}
                    >
                      Iniciar Consulta →
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
