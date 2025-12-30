"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useAppUser } from "@/hooks/use-app-user"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  User,
  Calendar,
  FileText,
  Activity,
  Pill,
  Stethoscope,
  TestTube,
  AlertCircle,
  Phone,
  Mail,
  Clock,
  ChevronRight,
  MapPin,
} from "lucide-react"
import { format, differenceInYears } from "date-fns"
import { es } from "date-fns/locale"

interface Patient {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  phone: string | null
  email: string | null
  address: string | null
  allergies: string | null
  medical_history: string | null
  current_medications: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  created_at: string
}

interface TimelineEvent {
  id: string
  type: "appointment" | "report" | "prescription" | "extraction" | "lab_order"
  date: string
  title: string
  subtitle?: string
  status?: string
  data: Record<string, unknown>
}

const eventTypeConfig = {
  appointment: {
    icon: Calendar,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    label: "Cita",
  },
  report: {
    icon: FileText,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    label: "Reporte",
  },
  prescription: {
    icon: Pill,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    label: "Receta",
  },
  extraction: {
    icon: Stethoscope,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    label: "Análisis",
  },
  lab_order: {
    icon: TestTube,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
    label: "Laboratorio",
  },
}

const appointmentStatusConfig: Record<string, { label: string; color: string }> = {
  Programada: { label: "Programada", color: "bg-blue-100 text-blue-700" },
  Completada: { label: "Completada", color: "bg-green-100 text-green-700" },
  Cancelada: { label: "Cancelada", color: "bg-red-100 text-red-700" },
  "No asistió": { label: "No asistió", color: "bg-amber-100 text-amber-700" },
}

// Helper to safely extract string arrays from unknown data
function getStringArray(data: unknown): string[] {
  if (Array.isArray(data) && data.every((item): item is string => typeof item === "string")) {
    return data
  }
  return []
}

// Helper to safely convert unknown to string
function getString(data: unknown): string | null {
  if (typeof data === "string") {
    return data
  }
  return null
}

