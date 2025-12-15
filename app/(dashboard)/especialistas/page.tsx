// Vista para especialistas/admin: gestionar vínculos y laboratorios
"use client"

import { LinkRequests } from "@/components/doctor/link-requests"
import { LabOrdersAdmin } from "@/components/doctor/lab-orders-admin"
import { DoctorSpecialtySetup } from "@/components/doctor/doctor-specialty-setup"
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
      <h1 className="text-2xl font-bold text-gray-900">Especialistas y pacientes</h1>
      <DoctorSpecialtySetup doctorId={doctorId} />
      <LinkRequests doctorId={doctorId} />
      <LabOrdersAdmin doctorId={doctorId} />
    </div>
  )
}
