"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Loader2,
  AlertCircle,
  Download,
  Calendar,
  Pill,
  User,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Prescription {
  id: string
  created_at: string
  status: "draft" | "signed" | "cancelled"
  diagnosis: string | null
  notes: string | null
  medications: PrescriptionMedication[]
  doctor: {
    id: string
    first_name: string
    last_name: string
    specialty: string | null
  }
}

interface PrescriptionMedication {
  id: string
  medication_name: string
  dosage: string | null
  frequency: string | null
  duration: string | null
  instructions: string | null
}

const statusConfig = {
  draft: {
    label: "Borrador",
    icon: Clock,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    badgeVariant: "outline" as const,
  },
  signed: {
    label: "Firmada",
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    badgeVariant: "default" as const,
  },
  cancelled: {
    label: "Cancelada",
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    badgeVariant: "destructive" as const,
  },
}

export default function PatientRecetasPage() {
  const { user, loading: authLoading } = useAuth()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPrescriptions() {
      if (!user) return

      try {
        // First get patient ID linked to this user
        const { data: patient, error: patientError } = await supabase
          .from("patients")
          .select("id")
          .eq("user_id", user.id)
          .single()

        if (patientError || !patient) {
          setError("No se encontró tu perfil de paciente.")
          setLoading(false)
          return
        }

        // Fetch prescriptions for this patient
        const { data, error: prescriptionsError } = await supabase
          .from("prescriptions")
          .select(`
            id,
            created_at,
            status,
            diagnosis,
            notes,
            prescription_medications (
              id,
              medication_name,
              dosage,
              frequency,
              duration,
              instructions
            ),
            doctors (
              id,
              first_name,
              last_name,
              specialty
            )
          `)
          .eq("patient_id", patient.id)
          .order("created_at", { ascending: false })

        if (prescriptionsError) throw prescriptionsError

        // Transform data to match interface
        const transformed = (data || []).map((p) => ({
          ...p,
          medications: p.prescription_medications || [],
          doctor: p.doctors,
        })) as unknown as Prescription[]

        setPrescriptions(transformed)
      } catch (err) {
        console.error("Error fetching prescriptions:", err)
        setError("Error al cargar las recetas.")
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchPrescriptions()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [user, authLoading])

  const handleDownload = async (prescriptionId: string) => {
    // TODO: Implement PDF download
    alert("La descarga de PDF estará disponible próximamente.")
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded animate-shimmer" />
          <div className="h-4 w-72 rounded animate-shimmer" style={{ animationDelay: "0.1s" }} />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-24 rounded animate-shimmer" style={{ animationDelay: `${i * 0.1}s` }} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-16 animate-fadeIn">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <FileText className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Inicia sesión
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
          Necesitas iniciar sesión para ver tus recetas médicas.
        </p>
        <Button onClick={() => window.location.href = "/login"}>
          Iniciar sesión
        </Button>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 animate-fadeIn">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Error
          </h2>
          <p className="text-red-600 dark:text-red-300">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Mis Recetas
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Historial de recetas médicas emitidas por tus doctores
        </p>
      </div>

      {/* Empty State */}
      {prescriptions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Sin recetas
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Aún no tienes recetas médicas. Cuando un doctor te emita una receta, aparecerá aquí.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Prescriptions List */}
      <div className="space-y-4">
        {prescriptions.map((prescription) => {
          const status = statusConfig[prescription.status]
          const StatusIcon = status.icon
          const isExpanded = expandedId === prescription.id

          return (
            <Card
              key={prescription.id}
              className={`transition-all cursor-pointer hover:shadow-md ${
                isExpanded ? "ring-2 ring-zuli-indigo/20" : ""
              }`}
              onClick={() => setExpandedId(isExpanded ? null : prescription.id)}
            >
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${status.bgColor}`}>
                      <StatusIcon className={`h-5 w-5 ${status.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={status.badgeVariant}>{status.label}</Badge>
                        <span className="text-xs text-gray-500">
                          {format(new Date(prescription.created_at), "d MMM yyyy", { locale: es })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                        <User className="h-4 w-4" />
                        Dr. {prescription.doctor.first_name} {prescription.doctor.last_name}
                      </div>
                      {prescription.doctor.specialty && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {prescription.doctor.specialty}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-5 w-5 text-gray-400 transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
                    {/* Diagnosis */}
                    {prescription.diagnosis && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                          Diagnóstico
                        </p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {prescription.diagnosis}
                        </p>
                      </div>
                    )}

                    {/* Medications */}
                    {prescription.medications.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                          Medicamentos
                        </p>
                        <div className="space-y-2">
                          {prescription.medications.map((med) => (
                            <div
                              key={med.id}
                              className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                            >
                              <Pill className="h-4 w-4 text-zuli-veronica mt-0.5" />
                              <div className="flex-1">
                                <p className="font-medium text-sm text-gray-900 dark:text-white">
                                  {med.medication_name}
                                </p>
                                <div className="text-xs text-gray-500 space-y-0.5">
                                  {med.dosage && <p>Dosis: {med.dosage}</p>}
                                  {med.frequency && <p>Frecuencia: {med.frequency}</p>}
                                  {med.duration && <p>Duración: {med.duration}</p>}
                                  {med.instructions && (
                                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                                      {med.instructions}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {prescription.notes && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                          Notas
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {prescription.notes}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    {prescription.status === "signed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(prescription.id)
                        }}
                        className="w-full"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar PDF
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
