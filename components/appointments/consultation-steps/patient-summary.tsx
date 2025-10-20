"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileText, Edit, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface PatientSummaryProps {
  appointmentId: string
  consultationData: any
  onComplete: (data: any) => void
}

interface PatientInfo {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  phone: string
  email: string
  medical_history: string | null
  allergies: string | null
  current_medications: string | null
}

interface AppointmentDetails {
  appointment_date: string
  start_time: string
  end_time: string
  notes: string | null
}

export default function PatientSummary({ appointmentId, consultationData, onComplete }: PatientSummaryProps) {
  const [loading, setLoading] = useState(true)
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null)
  const [appointmentDetails, setAppointmentDetails] = useState<AppointmentDetails | null>(null)
  const [previousNotes, setPreviousNotes] = useState("")
  const [patientSummary, setPatientSummary] = useState("")
  const [contextFiles, setContextFiles] = useState<File[]>([])
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    fetchPatientData()
  }, [appointmentId])

  const fetchPatientData = async () => {
    try {
      console.log("Fetching patient data for appointment ID:", appointmentId)
      
      // First fetch appointment details
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .select(`
          appointment_date,
          start_time,
          end_time,
          notes,
          patient_id
        `)
        .eq("id", appointmentId)
        .single()

      console.log("Appointment data:", appointment)
      console.log("Appointment error:", appointmentError)

      if (appointment) {
        setAppointmentDetails({
          appointment_date: appointment.appointment_date,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          notes: appointment.notes,
        })
        // Notas Previas deben reflejar las notas de la CITA (no el expediente)
        setPreviousNotes(appointment.notes || "")
        
        // Now fetch the LATEST patient data directly from patients table
        const { data: patient, error: patientError } = await supabase
          .from("patients")
          .select(`
            id,
            first_name,
            last_name,
            date_of_birth,
            phone,
            email,
            medical_history,
            allergies,
            current_medications
          `)
          .eq("id", appointment.patient_id)
          .single()

        console.log("Fresh patient data:", patient)
        console.log("Patient error:", patientError)
        
        if (patient) {
          setPatientInfo(patient)
          
          // Construir un resumen del expediente (solo lectura) en lugar de pisar las notas de la cita
          let summaryParts: string[] = []
          summaryParts.push(`Alergias: ${patient.allergies?.trim() || 'Sin alergias conocidas'}`)
          summaryParts.push(`Medicamentos actuales: ${patient.current_medications?.trim() || 'Sin medicamentos actuales'}`)
          if (patient.medical_history && patient.medical_history.trim()) {
            summaryParts.push(`Historial: ${patient.medical_history.trim()}`)
          }
          setPatientSummary(summaryParts.join("\n"))
        }
      }
    } catch (error) {
      console.error("Error fetching patient data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setContextFiles(prev => [...prev, ...files])
  }

  const handleContinue = async () => {
    // Persistir las notas de la cita si cambiaron
    try {
      if (appointmentId) {
        await supabase
          .from('appointments')
          .update({ notes: previousNotes })
          .eq('id', appointmentId)
      }
    } catch (e) {
      console.warn('No se pudo guardar notas de la cita:', e)
    }

    const summaryData = {
      patientInfo,
      appointmentDetails,
      previousNotes,
      patientSummary,
      contextFiles,
      onsetDate: appointmentDetails?.appointment_date || new Date().toISOString().split("T")[0],
      recordedDate: new Date().toISOString().split("T")[0],
      reactionType: "Consulta Médica",
      facilityName: "Tec Salud",
    }
    
    onComplete(summaryData)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Consulta carga en proceso
          </CardTitle>
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Cargando
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Patient Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Información del Paciente</h3>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Nombre:</span>
                  <p className="text-gray-900">{patientInfo?.first_name} {patientInfo?.last_name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Fecha de Nacimiento:</span>
                  <p className="text-gray-900">{patientInfo?.date_of_birth ? new Date(patientInfo.date_of_birth).toLocaleDateString("es-ES") : "No especificada"}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Teléfono:</span>
                  <p className="text-gray-900">{patientInfo?.phone || "No especificado"}</p>
                </div>
              </div>
            </div>
            
            <div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Email:</span>
                  <p className="text-gray-900">{patientInfo?.email || "No especificado"}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Fecha de Consulta:</span>
                  <p className="text-gray-900">{appointmentDetails?.appointment_date ? new Date(appointmentDetails.appointment_date).toLocaleDateString("es-ES") : "No especificada"}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Hora:</span>
                  <p className="text-gray-900">{appointmentDetails?.start_time} - {appointmentDetails?.end_time}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen del Expediente (solo lectura) */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Resumen del Expediente:</h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <pre className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
{patientSummary || '—'}
            </pre>
          </div>
        </div>

        {/* Previous Notes (de la cita) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-900">Notas Previas:</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsEditing(!isEditing)}
              className="text-primary-600 hover:text-primary-700"
            >
              <Edit className="w-4 h-4 mr-1" />
              Editar
            </Button>
          </div>
          
          {isEditing ? (
            <Textarea
              value={previousNotes}
              onChange={(e) => setPreviousNotes(e.target.value)}
              className="min-h-[100px]"
              placeholder="Agregar notas previas del paciente..."
            />
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700 text-sm leading-relaxed">
                {previousNotes}
              </p>
            </div>
          )}
        </div>

        {/* Context Files */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Archivos de Contexto:</h3>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-3" />
            <div>
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-primary-600 hover:text-primary-700 font-medium">Subir archivos de contexto</span>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.jpg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              PDF, DOC, JPG, PNG (máx. 10MB)
            </p>
          </div>

          {contextFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {contextFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{file.name}</span>
                  <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Continue Button */}
        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleContinue}
            className="bg-orange-500 hover:bg-orange-600 text-white px-8"
          >
            Continuar a Grabación
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 
