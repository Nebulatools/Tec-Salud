"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useAppUser } from "@/hooks/use-app-user"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  FileText,
  Download,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { es } from "date-fns/locale"
import type { PrescriptionPDFData } from "@/components/prescriptions/prescription-pdf"

// Dynamic import to avoid SSR issues with react-pdf
const PrescriptionPDFViewer = dynamic(
  () =>
    import("@/components/prescriptions/prescription-pdf").then(
      (mod) => mod.PrescriptionPDFViewer
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-zuli-veronica" />
      </div>
    ),
  }
)

interface PrescriptionDetail {
  id: string
  status: "draft" | "signed" | "delivered" | "cancelled"
  diagnosis: string | null
  medications: Array<{
    brand_name: string
    generic_name: string
    dosage: string
    frequency: string
    duration: string
    instructions?: string
    quantity?: string
  }>
  notes: string | null
  created_at: string
  signed_at: string | null
  valid_until: string | null
  patient: {
    id: string
    first_name: string
    last_name: string
    date_of_birth: string | null
    email: string | null
  }
  doctor: {
    first_name: string
    last_name: string
    specialty: string | null
    license_number: string | null
    phone: string | null
    email: string | null
  }
}

const statusConfig = {
  draft: {
    label: "Borrador",
    icon: Clock,
    variant: "secondary" as const,
    color: "text-gray-500",
    bgColor: "bg-gray-100 dark:bg-gray-800",
  },
  signed: {
    label: "Firmada",
    icon: CheckCircle,
    variant: "default" as const,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
  },
  delivered: {
    label: "Entregada",
    icon: Send,
    variant: "outline" as const,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
  cancelled: {
    label: "Cancelada",
    icon: XCircle,
    variant: "destructive" as const,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20",
  },
}

export default function RecetaDetailPage() {
  const router = useRouter()
  const params = useParams()
  const prescriptionId = params.id as string
  const { doctorId, loading: userLoading } = useAppUser()

  const [prescription, setPrescription] = useState<PrescriptionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    async function fetchPrescription() {
      if (!doctorId || !prescriptionId) return

      try {
        const { data, error } = await supabase
          .from("prescriptions")
          .select(
            `
            id,
            status,
            diagnosis,
            medications,
            notes,
            created_at,
            signed_at,
            valid_until,
            patient:patients(id, first_name, last_name, date_of_birth, email),
            doctor:doctors(first_name, last_name, specialty, license_number, phone, email)
          `
          )
          .eq("id", prescriptionId)
          .single()

        if (error) throw error
        setPrescription(data as unknown as PrescriptionDetail)
      } catch (err) {
        console.error("Error fetching prescription:", err)
        setError("No se pudo cargar la receta")
      } finally {
        setLoading(false)
      }
    }

    if (doctorId) {
      fetchPrescription()
    } else if (!userLoading) {
      setLoading(false)
    }
  }, [doctorId, prescriptionId, userLoading])

  async function handleSign() {
    if (!prescription) return
    setSigning(true)

    try {
      const response = await fetch(`/api/prescriptions/${prescription.id}/sign`, {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al firmar")
      }

      const updated = await response.json()
      setPrescription((prev) =>
        prev
          ? {
              ...prev,
              status: updated.status,
              signed_at: updated.signed_at,
              valid_until: updated.valid_until,
            }
          : null
      )
    } catch (err) {
      console.error("Error signing:", err)
      setError(err instanceof Error ? err.message : "Error al firmar receta")
    } finally {
      setSigning(false)
    }
  }

  async function handleDownload() {
    if (!prescription) return
    setDownloading(true)

    try {
      const { downloadPrescriptionPDF } = await import(
        "@/components/prescriptions/prescription-pdf"
      )

      const pdfData: PrescriptionPDFData = {
        id: prescription.id,
        doctor: {
          first_name: prescription.doctor.first_name,
          last_name: prescription.doctor.last_name,
          specialty: prescription.doctor.specialty || undefined,
          license_number: prescription.doctor.license_number || undefined,
          phone: prescription.doctor.phone || undefined,
          email: prescription.doctor.email || undefined,
        },
        patient: {
          first_name: prescription.patient.first_name,
          last_name: prescription.patient.last_name,
          date_of_birth: prescription.patient.date_of_birth || undefined,
        },
        medications: prescription.medications,
        diagnosis: prescription.diagnosis || undefined,
        notes: prescription.notes || undefined,
        status: prescription.status,
        signed_at: prescription.signed_at || undefined,
        valid_until: prescription.valid_until || undefined,
        created_at: prescription.created_at,
      }

      await downloadPrescriptionPDF(pdfData)
    } catch (err) {
      console.error("Error downloading:", err)
      setError("Error al descargar PDF")
    } finally {
      setDownloading(false)
    }
  }

  if (userLoading || loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded animate-shimmer" />
          <div className="h-8 w-48 rounded animate-shimmer" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <div className="h-96 rounded animate-shimmer" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="h-48 rounded animate-shimmer" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!doctorId) {
    return (
      <div className="text-center py-16 animate-fadeIn">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <FileText className="h-8 w-8 text-gray-400" />
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

  if (error && !prescription) {
    return (
      <div className="text-center py-16 animate-fadeIn">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Error al cargar
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
          {error}
        </p>
        <Link href="/recetas">
          <Button variant="outline">Volver a recetas</Button>
        </Link>
      </div>
    )
  }

  if (!prescription) return null

  const status = statusConfig[prescription.status]
  const StatusIcon = status.icon

  const pdfData: PrescriptionPDFData = {
    id: prescription.id,
    doctor: {
      first_name: prescription.doctor.first_name,
      last_name: prescription.doctor.last_name,
      specialty: prescription.doctor.specialty || undefined,
      license_number: prescription.doctor.license_number || undefined,
      phone: prescription.doctor.phone || undefined,
      email: prescription.doctor.email || undefined,
    },
    patient: {
      first_name: prescription.patient.first_name,
      last_name: prescription.patient.last_name,
      date_of_birth: prescription.patient.date_of_birth || undefined,
    },
    medications: prescription.medications,
    diagnosis: prescription.diagnosis || undefined,
    notes: prescription.notes || undefined,
    status: prescription.status,
    signed_at: prescription.signed_at || undefined,
    valid_until: prescription.valid_until || undefined,
    created_at: prescription.created_at,
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/recetas">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Receta
              </h1>
              <Badge variant={status.variant}>
                <StatusIcon className={`h-3 w-3 mr-1 ${status.color}`} />
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {prescription.patient.first_name} {prescription.patient.last_name} •{" "}
              {formatDistanceToNow(new Date(prescription.created_at), {
                addSuffix: true,
                locale: es,
              })}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {prescription.status === "draft" && (
            <Button
              onClick={handleSign}
              disabled={signing}
              className="btn-zuli-gradient"
            >
              {signing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Firmando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Firmar
                </>
              )}
            </Button>
          )}
          <Button variant="outline" onClick={handleDownload} disabled={downloading}>
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Descargando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Descargar PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PDF Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-zuli-veronica" />
              Vista Previa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[600px] border rounded-lg overflow-hidden">
              <PrescriptionPDFViewer data={pdfData} />
            </div>
          </CardContent>
        </Card>

        {/* Details Sidebar */}
        <div className="space-y-4">
          {/* Patient Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Paciente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">
                {prescription.patient.first_name} {prescription.patient.last_name}
              </p>
              {prescription.patient.email && (
                <p className="text-sm text-gray-500">{prescription.patient.email}</p>
              )}
              {prescription.patient.date_of_birth && (
                <p className="text-sm text-gray-500">
                  Nacimiento:{" "}
                  {format(new Date(prescription.patient.date_of_birth), "dd/MM/yyyy")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Medications Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Medicamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {prescription.medications.map((med, index) => (
                  <li
                    key={index}
                    className="text-sm border-l-2 border-zuli-veronica pl-3 py-1"
                  >
                    <p className="font-medium">{med.brand_name}</p>
                    <p className="text-gray-500">
                      {med.dosage} - {med.frequency}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fechas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Creada:</span>
                <span>
                  {format(new Date(prescription.created_at), "dd/MM/yyyy HH:mm")}
                </span>
              </div>
              {prescription.signed_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Firmada:</span>
                  <span>
                    {format(new Date(prescription.signed_at), "dd/MM/yyyy HH:mm")}
                  </span>
                </div>
              )}
              {prescription.valid_until && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Válida hasta:</span>
                  <span>
                    {format(new Date(prescription.valid_until), "dd/MM/yyyy")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
