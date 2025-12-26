"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileText, Edit, AlertTriangle, User, Calendar, Clock, Phone, Mail, ArrowRight } from "lucide-react"
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
  gender?: string
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
            gender,
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
      <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
        <CardContent className="p-8">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 rounded-lg animate-shimmer" style={{ width: `${75 - i * 15}%`, animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-zuli-veronica/5 to-zuli-indigo/5 dark:from-zuli-veronica/10 dark:to-zuli-indigo/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zuli-veronica to-zuli-indigo flex items-center justify-center shadow-lg shadow-zuli-veronica/20">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Resumen del Paciente
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">Paso 1 de 5</p>
            </div>
          </div>
          <Badge className="bg-zuli-veronica/10 text-zuli-veronica border-zuli-veronica/20">
            En progreso
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Patient Information Card */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-900/50 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            Información del Paciente
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zuli-veronica/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-zuli-veronica" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Nombre</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{patientInfo?.first_name} {patientInfo?.last_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zuli-indigo/10 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-zuli-indigo" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Fecha de Nacimiento</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{patientInfo?.date_of_birth ? new Date(patientInfo.date_of_birth).toLocaleDateString("es-ES") : "No especificada"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zuli-cyan/10 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-zuli-cyan" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Teléfono</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{patientInfo?.phone || "No especificado"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{patientInfo?.email || "No especificado"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Fecha de Consulta</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{appointmentDetails?.appointment_date ? new Date(appointmentDetails.appointment_date).toLocaleDateString("es-ES") : "No especificada"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Hora</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{appointmentDetails?.start_time} - {appointmentDetails?.end_time}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen del Expediente (solo lectura) */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Resumen del Expediente
          </h3>
          <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <pre className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
{patientSummary || 'Sin información de expediente'}
            </pre>
          </div>
        </div>

        {/* Previous Notes (de la cita) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Notas de la Cita
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="text-zuli-veronica hover:text-zuli-veronica/80 hover:bg-zuli-veronica/10"
            >
              <Edit className="w-4 h-4 mr-1" />
              {isEditing ? 'Guardar' : 'Editar'}
            </Button>
          </div>

          {isEditing ? (
            <Textarea
              value={previousNotes}
              onChange={(e) => setPreviousNotes(e.target.value)}
              className="min-h-[100px] rounded-xl border-gray-200 dark:border-gray-700 focus:border-zuli-veronica focus:ring-zuli-veronica/20"
              placeholder="Agregar notas previas del paciente..."
            />
          ) : (
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                {previousNotes || 'Sin notas previas'}
              </p>
            </div>
          )}
        </div>

        {/* Context Files */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Archivos de Contexto
          </h3>

          <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center hover:border-zuli-veronica/50 hover:bg-zuli-veronica/5 transition-all cursor-pointer group">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gray-100 dark:bg-gray-800 group-hover:bg-zuli-veronica/10 flex items-center justify-center transition-colors">
              <Upload className="h-6 w-6 text-gray-400 group-hover:text-zuli-veronica transition-colors" />
            </div>
            <div>
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-zuli-veronica hover:text-zuli-veronica/80 font-medium">Subir archivos de contexto</span>
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
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              PDF, DOC, JPG, PNG (máx. 10MB)
            </p>
          </div>

          {contextFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {contextFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="w-8 h-8 rounded-lg bg-zuli-veronica/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-zuli-veronica" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 truncate">{file.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Continue Button */}
        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button
            onClick={handleContinue}
            className="btn-zuli-gradient px-8 py-2.5 rounded-xl font-medium group"
          >
            Continuar a Grabación
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 
