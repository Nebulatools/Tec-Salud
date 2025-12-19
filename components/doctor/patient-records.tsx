// Expedientes consolidados para cada paciente ligado al doctor
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Stethoscope, FileText, User } from "lucide-react"

type LinkedPatient = {
  id: string
  patientId?: string | null
  name: string
  email: string
  status: string
}

type BaselineData = {
  general_info?: any
  vitals?: any
  lifestyle?: any
  conditions?: any
}

type SpecialtySummary = {
  specialty_id: string
  specialty_name: string
  responses: number
}

type PatientRecord = {
  patient: LinkedPatient
  baseline?: BaselineData
  specialties: SpecialtySummary[]
  reports: ReportSummary[]
}

type ReportSummary = {
  id: string
  patient_id: string
  title: string | null
  report_type: string | null
  compliance_status: string | null
  created_at: string
  content: string | null
  appointment_id: string | null
}

export function PatientRecords({ doctorId }: { doctorId: string }) {
  const [records, setRecords] = useState<PatientRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (doctorId) {
      load()
    }
  }, [doctorId])

  const load = async () => {
    setLoading(true)
    const { data: links } = await supabase
      .from("doctor_patient_links")
      .select("patient_user_id, patient_id, status")
      .eq("doctor_id", doctorId)
      .eq("status", "accepted")

    const patientUserIds = (links ?? []).map((l) => l.patient_user_id).filter(Boolean)
    const { data: profiles } = await supabase
      .from("app_users")
      .select("id, full_name, email")
      .in("id", patientUserIds)

    const profileMap = new Map<string, any>()
    profiles?.forEach((p: any) => profileMap.set(p.id, p))

    // Mapear patient_user_id -> patient_id desde tabla patients si falta en el link
    const missingPatientIds = (links ?? []).filter((l) => !l.patient_id).map((l) => l.patient_user_id)
    let patientIdMap = new Map<string, string>()
    if (missingPatientIds.length > 0) {
      const { data: patientRows } = await supabase
        .from("patients")
        .select("id, user_id")
        .in("user_id", missingPatientIds)
      patientRows?.forEach((p: any) => {
        if (p.user_id) patientIdMap.set(p.user_id, p.id)
      })
    }

    const patients: LinkedPatient[] =
      links?.map((l: any) => {
        const profile = profileMap.get(l.patient_user_id)
        return {
          id: l.patient_user_id,
          patientId: l.patient_id ?? patientIdMap.get(l.patient_user_id) ?? null,
          name: profile?.full_name ?? "Paciente",
          email: profile?.email ?? "",
          status: l.status ?? "pending",
        }
      }) ?? []

    const idsForQueries = patients.map((p) => p.id)
    if (idsForQueries.length === 0) {
      setRecords([])
      setLoading(false)
      return
    }

    const { data: baselines } = await supabase
      .from("patient_baseline_forms")
      .select("patient_user_id, general_info, vitals, lifestyle, conditions")
      .in("patient_user_id", idsForQueries)

    const baselineMap = new Map<string, BaselineData>()
    baselines?.forEach((b) => baselineMap.set(b.patient_user_id, b))

    const { data: responses } = await supabase
      .from("specialist_responses")
      .select("patient_user_id, specialty_id, specialties(name)")
      .eq("doctor_id", doctorId)
      .in("patient_user_id", idsForQueries)

    type SpecAgg = { name: string; count: number }
    const grouped: Record<string, Record<string, SpecAgg>> = {}
    responses?.forEach((r: any) => {
      const patientId: string = r.patient_user_id
      const specId: string = r.specialty_id
      const specName: string = r.specialties?.name ?? "Especialidad"
      grouped[patientId] = grouped[patientId] || {}
      grouped[patientId][specId] = grouped[patientId][specId] || { name: specName, count: 0 }
      grouped[patientId][specId].count += 1
    })

    // Traer reportes por patient_id (tabla patients)
    const patientIdsForReports = patients.map((p) => p.patientId).filter(Boolean) as string[]
    let reportMap = new Map<string, ReportSummary[]>()
    if (patientIdsForReports.length > 0) {
      const { data: reports } = await supabase
        .from("medical_reports")
        .select("id, patient_id, title, report_type, compliance_status, created_at, content, appointment_id")
        .in("patient_id", patientIdsForReports)
        .order("created_at", { ascending: false })

      reports?.forEach((r: any) => {
        const pid = r.patient_id
        if (!reportMap.has(pid)) reportMap.set(pid, [])
        reportMap.get(pid)!.push(r)
      })
    }

    const recs: PatientRecord[] = patients.map((p) => {
      const specEntries = Object.entries(grouped[p.id] || {}).map(([id, data]) => ({
        specialty_id: id,
        specialty_name: data.name,
        responses: data.count,
      }))
      return {
        patient: p,
        baseline: baselineMap.get(p.id),
        specialties: specEntries,
        reports: p.patientId ? (reportMap.get(p.patientId) ?? []) : [],
      }
    })

    setRecords(recs)
    setSelectedId((prev) => prev ?? recs[0]?.patient.id ?? null)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
      </div>
    )
  }

  if (records.length === 0) {
    return <p className="text-sm text-gray-600">No hay pacientes vinculados todavía.</p>
  }

  const selectedRecord = records.find((r) => r.patient.id === selectedId)
  const gi = selectedRecord?.baseline?.general_info ?? {}
  const c = selectedRecord?.baseline?.conditions ?? {}
  const vitals = selectedRecord?.baseline?.vitals ?? {}

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="md:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pacientes vinculados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {records.map((r) => (
              <button
                key={r.patient.id}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 ${
                  selectedId === r.patient.id ? "bg-slate-100" : ""
                }`}
                onClick={() => setSelectedId(r.patient.id)}
              >
                <div className="h-8 w-8 rounded-full bg-zuli-tricolor text-white flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.patient.name}</p>
                  <p className="text-xs text-gray-500 truncate">{r.patient.email}</p>
                </div>
                <Badge variant={r.patient.status === "accepted" ? "default" : "secondary"} className="text-[11px]">
                  {r.patient.status}
                </Badge>
              </button>
            ))}
            {records.length === 0 && <p className="px-4 py-6 text-sm text-gray-500">No hay pacientes vinculados.</p>}
          </div>
        </CardContent>
      </Card>

      <div className="md:col-span-2 space-y-4">
        {!selectedRecord ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-gray-500">Selecciona un paciente.</CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{selectedRecord.patient.name}</CardTitle>
                    <p className="text-xs text-gray-500">{selectedRecord.patient.email}</p>
                  </div>
                  <Badge variant={selectedRecord.patient.status === "accepted" ? "default" : "secondary"}>
                    {selectedRecord.patient.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cuestionarios de especialidad */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-zuli-indigo" />
                    <p className="text-xs text-gray-500">Cuestionarios de especialidad</p>
                  </div>
                  {selectedRecord.specialties.length === 0 ? (
                    <p className="text-xs text-gray-500">Sin respuestas aún.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedRecord.specialties.map((spec) => (
                        <Badge key={spec.specialty_id} variant="secondary" className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {spec.specialty_name}: {spec.responses} respuestas
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reportes de consulta */}
                <div className="space-y-2 pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-zuli-indigo" />
                    <p className="text-xs text-gray-500">Reportes de consulta</p>
                  </div>
                  {!selectedRecord.patient.patientId ? (
                    <p className="text-xs text-gray-500">
                      Este paciente aún no tiene un expediente clínico asociado.
                    </p>
                  ) : selectedRecord.reports.length === 0 ? (
                    <p className="text-xs text-gray-500">Sin reportes guardados.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedRecord.reports.map((report) => (
                        <div key={report.id} className="border rounded-lg p-4 bg-slate-50">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-900">
                              {report.title || "Reporte médico"}
                            </p>
                            <Badge variant="secondary" className="text-[11px]">
                              {report.report_type || "BORRADOR"}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">
                            {new Date(report.created_at).toLocaleString("es-MX")}
                          </p>
                          {report.compliance_status && (
                            <p className="text-[11px] text-gray-500 mb-2">
                              Cumplimiento: {report.compliance_status}
                            </p>
                          )}
                          {report.content && (
                            <div className="mt-3 p-3 bg-white rounded border text-sm text-gray-800 whitespace-pre-line">
                              {report.content}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
