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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
  ChevronDown,
  MapPin,
  ClipboardList,
  FlaskConical,
  Heart,
  Droplets,
  Scale,
  Ruler,
  Cigarette,
  Wine,
  Dumbbell,
  Moon,
  Download,
  ExternalLink,
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

interface BaselineForm {
  id: string
  patient_id: string
  general_info: Record<string, unknown> | null
  vitals: Record<string, unknown> | null
  lifestyle: Record<string, unknown> | null
  conditions: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

interface SpecialtyResponse {
  id: string
  specialty_id: string
  specialty_name: string
  question_text: string
  answer: string
  created_at: string
}

interface LabOrder {
  id: string
  recommended_tests: {
    tests: string[]
    lab_provider?: string
    lab_branch?: string
  }
  status: string
  recommended_at: string
  lab_results: LabResult[]
}

interface LabResult {
  id: string
  storage_path: string
  uploaded_at: string
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

// Helper para formatear valores de campos incluyendo objetos y arrays
const formatFieldValue = (value: unknown): string => {
  if (value === null || value === undefined) return "No especificado"
  if (typeof value === "boolean") return value ? "Sí" : "No"
  if (typeof value === "string") return value || "No especificado"
  if (typeof value === "number") return String(value)
  if (Array.isArray(value)) {
    if (value.length === 0) return "Ninguno"
    return value.map(item => {
      if (typeof item === "object" && item !== null) {
        return Object.entries(item)
          .filter(([k]) => k !== "id")
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")
      }
      return String(item)
    }).join(" | ")
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ")
  }
  return String(value)
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
  const [baselineForm, setBaselineForm] = useState<BaselineForm | null>(null)
  const [specialtyResponses, setSpecialtyResponses] = useState<SpecialtyResponse[]>([])
  const [labOrders, setLabOrders] = useState<LabOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("timeline")
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set())

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

        // Fetch baseline form via patient's user_id
        if (patientData.user_id) {
          const { data: baselineData } = await supabase
            .from("patient_baseline_forms")
            .select("*")
            .eq("patient_user_id", patientData.user_id)
            .maybeSingle()

          if (baselineData) {
            setBaselineForm(baselineData as BaselineForm)
          }
        }

        // Fetch specialty responses - check both patient_id and patient_user_id
        let responsesData = null

        // First try by patient_id
        const { data: responsesByPatientId } = await supabase
          .from("specialist_responses")
          .select(`
            id,
            answer,
            submitted_at,
            specialist_questions(id, prompt, specialty_id, specialties(id, name))
          `)
          .eq("patient_id", patientId)
          .order("submitted_at", { ascending: false })

        // If no results and patient has user_id, try by patient_user_id
        if ((!responsesByPatientId || responsesByPatientId.length === 0) && patientData.user_id) {
          const { data: responsesByUserId } = await supabase
            .from("specialist_responses")
            .select(`
              id,
              answer,
              submitted_at,
              specialist_questions(id, prompt, specialty_id, specialties(id, name))
            `)
            .eq("patient_user_id", patientData.user_id)
            .order("submitted_at", { ascending: false })
          responsesData = responsesByUserId
        } else {
          responsesData = responsesByPatientId
        }

        if (responsesData) {
          const mappedResponses: SpecialtyResponse[] = responsesData.map((r: any) => {
            // Extract the answer value - it could be { value: ... } or a direct value
            let answerText = ""
            if (r.answer) {
              if (typeof r.answer === "object" && "value" in r.answer) {
                const val = r.answer.value
                if (Array.isArray(val)) {
                  answerText = val.join(", ")
                } else {
                  answerText = typeof val === "boolean" ? (val ? "Sí" : "No") : String(val ?? "")
                }
              } else {
                answerText = String(r.answer)
              }
            }

            return {
              id: r.id,
              specialty_id: r.specialist_questions?.specialty_id ?? "",
              specialty_name: r.specialist_questions?.specialties?.name ?? "Especialidad",
              question_text: r.specialist_questions?.prompt ?? "",
              answer: answerText,
              created_at: r.submitted_at,
            }
          })

          // Deduplicar por specialty_id + question_text (mantener solo la más reciente)
          // Ya están ordenados por submitted_at DESC, así que el primero es el más reciente
          const uniqueMap = new Map<string, SpecialtyResponse>()
          mappedResponses.forEach((response) => {
            const key = `${response.specialty_id}-${response.question_text}`
            if (!uniqueMap.has(key)) {
              uniqueMap.set(key, response)
            }
          })
          const deduplicatedResponses = Array.from(uniqueMap.values())
          setSpecialtyResponses(deduplicatedResponses)
        }

        // Fetch lab orders with results - check both patient_id and patient_user_id
        let labOrdersData = null

        const { data: labOrdersByPatientId } = await supabase
          .from("lab_orders")
          .select(`
            id,
            recommended_tests,
            status,
            recommended_at,
            lab_results(id, storage_path, uploaded_at)
          `)
          .eq("patient_id", patientId)
          .order("recommended_at", { ascending: false })

