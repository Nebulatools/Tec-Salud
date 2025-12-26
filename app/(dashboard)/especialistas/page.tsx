// Vista para especialistas/admin: gestionar vínculos y laboratorios
"use client"

import { LinkRequests } from "@/components/doctor/link-requests"
import { LabOrdersAdmin } from "@/components/doctor/lab-orders-admin"
import { useAppUser } from "@/hooks/use-app-user"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, Users, Stethoscope } from "lucide-react"
import Link from "next/link"

export default function EspecialistasPage() {
  const { doctorId, loading } = useAppUser()

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-40 rounded animate-shimmer" />
            <div className="h-4 w-64 rounded animate-shimmer" style={{ animationDelay: '0.1s' }} />
          </div>
          <div className="h-10 w-32 rounded animate-shimmer" style={{ animationDelay: '0.15s' }} />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 rounded animate-shimmer" style={{ animationDelay: `${i * 0.05}s` }} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!doctorId) {
    return (
      <div className="text-center py-16 animate-fadeIn">
        <div className="empty-state-icon">
          <Stethoscope className="h-12 w-12 text-gray-400" />
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
      {/* Header with context and quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expedientes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestiona tus vínculos con pacientes y solicitudes
          </p>
        </div>
        <Link href="/perfil">
          <Button variant="outline" size="sm" className="group hover:border-zuli-veronica/50">
            <Settings className="h-4 w-4 mr-2 group-hover:text-zuli-veronica transition-colors" />
            Editar perfil
          </Button>
        </Link>
      </div>

      {/* Vinculaciones Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-zuli-veronica" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Vinculaciones</h2>
        </div>
        <LinkRequests doctorId={doctorId} />
      </div>

      <LabOrdersAdmin doctorId={doctorId} />
    </div>
  )
}
