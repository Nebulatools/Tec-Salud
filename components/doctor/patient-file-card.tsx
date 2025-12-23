// Tarjeta de ficha completa del paciente para vista de especialista
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  User,
  Heart,
  Activity,
  Pill,
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  AlertTriangle,
  Download,
} from "lucide-react"
import { ReportDetailModal } from "./report-detail-modal"

type PatientFileCardProps = {
  patientUserId: string
  patientName: string
  patientEmail: string
  doctorId: string
  specialtyId?: string | null
  specialtyName?: string | null
}

type BaselineData = {
  general_info: {
    blood_type?: string
    allergies?: string
  }
  vitals: {
    height_cm?: string
    weight_kg?: string
  }
  lifestyle: {
    notes?: string
  }
  conditions: {
    chronic_conditions?: string
    medications?: string
    surgeries?: string
  }
}

type SpecialtyResponse = {
  prompt: string
  answer: any
}

type LabResult = {
  id: string
  storage_path: string
  uploaded_at: string
  mime_type: string
}

type LabOrder = {
  id: string
  status: string
  recommended_tests: any
  lab_results: LabResult[]
}

type InternRun = {
  id: string
  status: string
  summary: string | null
  suggestions: string[] | null
  completed_at: string | null
}

type MedicalReport = {
  id: string
  title: string | null
  report_type: string | null
  compliance_status: string | null
  created_at: string
  content: string | null
  ai_suggestions: string[] | null
  original_transcript: string | null
  appointment_id: string | null
}