        if ((!labOrdersByPatientId || labOrdersByPatientId.length === 0) && patientData.user_id) {
          const { data: labOrdersByUserId } = await supabase
            .from("lab_orders")
            .select(`
              id,
              recommended_tests,
              status,
              recommended_at,
              lab_results(id, storage_path, uploaded_at)
            `)
            .eq("patient_user_id", patientData.user_id)
            .order("recommended_at", { ascending: false })
          labOrdersData = labOrdersByUserId
        } else {
          labOrdersData = labOrdersByPatientId
        }

        if (labOrdersData) {
          setLabOrders(labOrdersData as LabOrder[])
        }
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="timeline" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Línea de tiempo</span>
            <span className="sm:hidden">Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="baseline" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Cuestionario Base</span>
            <span className="sm:hidden">Base</span>
          </TabsTrigger>
          <TabsTrigger value="specialty" className="gap-2">
            <Stethoscope className="h-4 w-4" />
            <span className="hidden sm:inline">Especialidad</span>
            <span className="sm:hidden">Esp.</span>
          </TabsTrigger>
          <TabsTrigger value="labs" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            <span className="hidden sm:inline">Laboratorios</span>
            <span className="sm:hidden">Labs</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Reportes</span>
            <span className="sm:hidden">Rep.</span>
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

