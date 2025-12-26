"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import ConsultationFlow from "@/components/appointments/consultation-flow"
import { Loader2 } from "lucide-react"

interface AppointmentData {
  id: string
  patient: {
    id: string
    first_name: string
    last_name: string
  }
}

export default function ConsultationPage() {
  const params = useParams()
  const router = useRouter()
  const appointmentId = params.appointmentId as string
  
  const [appointmentData, setAppointmentData] = useState<AppointmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAppointmentData = async () => {
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            patients!inner (
              id,
              first_name,
              last_name
            )
          `)
          .eq('id', appointmentId)
          .single()

        if (error) {
          console.error('Error fetching appointment:', error)
          setError('No se pudo cargar la cita')
          return
        }

        setAppointmentData({
          id: data.id,
          patient: Array.isArray(data.patients) ? data.patients[0] : data.patients
        })
      } catch (error) {
        console.error('Error:', error)
        setError('Error inesperado')
      } finally {
        setLoading(false)
      }
    }

    if (appointmentId) {
      fetchAppointmentData()
    }
  }, [appointmentId])

  const handleClose = () => {
    router.push('/consultas')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center animate-fadeIn">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-zuli-veronica to-zuli-indigo flex items-center justify-center shadow-lg shadow-zuli-veronica/20">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Cargando consulta...</p>
        </div>
      </div>
    )
  }

  if (error || !appointmentData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-2xl p-8 shadow-lg max-w-md">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'No se encontró la cita'}</p>
            <button
              onClick={handleClose}
              className="btn-zuli-gradient px-6 py-2.5 rounded-xl font-medium"
            >
              Volver a consultas
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ConsultationFlow
      appointmentId={appointmentId}
      patientName={`${appointmentData.patient.first_name} ${appointmentData.patient.last_name}`}
      patientId={appointmentData.patient.id}
      onClose={handleClose}
    />
  )
}