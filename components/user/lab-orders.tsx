// Visualización de órdenes de laboratorio y carga de resultados (vista user)
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type LabOrder = {
  id: string
  recommended_tests: any
  notes: string | null
  status: "pending_upload" | "awaiting_review" | "reviewed"
  doctor: { first_name: string; last_name: string; email: string } | null
  specialty: { name: string } | null
}

const labProviders = [
  { id: "lab-alfa", name: "Lab Alfa" },
  { id: "lab-beta", name: "Lab Beta" },
  { id: "lab-gama", name: "Lab Gama" },
]

export function LabOrders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<LabOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadOrders = async () => {
    if (!user) return
    const { data } = await supabase
      .from("lab_orders")
      .select("id, recommended_tests, notes, status, doctors(first_name,last_name,email), specialties(name)")
      .eq("patient_user_id", user.id)

    const mapped =
      data?.map((row) => ({
        id: row.id,
        recommended_tests: row.recommended_tests,
        notes: row.notes,
        status: row.status,
        doctor: row.doctors as any,
        specialty: row.specialties as any,
      })) ?? []

    setOrders(mapped)
    setLoading(false)
  }

  useEffect(() => {
    loadOrders()
  }, [user])

  const handleUpload = async (orderId: string, file: File | null) => {
    if (!file || !user) return
    setUploading(orderId)
    setStatus(null)
    setError(null)

    const path = `lab-results/${orderId}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from("lab-results").upload(path, file)
    if (uploadError) {
      setError(uploadError.message)
      setUploading(null)
      return
    }

    const { error: insertError } = await supabase.from("lab_results").insert({
      lab_order_id: orderId,
      storage_path: path,
      mime_type: file.type,
      uploaded_by: user.id,
    })
    if (insertError) {
      setError(insertError.message)
      setUploading(null)
      return
    }

    await supabase
      .from("lab_orders")
      .update({ status: "awaiting_review" })
      .eq("id", orderId)

    setStatus("Resultados cargados. El médico revisará tu estudio.")
    setUploading(null)
    loadOrders()
  }

  const parseTests = (recommended: any) => {
    if (!recommended) return { tests: [], lab_provider: null }
    if (Array.isArray(recommended)) return { tests: recommended, lab_provider: null }
    if (typeof recommended === "object" && recommended !== null) {
      return { tests: recommended.tests ?? recommended, lab_provider: recommended.lab_provider ?? null }
    }
    return { tests: [], lab_provider: null }
  }

  const handleLabChoice = async (orderId: string, choice: string, current: any) => {
    if (!user) return
    setStatus(null)
    setError(null)
    const parsed = parseTests(current)
    const payload = { ...parsed, lab_provider: choice }
    const { error: updateError } = await supabase
      .from("lab_orders")
      .update({ recommended_tests: payload })
      .eq("id", orderId)
      .eq("patient_user_id", user.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setStatus("Laboratorio guardado.")
    loadOrders()
  }

  const statusBadge = (statusValue: LabOrder["status"]) => {
    const color =
      statusValue === "pending_upload"
        ? "bg-amber-100 text-amber-700"
        : statusValue === "awaiting_review"
          ? "bg-zuli-veronica/10 text-zuli-veronica"
          : "bg-zuli-indigo/10 text-zuli-indigo"
    const label =
      statusValue === "pending_upload"
        ? "Pendiente de carga"
        : statusValue === "awaiting_review"
          ? "En revisión"
          : "Revisado"
    return <Badge className={color}>{label}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Laboratorios y resultados</CardTitle>
        <CardDescription>
          Sube tus estudios cuando el especialista los solicite. Guarda el PDF o imagen y adjúntalos aquí.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <p className="text-sm text-gray-500">Cargando órdenes de laboratorio...</p>}
        {!loading && orders.length === 0 && (
          <p className="text-sm text-gray-500">Aún no tienes estudios solicitados.</p>
        )}

        {orders.map((order) => (
          <div key={order.id} className="border rounded-lg p-4 space-y-3 bg-gray-50">
            {(() => {
              const parsed = parseTests(order.recommended_tests)
              const labLabel = parsed.lab_provider
                ? labProviders.find((l) => l.id === parsed.lab_provider)?.name ?? parsed.lab_provider
                : null
              return (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">
                        {order.specialty?.name ?? "Especialidad"} · {order.doctor ? `${order.doctor.first_name} ${order.doctor.last_name}` : "Médico"}
                      </p>
                      <p className="text-xs text-gray-500">{order.doctor?.email}</p>
                      {labLabel && <p className="text-xs text-zuli-veronica">Laboratorio elegido: {labLabel}</p>}
                    </div>
                    {statusBadge(order.status)}
                  </div>
                  <div className="text-sm text-gray-700">
                    <p className="font-medium">Pruebas recomendadas:</p>
                    <pre className="text-xs bg-white border rounded p-2 mt-1 whitespace-pre-wrap">
                      {JSON.stringify(parsed.tests ?? order.recommended_tests ?? [], null, 2)}
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Laboratorio de convenio</p>
                    <Select
                      value={parsed.lab_provider ?? ""}
                      onValueChange={(choice) => handleLabChoice(order.id, choice, order.recommended_tests)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona laboratorio" />
                      </SelectTrigger>
                      <SelectContent>
                        {labProviders.map((lab) => (
                          <SelectItem key={lab.id} value={lab.id}>
                            {lab.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )
            })()}
            {order.notes && <p className="text-sm text-gray-600">Notas: {order.notes}</p>}
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => handleUpload(order.id, e.target.files?.[0] ?? null)}
                className="text-sm"
                disabled={uploading === order.id}
              />
            </div>
          </div>
        ))}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {status && (
          <Alert className="bg-zuli-veronica/10 border-zuli-veronica/20 text-zuli-veronica">
            <AlertDescription>{status}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
