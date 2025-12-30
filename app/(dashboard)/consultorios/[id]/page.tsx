"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useAppUser } from "@/hooks/use-app-user"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Clock,
  Crown,
  Shield,
  User,
  Pencil,
  Image,
} from "lucide-react"

interface MedicalUnit {
  id: string
  name: string
  address_line: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  operating_hours: Record<string, { open: string; close: string }> | null
  billing_info: Record<string, string> | null
  created_at: string
  role: "owner" | "admin" | "staff"
}

const roleConfig = {
  owner: { label: "Propietario", icon: Crown, color: "text-amber-600", bgColor: "bg-amber-50" },
  admin: { label: "Admin", icon: Shield, color: "text-blue-600", bgColor: "bg-blue-50" },
  staff: { label: "Staff", icon: User, color: "text-gray-600", bgColor: "bg-gray-50" },
}

const dayNames: Record<string, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
}

export default function ConsultorioDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { doctorId, loading: userLoading } = useAppUser()
  const [unit, setUnit] = useState<MedicalUnit | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const unitId = params.id as string

  useEffect(() => {
    async function fetchUnit() {
      if (!doctorId || !unitId) return

      try {
        const { data, error } = await supabase
          .from("doctor_units")
          .select(`
            role,
            unit:medical_units(
              id,
              name,
              address_line,
              phone,
              email,
              logo_url,
              operating_hours,
              billing_info,
              created_at
            )
          `)
          .eq("doctor_id", doctorId)
          .eq("unit_id", unitId)
          .single()

        if (error) throw error

        const unitData = data?.unit as unknown as {
          id: string
          name: string
          address_line: string | null
          phone: string | null
          email: string | null
          logo_url: string | null
          operating_hours: Record<string, { open: string; close: string }> | null
          billing_info: Record<string, string> | null
          created_at: string
        } | null

        if (!unitData) {
          setError("Consultorio no encontrado")
          return
        }

        setUnit({
          ...unitData,
          role: data.role as "owner" | "admin" | "staff",
        })
      } catch (err: unknown) {
        const error = err as { message?: string }
        console.error("Error fetching unit:", error.message || err)
        setError("No se pudo cargar el consultorio")
      } finally {
        setLoading(false)
      }
    }

    if (doctorId) {
      fetchUnit()
    } else if (!userLoading) {
      setLoading(false)
    }
  }, [doctorId, unitId, userLoading])

  if (userLoading || loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded animate-shimmer" />
          <div className="h-8 w-48 rounded animate-shimmer" />
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
          <Building2 className="h-8 w-8 text-gray-400" />
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

  if (error || !unit) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center gap-4">
          <Link href="/consultorios">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Consultorio
          </h1>
        </div>
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 dark:text-red-400">{error || "Consultorio no encontrado"}</p>
            <Link href="/consultorios">
              <Button variant="outline" className="mt-4">
                Volver a consultorios
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const role = roleConfig[unit.role]
  const RoleIcon = role.icon
  const canEdit = unit.role === "owner" || unit.role === "admin"

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/consultorios">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {unit.name}
              </h1>
              <Badge variant="secondary" className={role.bgColor}>
                <RoleIcon className={`h-3 w-3 mr-1 ${role.color}`} />
                <span className={role.color}>{role.label}</span>
              </Badge>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Detalles del consultorio
            </p>
          </div>
        </div>
        {canEdit && (
          <Link href={`/consultorios/${unit.id}/editar`}>
            <Button className="btn-zuli-gradient">
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-zuli-veronica" />
              Información General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {unit.logo_url && (
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                  <img
                    src={unit.logo_url}
                    alt={unit.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-sm text-gray-500">Logo del consultorio</span>
              </div>
            )}

            {!unit.logo_url && (
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Image className="h-8 w-8 text-gray-400" />
                </div>
                <span className="text-sm text-gray-500">Sin logo</span>
              </div>
            )}

            <div className="space-y-3 pt-4 border-t">
              {unit.address_line && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">{unit.address_line}</span>
                </div>
              )}
              {unit.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">{unit.phone}</span>
                </div>
              )}
              {unit.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">{unit.email}</span>
                </div>
              )}
              {!unit.address_line && !unit.phone && !unit.email && (
                <p className="text-gray-500 text-sm">No hay información de contacto</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-zuli-veronica" />
              Horario de Atención
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unit.operating_hours && Object.keys(unit.operating_hours).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(dayNames).map(([key, name]) => {
                  const hours = unit.operating_hours?.[key]
                  return (
                    <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{name}</span>
                      {hours ? (
                        <span className="text-gray-600 dark:text-gray-400">
                          {hours.open} - {hours.close}
                        </span>
                      ) : (
                        <span className="text-gray-400">Cerrado</span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No hay horario configurado</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
