"use client"

import { useEffect, useState } from "react"
import { useAppUser } from "@/hooks/use-app-user"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Upload,
  FileText,
  Loader2,
} from "lucide-react"

interface Verification {
  id: string
  status: "pending" | "submitted" | "under_review" | "verified" | "rejected"
  cedula_professional: string | null
  cedula_storage_path: string | null
  specialty_certificate_path: string | null
  rejection_reason: string | null
  submitted_at: string | null
  verified_at: string | null
  created_at: string
}

const statusConfig = {
  pending: {
    label: "Pendiente",
    description: "Sube tus documentos para verificar tu cuenta",
    icon: Clock,
    color: "text-gray-500",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    badgeVariant: "secondary" as const,
  },
  submitted: {
    label: "Enviado",
    description: "Tus documentos han sido recibidos y están en cola de revisión",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    badgeVariant: "default" as const,
  },
  under_review: {
    label: "En Revisión",
    description: "Un administrador está revisando tus documentos",
    icon: AlertCircle,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    badgeVariant: "outline" as const,
  },
  verified: {
    label: "Verificado",
    description: "Tu cuenta ha sido verificada exitosamente",
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    badgeVariant: "default" as const,
  },
  rejected: {
    label: "Rechazado",
    description: "Tu verificación fue rechazada. Revisa los comentarios y vuelve a enviar.",
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    badgeVariant: "destructive" as const,
  },
}

export default function VerificacionPage() {
  const { doctorId, loading: userLoading } = useAppUser()
  const [verification, setVerification] = useState<Verification | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [cedula, setCedula] = useState("")
  const [cedulaFile, setCedulaFile] = useState<File | null>(null)
  const [specialtyFile, setSpecialtyFile] = useState<File | null>(null)

  useEffect(() => {
    async function fetchVerification() {
      if (!doctorId) return

      try {
        const { data, error } = await supabase
          .from("doctor_verifications")
          .select("*")
          .eq("doctor_id", doctorId)
          .single()

        if (error && error.code !== "PGRST116") throw error
        setVerification(data)
      } catch (err) {
        console.error("Error fetching verification:", err)
        setError("No se pudo cargar el estado de verificación")
      } finally {
        setLoading(false)
      }
    }

    if (doctorId) {
      fetchVerification()
    } else if (!userLoading) {
      setLoading(false)
    }
  }, [doctorId, userLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!doctorId || !cedula.trim()) return

    setUploading(true)
    setError(null)

    try {
      let cedulaPath = null
      let specialtyPath = null

      // Upload cedula file
      if (cedulaFile) {
        const ext = cedulaFile.name.split(".").pop()
        const path = `${doctorId}/cedula.${ext}`
        const { error: uploadError } = await supabase.storage
          .from("doctor-verifications")
          .upload(path, cedulaFile, { upsert: true })

        if (uploadError) throw uploadError
        cedulaPath = path
      }

      // Upload specialty certificate
      if (specialtyFile) {
        const ext = specialtyFile.name.split(".").pop()
        const path = `${doctorId}/specialty.${ext}`
        const { error: uploadError } = await supabase.storage
          .from("doctor-verifications")
          .upload(path, specialtyFile, { upsert: true })

        if (uploadError) throw uploadError
        specialtyPath = path
      }

      // Update or create verification record
      const updateData = {
        cedula_professional: cedula.trim(),
        cedula_storage_path: cedulaPath,
        specialty_certificate_path: specialtyPath,
        status: "submitted" as const,
        submitted_at: new Date().toISOString(),
      }

      if (verification) {
        const { error: updateError } = await supabase
          .from("doctor_verifications")
          .update(updateData)
          .eq("doctor_id", doctorId)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from("doctor_verifications")
          .insert({ doctor_id: doctorId, ...updateData })

        if (insertError) throw insertError
      }

      // Refresh data
      const { data } = await supabase
        .from("doctor_verifications")
        .select("*")
        .eq("doctor_id", doctorId)
        .single()

      setVerification(data)
    } catch (err) {
      console.error("Error submitting:", err)
      setError("Error al enviar los documentos")
    } finally {
      setUploading(false)
    }
  }

  if (userLoading || loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded animate-shimmer" />
          <div className="h-4 w-72 rounded animate-shimmer" style={{ animationDelay: "0.1s" }} />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-64 rounded animate-shimmer" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!doctorId) {
    return (
      <div className="text-center py-16 animate-fadeIn">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <ShieldCheck className="h-8 w-8 text-gray-400" />
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

  const currentStatus = verification?.status || "pending"
  const status = statusConfig[currentStatus]
  const StatusIcon = status.icon
  const canEdit = ["pending", "rejected"].includes(currentStatus)

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Verificación de Cuenta
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Verifica tu cédula profesional para desbloquear todas las funciones
        </p>
      </div>

      {/* Status Card */}
      <Card className={`border-2 ${status.bgColor}`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${status.bgColor}`}>
              <StatusIcon className={`h-8 w-8 ${status.color}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Estado: {status.label}
                </h2>
                <Badge variant={status.badgeVariant}>{status.label}</Badge>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                {status.description}
              </p>
              {verification?.rejection_reason && (
                <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    <strong>Motivo del rechazo:</strong> {verification.rejection_reason}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      {canEdit && (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-zuli-veronica" />
                Documentos de Verificación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cedula Number */}
              <div className="space-y-2">
                <Label htmlFor="cedula">Número de Cédula Profesional *</Label>
                <Input
                  id="cedula"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  placeholder="Ej: 12345678"
                  required
                />
              </div>

              {/* Cedula File */}
              <div className="space-y-2">
                <Label htmlFor="cedulaFile">Copia de Cédula (PDF o imagen)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="cedulaFile"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setCedulaFile(e.target.files?.[0] || null)}
                    className="flex-1"
                  />
                  {cedulaFile && (
                    <Badge variant="secondary">
                      <FileText className="h-3 w-3 mr-1" />
                      {cedulaFile.name}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Specialty Certificate */}
              <div className="space-y-2">
                <Label htmlFor="specialtyFile">
                  Certificado de Especialidad (opcional)
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="specialtyFile"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setSpecialtyFile(e.target.files?.[0] || null)}
                    className="flex-1"
                  />
                  {specialtyFile && (
                    <Badge variant="secondary">
                      <FileText className="h-3 w-3 mr-1" />
                      {specialtyFile.name}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={!cedula.trim() || uploading}
                className="btn-zuli-gradient"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar para Verificación
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      )}

      {/* Already Verified */}
      {currentStatus === "verified" && verification?.verified_at && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
              ¡Cuenta Verificada!
            </h3>
            <p className="text-green-700 dark:text-green-300">
              Tu cuenta fue verificada el{" "}
              {new Date(verification.verified_at).toLocaleDateString("es-MX", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