        {/* Cuestionario Base Tab */}
        <TabsContent value="baseline" className="mt-4">
          {!baselineForm ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <ClipboardList className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">El paciente no ha completado el cuestionario base</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Información General */}
              {baselineForm.general_info && Object.keys(baselineForm.general_info).length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <CardTitle className="text-base">Información General</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(baselineForm.general_info).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-500 capitalize">{key.replace(/_/g, " ")}</span>
                        <span className="text-gray-900 dark:text-white text-right max-w-[60%]">{formatFieldValue(value)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Signos Vitales */}
              {baselineForm.vitals && Object.keys(baselineForm.vitals).length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Heart className="h-5 w-5 text-red-600" />
                      </div>
                      <CardTitle className="text-base">Signos Vitales</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    {Boolean((baselineForm.vitals as Record<string, unknown>).weight) && (
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {String((baselineForm.vitals as Record<string, unknown>).weight)} kg
                        </span>
                      </div>
                    )}
                    {Boolean((baselineForm.vitals as Record<string, unknown>).height) && (
                      <div className="flex items-center gap-2">
                        <Ruler className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {String((baselineForm.vitals as Record<string, unknown>).height)} cm
                        </span>
                      </div>
                    )}
                    {Boolean((baselineForm.vitals as Record<string, unknown>).blood_type) && (
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          Tipo: {String((baselineForm.vitals as Record<string, unknown>).blood_type)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Estilo de Vida */}
              {baselineForm.lifestyle && Object.keys(baselineForm.lifestyle).length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Dumbbell className="h-5 w-5 text-green-600" />
                      </div>
                      <CardTitle className="text-base">Estilo de Vida</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(baselineForm.lifestyle as Record<string, unknown>).smoking !== undefined && (
                      <div className="flex items-center gap-2">
                        <Cigarette className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          Fuma: {String((baselineForm.lifestyle as Record<string, unknown>).smoking)}
                        </span>
                      </div>
                    )}
                    {(baselineForm.lifestyle as Record<string, unknown>).alcohol !== undefined && (
                      <div className="flex items-center gap-2">
                        <Wine className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          Alcohol: {String((baselineForm.lifestyle as Record<string, unknown>).alcohol)}
                        </span>
                      </div>
                    )}
                    {Boolean((baselineForm.lifestyle as Record<string, unknown>).exercise) && (
                      <div className="flex items-center gap-2">
                        <Dumbbell className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          Ejercicio: {String((baselineForm.lifestyle as Record<string, unknown>).exercise)}
                        </span>
                      </div>
                    )}
                    {Boolean((baselineForm.lifestyle as Record<string, unknown>).diet) && (
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          Dieta: {String((baselineForm.lifestyle as Record<string, unknown>).diet)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Condiciones */}
              {baselineForm.conditions && Object.keys(baselineForm.conditions).length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                      </div>
                      <CardTitle className="text-base">Condiciones Médicas</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(baselineForm.conditions).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-500 capitalize">{key.replace(/_/g, " ")}</span>
                        <span className="text-gray-900 dark:text-white text-right max-w-[60%]">{formatFieldValue(value)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Cuestionario de Especialidad Tab */}
        <TabsContent value="specialty" className="mt-4">
          {specialtyResponses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Stethoscope className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay cuestionarios de especialidad completados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Agrupar por especialidad */}
              {Object.entries(
                specialtyResponses.reduce((acc, resp) => {
                  const key = resp.specialty_name
                  if (!acc[key]) acc[key] = []
                  acc[key].push(resp)
                  return acc
                }, {} as Record<string, SpecialtyResponse[]>)
              ).map(([specialty, responses]) => (
                <Card key={specialty}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-zuli-veronica/10 rounded-lg">
                        <Stethoscope className="h-5 w-5 text-zuli-veronica" />
                      </div>
                      <CardTitle className="text-base">{specialty}</CardTitle>
                      <Badge variant="secondary" className="ml-auto">
                        {responses.length} respuesta{responses.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {responses.map((resp) => (
                      <div key={resp.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0 pb-3 last:pb-0">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {resp.question_text}
                        </p>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">
                          {resp.answer}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(resp.created_at), "d MMM yyyy", { locale: es })}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Laboratorios Tab */}
        <TabsContent value="labs" className="mt-4">
          {labOrders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <FlaskConical className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay órdenes de laboratorio</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {labOrders.map((order) => {
                const labStatusConfig: Record<string, { label: string; className: string }> = {
                  pending_upload: { label: "Pendiente de subir", className: "bg-amber-100 text-amber-700" },
                  awaiting_review: { label: "Esperando revisión", className: "bg-blue-100 text-blue-700" },
                  reviewed: { label: "Revisado", className: "bg-green-100 text-green-700" },
                }
                const statusInfo = labStatusConfig[order.status] || { label: order.status, className: "bg-gray-100 text-gray-700" }

                return (
                  <Card key={order.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-cyan-100 rounded-lg">
                            <TestTube className="h-5 w-5 text-cyan-600" />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {order.recommended_tests?.lab_provider || "Laboratorio"}
                            </CardTitle>
                            <p className="text-xs text-gray-500">
                              {format(new Date(order.recommended_at), "d MMM yyyy", { locale: es })}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className={statusInfo.className}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Tests list */}
                      {order.recommended_tests?.tests && order.recommended_tests.tests.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 uppercase font-medium mb-2">Estudios solicitados</p>
                          <div className="flex flex-wrap gap-1">
                            {order.recommended_tests.tests.map((test, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {test}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Lab results */}
                      {order.lab_results && order.lab_results.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium mb-2">Resultados</p>
                          <div className="space-y-2">
                            {order.lab_results.map((result) => (
                              <div
                                key={result.id}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <FileText className="h-4 w-4 text-gray-400" />
                                  <div>
                                    <p className="text-sm text-gray-900 dark:text-white">
                                      Resultado de laboratorio
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {format(new Date(result.uploaded_at), "d MMM yyyy, HH:mm", { locale: es })}
                                    </p>
                                  </div>
                                </div>
                                <span className="flex items-center gap-1 text-sm text-gray-400">
                                  <ExternalLink className="h-4 w-4" />
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Reportes Tab */}
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
                .map((event) => {
                  const isExpanded = expandedReports.has(event.id)
                  const reportData = event.data as {
                    content?: string
                    structured_data?: Record<string, unknown>
                    report_type?: string
                    medicamentos?: Array<{ brand_name?: string; dose?: string; frequency?: string }>
                  }

                  const toggleExpand = () => {
                    setExpandedReports((prev) => {
                      const next = new Set(prev)
                      if (next.has(event.id)) {
                        next.delete(event.id)
                      } else {
                        next.add(event.id)
                      }
                      return next
                    })
                  }

                  return (
                    <Collapsible key={event.id} open={isExpanded} onOpenChange={toggleExpand}>
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardContent className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                  <FileText className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{event.title}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="text-xs">
                                      {reportData.report_type || event.subtitle}
                                    </Badge>
                                    <span className="text-xs text-gray-400">
                                      {format(new Date(event.date), "d MMM yyyy, HH:mm", { locale: es })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <ChevronDown
                                className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </CardContent>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0 pb-4 px-4 border-t border-gray-100 dark:border-gray-800">
                            <div className="mt-4 space-y-4">
                              {/* Report content */}
                              {reportData.content && (
                                <div>
                                  <p className="text-xs text-gray-500 uppercase font-medium mb-2">Contenido del reporte</p>
                                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 prose prose-sm dark:prose-invert max-w-none">
                                    <div
                                      className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                                      dangerouslySetInnerHTML={{
                                        __html: reportData.content
                                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                                          .replace(/\n/g, "<br />"),
                                      }}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Medications if available */}
                              {reportData.medicamentos && reportData.medicamentos.length > 0 && (
                                <div>
                                  <p className="text-xs text-gray-500 uppercase font-medium mb-2">Medicamentos</p>
                                  <div className="grid gap-2">
                                    {reportData.medicamentos.map((med, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg"
                                      >
                                        <Pill className="h-4 w-4 text-purple-600" />
                                        <span className="text-sm text-gray-900 dark:text-white">
                                          {med.brand_name || "Medicamento"}
                                          {med.dose && ` - ${med.dose}`}
                                          {med.frequency && ` (${med.frequency})`}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Structured data summary if no content */}
                              {!reportData.content && reportData.structured_data && (
                                <div>
                                  <p className="text-xs text-gray-500 uppercase font-medium mb-2">Datos del reporte</p>
                                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      Reporte estructurado disponible
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* No content available */}
                              {!reportData.content && !reportData.structured_data && (
                                <div className="text-center py-4">
                                  <p className="text-sm text-gray-400">
                                    No hay contenido detallado disponible para este reporte
                                  </p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  )
                })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
