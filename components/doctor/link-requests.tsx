// Gestiona solicitudes doctor-paciente
"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { User, Check, X, Users, Clock } from "lucide-react"

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
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-zuli-veronica" />
          Solicitudes de pacientes
        </CardTitle>
        <CardDescription>Acepta o rechaza vínculos iniciados por pacientes o por ti.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="h-12 w-12 rounded-full animate-shimmer" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded animate-shimmer" />
                  <div className="h-3 w-48 rounded animate-shimmer" style={{ animationDelay: '0.1s' }} />
                </div>
                <div className="flex gap-2">
                  <div className="h-9 w-20 rounded animate-shimmer" />
                  <div className="h-9 w-20 rounded animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="animate-fadeIn">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {pending.length === 0 && !loading && (
          <div className="text-center py-12 animate-fadeIn">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
              Sin solicitudes pendientes
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
              Las nuevas solicitudes de vinculación de pacientes aparecerán aquí
            </p>
          </div>
        )}

        <div className="grid gap-3">
          {pending.map((link, index) => {
            const patient = patients[link.patient_user_id]
            return (
              <div
                key={link.id}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-amber-50/50 dark:from-amber-900/10 dark:to-transparent border border-amber-200 dark:border-amber-800 hover:shadow-md transition-shadow duration-200 animate-fadeInUp"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <User className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {patient?.full_name ?? "Paciente"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{patient?.email}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {link.requested_by === "patient" ? "Solicitado por paciente" : "Solicitado por ti"} ·{" "}
                      {new Date(link.requested_at).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {statusBadge(link.status)}
                  <Button
                    size="sm"
                    className="bg-green-500 hover:bg-green-600 text-white touch-target"
                    onClick={() => updateStatus(link.id, "accepted")}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Aceptar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 touch-target"
                    onClick={() => updateStatus(link.id, "rejected")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
