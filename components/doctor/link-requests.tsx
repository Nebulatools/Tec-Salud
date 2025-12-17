// Gestiona solicitudes doctor-paciente
"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

type LinkRow = {
  id: string
  patient_user_id: string
  status: "pending" | "accepted" | "rejected" | "revoked"
  requested_by: "doctor" | "patient"
  requested_at: string
}

type PatientInfo = {
  id: string
  email: string
  full_name: string | null
}

export function LinkRequests({ doctorId }: { doctorId: string }) {
  const [links, setLinks] = useState<LinkRow[]>([])
  const [patients, setPatients] = useState<Record<string, PatientInfo>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    const { data, error: linksError } = await supabase
      .from("doctor_patient_links")
      .select("id, patient_user_id, status, requested_by, requested_at")
      .eq("doctor_id", doctorId)
      .order("requested_at", { ascending: false })

    if (linksError) {
      setError(linksError.message)
      setLoading(false)
      return
    }

    setLinks(data ?? [])

    const ids = Array.from(new Set((data ?? []).map((l) => l.patient_user_id)))
    if (ids.length > 0) {
      const { data: users } = await supabase.from("app_users").select("id,email,full_name").in("id", ids)
      const map: Record<string, PatientInfo> = {}
      users?.forEach((u) => {
        map[u.id] = u
      })
      setPatients(map)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (doctorId) load()
  }, [doctorId])

  const updateStatus = async (id: string, status: LinkRow["status"]) => {
    await supabase
      .from("doctor_patient_links")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", id)
    load()
  }

  const statusBadge = (statusValue: LinkRow["status"]) => {
    const color =
      statusValue === "pending"
        ? "bg-yellow-100 text-yellow-800"
        : statusValue === "accepted"
          ? "bg-green-100 text-green-800"
          : "bg-gray-100 text-gray-700"
    const label =
      statusValue === "pending"
        ? "Pendiente"
        : statusValue === "accepted"
          ? "Aceptada"
          : statusValue === "rejected"
            ? "Rechazada"
            : "Revocada"
    return <Badge className={color}>{label}</Badge>
  }

  const pending = useMemo(() => links.filter((l) => l.status === "pending"), [links])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitudes de pacientes</CardTitle>
        <CardDescription>Acepta o rechaza vínculos iniciados por pacientes o por ti.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <p className="text-sm text-gray-500">Cargando solicitudes...</p>}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {pending.length === 0 && !loading && (
          <p className="text-sm text-gray-500">No hay solicitudes pendientes.</p>
        )}

        {pending.map((link) => {
          const patient = patients[link.patient_user_id]
          return (
            <div key={link.id} className="border rounded-lg p-4 bg-gray-50 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">{patient?.full_name ?? patient?.email ?? "Paciente"}</p>
                <p className="text-xs text-gray-500">{patient?.email}</p>
                <p className="text-xs text-gray-400">
                  Solicitado por {link.requested_by === "patient" ? "paciente" : "doctor"} el{" "}
                  {new Date(link.requested_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(link.status)}
                <Button variant="outline" onClick={() => updateStatus(link.id, "accepted")}>
                  Aceptar
                </Button>
                <Button variant="ghost" onClick={() => updateStatus(link.id, "rejected")}>
                  Rechazar
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
