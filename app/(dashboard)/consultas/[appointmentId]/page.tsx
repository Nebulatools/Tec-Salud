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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary-500" />
          <p className="text-gray-600">Cargando consulta...</p>
        </div>
      </div>
    )
  }

  if (error || !appointmentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600">{error || 'No se encontró la cita'}</p>
            <button 
              onClick={handleClose}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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