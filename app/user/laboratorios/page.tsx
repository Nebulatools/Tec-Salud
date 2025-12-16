// Página de laboratorios del usuario
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  Stethoscope,
  Heart,
  Activity,
  Loader2,
  Download,
} from "lucide-react"

type LabOrder = {
  id: string
  recommended_tests: any
  notes: string | null
  status: "pending_upload" | "awaiting_review" | "reviewed"
  doctor: { first_name: string; last_name: string; email: string } | null
  specialty: { name: string } | null
  lab_results: { id: string; storage_path: string; uploaded_at: string; mime_type: string }[]
}

const labProviders = [
  { id: "salud-digna", name: "Salud Digna" },
  { id: "chopo", name: "Laboratorios Chopo" },
  { id: "similares", name: "Laboratorios Similares" },
  { id: "olab", name: "OLAB" },
]

const specialtyIcons: Record<string, React.ReactNode> = {
  Cardiología: <Heart className="h-4 w-4" />,
  Endocrinología: <Activity className="h-4 w-4" />,
  "Medicina Interna": <Stethoscope className="h-4 w-4" />,
}

export default function LaboratoriosPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<LabOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadOrders = async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from("lab_orders")
      .select(
        "id, recommended_tests, notes, status, doctor:doctors!lab_orders_doctor_id_fkey(first_name,last_name,email), specialty:specialties(name), lab_results(id, storage_path, uploaded_at, mime_type)"
      )
      .eq("patient_user_id", user.id)
      .order("recommended_at", { ascending: false })

    if (error) {
      setError(error.message)
      setOrders([])
      setLoading(false)
      return
    }

    const mapped =
      data?.map((row: any) => ({
        id: row.id,
        recommended_tests: row.recommended_tests,
        notes: row.notes,
        status: row.status,
        doctor: row.doctor,
        specialty: row.specialty,
        lab_results: row.lab_results ?? [],
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

    await supabase.from("lab_orders").update({ status: "awaiting_review" }).eq("id", orderId)

    setStatus("¡Resultados cargados! El médico revisará tu estudio.")
    setUploading(null)
    loadOrders()
  }

  const parseTests = (recommended: any) => {
    if (!recommended) return { tests: [], lab_provider: null, lab_branch: null, lab_branch_address: null }
    if (Array.isArray(recommended)) return { tests: recommended, lab_provider: null, lab_branch: null, lab_branch_address: null }
    if (typeof recommended === "object" && recommended !== null) {
      return {
        tests: recommended.tests ?? [],
        lab_provider: recommended.lab_provider ?? null,
        lab_branch: recommended.lab_branch ?? null,
        lab_branch_address: recommended.lab_branch_address ?? null,
      }
    }
    return { tests: [], lab_provider: null, lab_branch: null, lab_branch_address: null }
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

  const downloadResult = async (path: string) => {
    const { data } = await supabase.storage.from("lab-results").createSignedUrl(path, 3600)
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank")
    }
  }

  const statusBadge = (statusValue: LabOrder["status"]) => {
    if (statusValue === "pending_upload") {
      return (
        <Badge className="bg-amber-100 text-amber-700">
          <Clock className="h-3 w-3 mr-1" />
          Pendiente
        </Badge>
      )
    }
    if (statusValue === "awaiting_review") {
      return (
        <Badge className="bg-zuli-veronica/10 text-zuli-veronica">
          <FileText className="h-3 w-3 mr-1" />
          En revisión
        </Badge>
      )
    }
    return (
      <Badge className="bg-zuli-indigo/10 text-zuli-indigo">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Revisado
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-zuli-veronica/20 border-t-zuli-veronica mx-auto" />
          <p className="text-gray-500 mt-3">Cargando laboratorios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-zuli-cyan to-zuli-indigo rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-white/20">
            <Upload className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Mis Laboratorios</h1>
            <p className="text-white/80 text-sm">
              Sube tus resultados de laboratorio para que tu médico los revise
            </p>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {status && (
        <Alert className="bg-zuli-veronica/10 border-zuli-veronica/20 text-zuli-veronica">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{status}</AlertDescription>
        </Alert>
      )}

      {/* Lista de órdenes */}
      {orders.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-700">Sin estudios solicitados</h3>
            <p className="text-sm text-gray-500 mt-1">
              Cuando un especialista te solicite estudios, aparecerán aquí
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => router.push("/user/especialistas")}
            >
              Buscar especialista
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const parsed = parseTests(order.recommended_tests)
            const labLabel = parsed.lab_provider
              ? labProviders.find((l) => l.id === parsed.lab_provider)?.name ?? parsed.lab_provider
              : null

            return (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white border">
                        {specialtyIcons[order.specialty?.name ?? ""] ?? (
                          <Stethoscope className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {order.specialty?.name ?? "Especialidad"}
                        </CardTitle>
                        <CardDescription>
                          Dr. {order.doctor?.first_name} {order.doctor?.last_name}
                        </CardDescription>
                      </div>
                    </div>
                    {statusBadge(order.status)}
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Pruebas recomendadas */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Pruebas recomendadas:</p>
                    <div className="flex flex-wrap gap-2">
                      {parsed.tests.length > 0 ? (
                        parsed.tests.map((t: string, idx: number) => (
                          <Badge key={idx} variant="outline">
                            {t}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">Sin pruebas especificadas</span>
                      )}
                    </div>
                  </div>

                  {/* Info de laboratorio seleccionado */}
                  {parsed.lab_provider && (
                    <div className="p-4 rounded-lg bg-zuli-indigo/5 border border-zuli-indigo/20">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-zuli-indigo/10">
                          <Stethoscope className="h-5 w-5 text-zuli-indigo" />
                        </div>
                        <div>
                          <p className="font-medium text-zuli-indigo">{parsed.lab_provider}</p>
                          {parsed.lab_branch && (
                            <p className="text-sm text-gray-700">
                              Sucursal: {parsed.lab_branch}
                            </p>
                          )}
                          {parsed.lab_branch_address && (
                            <p className="text-xs text-gray-600 mt-1">
                              📍 {parsed.lab_branch_address}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Upload */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      {order.lab_results.length > 0 ? "Agregar más resultados" : "Subir resultados"}
                    </p>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`file-${order.id}`}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                          uploading === order.id
                            ? "border-zuli-veronica/30 bg-zuli-veronica/5"
                            : "border-gray-300 hover:border-zuli-veronica/40 hover:bg-zuli-veronica/5"
                        }`}
                      >
                        {uploading === order.id ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin text-zuli-veronica" />
                            <span className="text-sm text-zuli-veronica">Subiendo...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-5 w-5 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              Click para seleccionar archivo (PDF o imagen)
                            </span>
                          </>
                        )}
                      </label>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={(e) => handleUpload(order.id, e.target.files?.[0] ?? null)}
                        disabled={uploading === order.id}
                        className="hidden"
                        id={`file-${order.id}`}
                      />
                    </div>
                  </div>

                  {/* Resultados subidos */}
                  {order.lab_results.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Archivos subidos:</p>
                      <div className="space-y-2">
                        {order.lab_results.map((result) => (
                          <div
                            key={result.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-zuli-indigo/5 border border-zuli-indigo/20"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-zuli-indigo" />
                              <span className="text-sm text-gray-700 truncate max-w-[200px]">
                                {result.storage_path.split("/").pop()}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {result.mime_type.split("/")[1]?.toUpperCase() ?? "FILE"}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadResult(result.storage_path)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notas */}
                  {order.notes && (
                    <div className="p-3 rounded-lg bg-gray-50 border">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Notas:</span> {order.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