export function PatientFileCard({
  patientUserId,
  patientName,
  patientEmail,
  doctorId,
  specialtyId,
  specialtyName,
}: PatientFileCardProps) {
  const [loading, setLoading] = useState(true)
  const [baseline, setBaseline] = useState<BaselineData | null>(null)
  const [responses, setResponses] = useState<SpecialtyResponse[]>([])
  const [labOrder, setLabOrder] = useState<LabOrder | null>(null)
  const [internRun, setInternRun] = useState<InternRun | null>(null)
  const [reports, setReports] = useState<MedicalReport[]>([])
  const [selectedReport, setSelectedReport] = useState<MedicalReport | null>(null)
  const [runningIntern, setRunningIntern] = useState(false)
  const [internStatus, setInternStatus] = useState<string | null>(null)
  const [internError, setInternError] = useState<string | null>(null)

  useEffect(() => {
    loadPatientData()
  }, [patientUserId, specialtyId])

  const loadPatientData = async () => {
    setLoading(true)

    // Cargar datos en paralelo
    const [baselineRes, responsesRes, labOrderRes] = await Promise.all([
      supabase
        .from("patient_baseline_forms")
        .select("general_info, vitals, lifestyle, conditions")
        .eq("patient_user_id", patientUserId)
        .maybeSingle(),
      specialtyId
        ? supabase
            .from("specialist_responses")
            .select("answer, specialist_questions(prompt)")
            .eq("patient_user_id", patientUserId)
            .eq("specialty_id", specialtyId)
        : Promise.resolve({ data: null }),
      supabase
        .from("lab_orders")
        .select("id, status, recommended_tests, lab_results(id, storage_path, uploaded_at, mime_type)")
        .eq("patient_user_id", patientUserId)
        .eq("doctor_id", doctorId)
        .order("recommended_at", { ascending: false })
        .limit(1),
    ])

    setBaseline(baselineRes.data as BaselineData | null)

    // Mapear respuestas de especialidad
    const seen = new Set<string>()
    const mappedResponses =
      (responsesRes.data as any)
        ?.map((r: any) => ({
          prompt: r.specialist_questions?.prompt ?? "Pregunta",
          answer: r.answer?.value ?? r.answer,
        }))
        .filter((r: any) => {
          const key = (r.prompt ?? "").toLowerCase()
          if (seen.has(key)) return false
          seen.add(key)
          return true
        }) ?? []
    setResponses(mappedResponses)

    // Cargar reportes médicos del paciente
    // Primero obtener el patient_id desde la tabla patients
    const { data: patientRow } = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", patientUserId)
      .maybeSingle()

    if (patientRow?.id) {
      const { data: reportsData } = await supabase
        .from("medical_reports")
        .select("id, title, report_type, compliance_status, created_at, content, ai_suggestions, original_transcript, appointment_id")
        .eq("patient_id", patientRow.id)
        .order("created_at", { ascending: false })

      setReports(reportsData ?? [])
    } else {
      setReports([])
    }

    // Lab order
    const order = labOrderRes.data?.[0]
    if (order) {
      setLabOrder({
        id: order.id,
        status: order.status,
        recommended_tests: order.recommended_tests,
        lab_results: (order as any).lab_results ?? [],
      })
      // cargar último virtual_intern_runs para esta orden/paciente
      const { data: runs } = await supabase
        .from("virtual_intern_runs")
        .select("id, status, summary, suggestions, completed_at")
        .eq("lab_order_id", order.id)
        .eq("patient_user_id", patientUserId)
        .order("completed_at", { ascending: false })
        .limit(1)
      if (runs && runs.length > 0) {
        setInternRun(runs[0] as InternRun)
      } else {
        setInternRun(null)
      }
    } else {
      setLabOrder(null)
      setInternRun(null)
    }

    setLoading(false)
  }

  const hasBaseline = baseline && Object.keys(baseline).some(k => {
    const section = (baseline as any)[k]
    return section && Object.values(section).some(v => v && String(v).trim())
  })

  const hasResponses = responses.length > 0
  const hasLabResults = labOrder && labOrder.lab_results.length > 0

  const canRunVirtualIntern = hasBaseline && hasResponses && hasLabResults

  const handleVirtualIntern = async () => {
    if (!labOrder) return
    setRunningIntern(true)
    setInternStatus(null)
    setInternError(null)

    const res = await fetch("/api/virtual-intern", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lab_order_id: labOrder.id,
        patient_user_id: patientUserId,
        specialty_id: specialtyId,
      }),
    })

    if (!res.ok) {
      const body = await res.json()
      setInternError(body.error ?? "No se pudo ejecutar el pasante virtual")
    } else {
      setInternStatus("Pasante virtual ejecutado exitosamente")
      // refrescar última ejecución
      await loadPatientData()
    }
    setRunningIntern(false)
  }

  const downloadLabResult = async (path: string) => {
    const { data } = await supabase.storage.from("lab-results").createSignedUrl(path, 3600)
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank")
    }
  }

  const formatAnswer = (answer: any): string => {
    if (typeof answer === "boolean") return answer ? "Sí" : "No"
    if (typeof answer === "string") return answer || "—"
    if (Array.isArray(answer)) return answer.join(", ") || "—"
    return JSON.stringify(answer) || "—"
  }

  if (loading) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Cargando ficha del paciente...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header del paciente */}
      <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-orange-500 text-white flex items-center justify-center text-xl font-bold">
                {patientName?.[0]?.toUpperCase() ?? "P"}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{patientName}</h2>
                <p className="text-sm text-gray-600">{patientEmail}</p>
                {specialtyName && (
                  <Badge variant="secondary" className="mt-1">
                    {specialtyName}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge completed={!!hasBaseline} label="Base" />
              <StatusBadge completed={!!hasResponses} label="Especialidad" />
              <StatusBadge completed={!!hasLabResults} label="Pruebas" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cuestionario Base */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-base">Cuestionario Base</CardTitle>
            {hasBaseline ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-300 ml-auto" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!hasBaseline ? (
            <p className="text-sm text-gray-500 italic">El paciente aún no ha completado el cuestionario base.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Info General */}
              {baseline?.general_info && (
                <InfoSection
                  icon={<Heart className="h-4 w-4 text-red-500" />}
                  title="Información General"
                  items={[
                    { label: "Tipo de sangre", value: baseline.general_info.blood_type },
                    { label: "Alergias", value: baseline.general_info.allergies },
                  ]}
                />
              )}

              {/* Signos Vitales */}
              {baseline?.vitals && (
                <InfoSection
                  icon={<Activity className="h-4 w-4 text-blue-500" />}
                  title="Signos Vitales"
                  items={[
                    { label: "Estatura", value: baseline.vitals.height_cm ? `${baseline.vitals.height_cm} cm` : undefined },
                    { label: "Peso", value: baseline.vitals.weight_kg ? `${baseline.vitals.weight_kg} kg` : undefined },
                  ]}
                />
              )}

              {/* Condiciones */}
              {baseline?.conditions && (
                <InfoSection
                  icon={<Pill className="h-4 w-4 text-purple-500" />}
                  title="Condiciones Médicas"
                  items={[
                    { label: "Condiciones crónicas", value: baseline.conditions.chronic_conditions },
                    { label: "Medicamentos", value: baseline.conditions.medications },
                    { label: "Cirugías", value: baseline.conditions.surgeries },
                  ]}
                />
              )}

              {/* Estilo de vida */}
              {baseline?.lifestyle?.notes && (
                <InfoSection
                  icon={<FileText className="h-4 w-4 text-green-500" />}
                  title="Estilo de Vida"
                  items={[{ label: "Notas", value: baseline.lifestyle.notes }]}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cuestionario de Especialidad */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-base">Cuestionario de Especialidad</CardTitle>
            {hasResponses ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-300 ml-auto" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!hasResponses ? (
            <p className="text-sm text-gray-500 italic">
              El paciente aún no ha completado el cuestionario de {specialtyName ?? "especialidad"}.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {responses.map((r, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3 border">
                  <p className="text-sm font-medium text-gray-700">{r.prompt}</p>
                  <p className="text-sm text-gray-900 mt-1">{formatAnswer(r.answer)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reportes de Consulta */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-base">Reportes de Consulta</CardTitle>
            {reports.length > 0 ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-300 ml-auto" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Sin reportes de consulta guardados.</p>
          ) : (
            <div className="space-y-2">
              {reports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700">
                    Consulta - {new Date(report.created_at).toLocaleDateString("es-MX")}
                  </span>
                  <Badge variant={report.report_type === "FINAL" ? "default" : "secondary"} className="text-xs">
                    {report.report_type || "BORRADOR"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalle de reporte */}
      <ReportDetailModal
        report={selectedReport}
        open={!!selectedReport}
        onClose={() => setSelectedReport(null)}
      />

      {/* Pruebas y Resultados */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-base">Pruebas de Laboratorio</CardTitle>
            {hasLabResults ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-300 ml-auto" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!labOrder ? (
            <p className="text-sm text-gray-500 italic">No hay órdenes de laboratorio para este paciente.</p>
          ) : (
            <div className="space-y-4">
              {/* Pruebas recomendadas */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Pruebas recomendadas:</p>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const tests = Array.isArray(labOrder.recommended_tests)
                      ? labOrder.recommended_tests
                      : labOrder.recommended_tests?.tests ?? []
                    return tests.length > 0 ? (
                      tests.map((t: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {t}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">Sin pruebas especificadas</span>
                    )
                  })()}
                </div>
              </div>

              {/* Resultados subidos */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Resultados subidos:</p>
                {labOrder.lab_results.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                    <Clock className="h-4 w-4" />
                    Pendiente de carga por el paciente
                  </div>
                ) : (
                  <div className="space-y-2">
                    {labOrder.lab_results.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-200"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-gray-700">
                            {result.storage_path.split("/").pop()}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {result.mime_type.split("/")[1]?.toUpperCase() ?? "FILE"}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadLabResult(result.storage_path)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pasante Virtual */}
      <Card className={canRunVirtualIntern ? "border-orange-200 bg-orange-50/30" : "border-gray-200 bg-gray-50"}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${canRunVirtualIntern ? "bg-orange-100" : "bg-gray-100"}`}>
                <Sparkles className={`h-5 w-5 ${canRunVirtualIntern ? "text-orange-500" : "text-gray-400"}`} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Pasante Virtual</p>
                <p className="text-sm text-gray-500">
                  {canRunVirtualIntern
                    ? "Todos los requisitos completados"
                    : "Requiere: cuestionario base, especialidad y pruebas"}
                </p>
              </div>
            </div>
            <Button
              onClick={handleVirtualIntern}
              disabled={!canRunVirtualIntern || runningIntern}
              className={canRunVirtualIntern ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
            {runningIntern ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Ejecutando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Ejecutar
              </>
            )}
          </Button>
        </div>

        {!canRunVirtualIntern && (
          <div className="mt-3 flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Requisitos pendientes:</p>
              <ul className="mt-1 space-y-1">
                {!hasBaseline && <li>• Cuestionario base del paciente</li>}
                {!hasResponses && <li>• Cuestionario de especialidad</li>}
                {!hasLabResults && <li>• Resultados de laboratorio</li>}
              </ul>
            </div>
          </div>
        )}

        {internRun && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold text-gray-800">Última ejecución</p>
            <div className="bg-white rounded-lg border p-3 space-y-2">
              <p className="text-xs text-gray-500">
                Estado: {internRun.status} • {internRun.completed_at ? new Date(internRun.completed_at).toLocaleString() : "N/D"}
              </p>
              {internRun.summary && (
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{internRun.summary}</p>
              )}
              {internRun.suggestions && internRun.suggestions.length > 0 && (
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  {internRun.suggestions.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {internError && (
          <Alert variant="destructive" className="mt-3">
            <AlertDescription>{internError}</AlertDescription>
          </Alert>
        )}

          {internStatus && (
            <Alert className="mt-3 bg-green-50 border-green-200 text-green-700">
              <AlertDescription>{internStatus}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Componente auxiliar para badges de estado
function StatusBadge({ completed, label }: { completed: boolean; label: string }) {
  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
        completed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {completed ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </div>
  )
}

// Componente auxiliar para secciones de información
function InfoSection({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode
  title: string
  items: { label: string; value?: string | string[] | number }[]
}) {
  // Helper to safely convert value to displayable string
  const getDisplayValue = (value: string | string[] | number | undefined): string => {
    if (value === undefined || value === null) return ""
    if (Array.isArray(value)) return value.filter(Boolean).join(", ")
    return String(value)
  }

  const hasContent = items.some((item) => {
    const displayValue = getDisplayValue(item.value)
    return displayValue.trim().length > 0
  })
  if (!hasContent) return null

  return (
    <div className="bg-gray-50 rounded-lg p-3 border">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-semibold text-gray-700">{title}</span>
      </div>
      <div className="space-y-1">
        {items.map((item, idx) => {
          const displayValue = getDisplayValue(item.value)
          if (!displayValue.trim()) return null
          return (
            <div key={idx} className="text-sm">
              <span className="text-gray-500">{item.label}:</span>{" "}
              <span className="text-gray-900">{displayValue}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