// Component for extraction details to avoid type issues in JSX
function ExtractionDetails({ symptoms, diagnoses }: { symptoms: string[]; diagnoses: string[] }) {
  if (symptoms.length === 0 && diagnoses.length === 0) {
    return null
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
      <div className="grid gap-2 sm:grid-cols-2">
        {symptoms.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Síntomas</p>
            <div className="flex flex-wrap gap-1">
              {symptoms.slice(0, 3).map((s, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {s}
                </Badge>
              ))}
              {symptoms.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{symptoms.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}
        {diagnoses.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Diagnósticos</p>
            <div className="flex flex-wrap gap-1">
              {diagnoses.slice(0, 3).map((d, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {d}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PatientExpedientePage() {
  const params = useParams()
  const patientId = params.patientId as string
  const { doctorId, loading: userLoading } = useAppUser()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("timeline")

  useEffect(() => {
    async function fetchExpediente() {
      if (!doctorId || !patientId) return

      try {
        // Fetch patient info
        const { data: patientData, error: patientError } = await supabase
          .from("patients")
          .select("*")
          .eq("id", patientId)
          .eq("doctor_id", doctorId)
          .single()

        if (patientError) {
          if (patientError.code === "PGRST116") {
            setError("Paciente no encontrado")
          } else {
            throw patientError
          }
          return
        }

        setPatient(patientData)

        // Fetch all events for timeline
        const events: TimelineEvent[] = []

        // Appointments
        const { data: appointments } = await supabase
          .from("appointments")
          .select("*")
          .eq("patient_id", patientId)

        appointments?.forEach((apt) => {
          events.push({
            id: apt.id,
            type: "appointment",
            date: apt.appointment_date,
            title: `Cita médica`,
            subtitle: `${apt.start_time} - ${apt.end_time}`,
            status: apt.status,
            data: apt,
          })
        })

        // Medical reports
        const { data: reports } = await supabase
          .from("medical_reports")
          .select("*")
          .eq("patient_id", patientId)

        reports?.forEach((report) => {
          events.push({
            id: report.id,
            type: "report",
            date: report.created_at,
            title: report.title || "Reporte médico",
            subtitle: report.report_type,
            data: report,
          })
        })

        // Prescriptions
        const { data: prescriptions } = await supabase
          .from("prescriptions")
          .select("*")
          .eq("patient_id", patientId)

        prescriptions?.forEach((rx) => {
          const meds = (rx.medications as Array<{ brand_name?: string }>) || []
          events.push({
            id: rx.id,
            type: "prescription",
            date: rx.created_at,
            title: "Receta médica",
            subtitle: `${meds.length} medicamento${meds.length !== 1 ? "s" : ""}`,
            status: rx.status,
            data: rx,
          })
        })

        // Clinical extractions
        const { data: extractions } = await supabase
          .from("clinical_extractions")
          .select("*")
          .eq("patient_id", patientId)

        extractions?.forEach((ext) => {
          const symptoms = (ext.symptoms as string[]) || []
          const diagnoses = (ext.diagnoses as string[]) || []
          events.push({
            id: ext.id,
            type: "extraction",
            date: ext.extracted_at,
            title: "Extracción clínica",
            subtitle: `${symptoms.length} síntomas, ${diagnoses.length} diagnósticos`,
            data: ext,
          })
        })

        // Lab orders
        const { data: labOrders } = await supabase
          .from("lab_orders")
          .select("*")
          .eq("patient_id", patientId)

        labOrders?.forEach((lab) => {
          events.push({
            id: lab.id,
            type: "lab_order",
            date: lab.recommended_at,
            title: "Orden de laboratorio",
            status: lab.status,
            data: lab,
          })
        })

        // Sort by date descending
        events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        setTimeline(events)
      } catch (err) {
        console.error("Error fetching expediente:", err)
        setError("Error al cargar el expediente")
      } finally {
        setLoading(false)
      }
    }

    if (doctorId) {
      fetchExpediente()
    } else if (!userLoading) {
      setLoading(false)
    }
  }, [doctorId, patientId, userLoading])

  if (userLoading || loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded animate-shimmer" />
          <div className="h-8 w-48 rounded animate-shimmer" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-32 rounded animate-shimmer" />
          </CardContent>
        </Card>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded animate-shimmer" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!doctorId) {
    return (
      <div className="text-center py-16 animate-fadeIn">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Acceso restringido
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          Esta vista es solo para doctores registrados.
        </p>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center gap-4">
          <Link href="/expedientes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expediente</h1>
        </div>
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400">{error || "Paciente no encontrado"}</p>
            <Link href="/expedientes">
              <Button variant="outline" className="mt-4">
                Volver a expedientes
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const age = differenceInYears(new Date(), new Date(patient.date_of_birth))

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/expedientes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {patient.first_name} {patient.last_name}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Expediente médico
          </p>
        </div>
      </div>

      {/* Patient Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-zuli-veronica/20 to-zuli-indigo/20 flex items-center justify-center shrink-0">
              <User className="h-10 w-10 text-zuli-veronica" />
            </div>

            {/* Info Grid */}
            <div className="flex-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Edad / Género</p>
                <p className="text-gray-900 dark:text-white">{age} años • {patient.gender}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Fecha de nacimiento</p>
                <p className="text-gray-900 dark:text-white">
                  {format(new Date(patient.date_of_birth), "d MMMM yyyy", { locale: es })}
                </p>
              </div>
              {patient.phone && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium mb-1">Teléfono</p>
                  <p className="text-gray-900 dark:text-white flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {patient.phone}
                  </p>
                </div>
              )}
              {patient.email && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium mb-1">Email</p>
                  <p className="text-gray-900 dark:text-white flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    {patient.email}
                  </p>
                </div>
              )}
              {patient.address && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500 uppercase font-medium mb-1">Dirección</p>
                  <p className="text-gray-900 dark:text-white flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {patient.address}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Medical Info */}
          {(patient.allergies || patient.medical_history || patient.current_medications) && (
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 grid gap-4 sm:grid-cols-3">
              {patient.allergies && (
                <div>
                  <p className="text-xs text-red-500 uppercase font-medium mb-1">Alergias</p>
                  <p className="text-gray-900 dark:text-white text-sm">{patient.allergies}</p>
                </div>
              )}
              {patient.medical_history && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium mb-1">Antecedentes</p>
                  <p className="text-gray-900 dark:text-white text-sm">{patient.medical_history}</p>
                </div>
              )}
              {patient.current_medications && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium mb-1">Medicamentos actuales</p>
                  <p className="text-gray-900 dark:text-white text-sm">{patient.current_medications}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="timeline">
            <Activity className="h-4 w-4 mr-2" />
            Línea de tiempo
          </TabsTrigger>
          <TabsTrigger value="appointments">
            <Calendar className="h-4 w-4 mr-2" />
            Citas
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="h-4 w-4 mr-2" />
            Reportes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          {timeline.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Activity className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Sin registros
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  Este paciente aún no tiene eventos registrados en su expediente.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

              <div className="space-y-4">
                {timeline.map((event, index) => {
                  const config = eventTypeConfig[event.type]
                  const Icon = config.icon

                  return (
                    <div key={event.id} className="relative pl-16">
                      {/* Timeline dot */}
                      <div
                        className={`absolute left-4 w-5 h-5 rounded-full ${config.bgColor} flex items-center justify-center ring-4 ring-white dark:ring-gray-900`}
                      >
                        <Icon className={`h-3 w-3 ${config.color}`} />
                      </div>

                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className={`${config.bgColor} ${config.color} text-xs`}>
                                  {config.label}
                                </Badge>
                                {event.status && appointmentStatusConfig[event.status] && (
                                  <Badge className={`${appointmentStatusConfig[event.status].color} text-xs`}>
                                    {appointmentStatusConfig[event.status].label}
                                  </Badge>
                                )}
                              </div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {event.title}
                              </h4>
                              {event.subtitle && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {event.subtitle}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">
                                {format(new Date(event.date), "d MMM yyyy", { locale: es })}
                              </p>
                              <p className="text-xs text-gray-400">
                                {format(new Date(event.date), "HH:mm")}
                              </p>
                            </div>
                          </div>

                          {/* Event details - Extraction */}
                          {event.type === "extraction" && (
                            <ExtractionDetails
                              symptoms={getStringArray(event.data.symptoms)}
                              diagnoses={getStringArray(event.data.diagnoses)}
                            />
                          )}

                          {/* Event details - Appointment diagnosis */}
                          {event.type === "appointment" && getString(event.data.diagnosis) && (
                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                              <p className="text-xs text-gray-500 mb-1">Diagnóstico</p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {getString(event.data.diagnosis)}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="appointments" className="mt-4">
          {timeline.filter((e) => e.type === "appointment").length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay citas registradas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {timeline
                .filter((e) => e.type === "appointment")
                .map((event) => (
                  <Card key={event.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {event.status && appointmentStatusConfig[event.status] && (
                              <Badge className={`${appointmentStatusConfig[event.status].color}`}>
                                {appointmentStatusConfig[event.status].label}
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {format(new Date(event.date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                          </p>
                          <p className="text-sm text-gray-500">{event.subtitle}</p>
                        </div>
                        <Link href={`/consultas/${event.id}`}>
                          <Button variant="ghost" size="sm">
                            Ver detalles
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          {timeline.filter((e) => e.type === "report").length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <FileText className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay reportes registrados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {timeline
                .filter((e) => e.type === "report")
                .map((event) => (
                  <Card key={event.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{event.title}</p>
                          <p className="text-sm text-gray-500">{event.subtitle}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {format(new Date(event.date), "d MMM yyyy, HH:mm", { locale: es })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
