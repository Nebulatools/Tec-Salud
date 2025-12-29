"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAppUser } from "@/hooks/use-app-user"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface Prescription {
  id: string
  status: 'draft' | 'signed' | 'delivered' | 'cancelled'
  diagnosis: string | null
  medications: Array<{
    brand_name: string
    generic_name: string
    dosage: string
  }>
  created_at: string
  signed_at: string | null
  valid_until: string | null
  patient: {
    first_name: string
    last_name: string
  }
}

const statusConfig = {
  draft: {
    label: 'Borrador',
    icon: Clock,
    variant: 'secondary' as const,
    color: 'text-gray-500',
  },
  signed: {
    label: 'Firmada',
    icon: CheckCircle,
    variant: 'default' as const,
    color: 'text-green-600',
  },
  delivered: {
    label: 'Entregada',
    icon: Send,
    variant: 'outline' as const,
    color: 'text-blue-600',
  },
  cancelled: {
    label: 'Cancelada',
    icon: XCircle,
    variant: 'destructive' as const,
    color: 'text-red-600',
  },
}

export default function RecetasPage() {
  const { doctorId, loading: userLoading } = useAppUser()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPrescriptions() {
      if (!doctorId) return

      try {
        const { data, error } = await supabase
          .from('prescriptions')
          .select(`
            id,
            status,
            diagnosis,
            medications,
            created_at,
            signed_at,
            valid_until,
            patient:patients(first_name, last_name)
          `)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error

        setPrescriptions(data as unknown as Prescription[])
      } catch (err) {
        console.error('Error fetching prescriptions:', err)
        setError('No se pudieron cargar las recetas')
      } finally {
        setLoading(false)
      }
    }

    if (doctorId) {
      fetchPrescriptions()
    } else if (!userLoading) {
      setLoading(false)
    }
  }, [doctorId, userLoading])

  if (userLoading || loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-40 rounded animate-shimmer" />
            <div className="h-4 w-64 rounded animate-shimmer" style={{ animationDelay: '0.1s' }} />
          </div>
          <div className="h-10 w-40 rounded animate-shimmer" style={{ animationDelay: '0.15s' }} />
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-24 rounded animate-shimmer" style={{ animationDelay: `${i * 0.05}s` }} />
              </CardContent>
            </Card>
          ))}
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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recetas Médicas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestiona las recetas de tus pacientes
          </p>
        </div>
        <Link href="/recetas/nueva">
          <Button className="btn-zuli-gradient group">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Receta
          </Button>
        </Link>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!error && prescriptions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-zuli-veronica/10 to-zuli-indigo/10 flex items-center justify-center">
              <FileText className="h-8 w-8 text-zuli-veronica" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No hay recetas aún
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
              Crea tu primera receta médica para un paciente.
            </p>
            <Link href="/recetas/nueva">
              <Button className="btn-zuli-gradient">
                <Plus className="h-4 w-4 mr-2" />
                Crear primera receta
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Prescriptions List */}
      {prescriptions.length > 0 && (
        <div className="grid gap-4">
          {prescriptions.map((prescription) => {
            const status = statusConfig[prescription.status]
            const StatusIcon = status.icon
            const patient = prescription.patient
            const medicationCount = prescription.medications?.length || 0

            return (
              <Link
                key={prescription.id}
                href={`/recetas/${prescription.id}`}
                className="block"
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Patient Name */}
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {patient?.first_name} {patient?.last_name}
                          </h3>
                          <Badge variant={status.variant} className="shrink-0">
                            <StatusIcon className={`h-3 w-3 mr-1 ${status.color}`} />
                            {status.label}
                          </Badge>
                        </div>

                        {/* Diagnosis */}
                        {prescription.diagnosis && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-1">
                            {prescription.diagnosis}
                          </p>
                        )}

                        {/* Meta info */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span>
                            {medicationCount} medicamento{medicationCount !== 1 ? 's' : ''}
                          </span>
                          <span>
                            {formatDistanceToNow(new Date(prescription.created_at), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </span>
                          {prescription.valid_until && (
                            <span>
                              Válida hasta {new Date(prescription.valid_until).toLocaleDateString('es-MX')}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-zuli-veronica transition-colors shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
