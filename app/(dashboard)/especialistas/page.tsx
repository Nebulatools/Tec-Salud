// Vista para especialistas/admin: gestionar vínculos y laboratorios
"use client"

import { LinkRequests } from "@/components/doctor/link-requests"
import { LabOrdersAdmin } from "@/components/doctor/lab-orders-admin"
import { useAppUser } from "@/hooks/use-app-user"

export default function EspecialistasPage() {
  const { doctorId, loading } = useAppUser()

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (!doctorId) {
    return <p className="text-sm text-gray-600">Esta vista es solo para doctores.</p>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Expedientes</h1>
      <p className="text-sm text-gray-600">
        Configura tu especialidad y tarjeta desde <a className="text-orange-600 underline" href="/perfil">Perfil</a>.
      </p>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Vinculaciones y laboratorios</h2>
        <LinkRequests doctorId={doctorId} />
        <LabOrdersAdmin doctorId={doctorId} />
      </div>
    </div>
  )
}
