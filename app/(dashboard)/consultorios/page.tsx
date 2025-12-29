"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAppUser } from "@/hooks/use-app-user"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Plus,
  MapPin,
  Phone,
  Mail,
  Clock,
  ChevronRight,
  Crown,
  Shield,
  User,
} from "lucide-react"

interface MedicalUnit {
  id: string
  name: string
  address_line: string | null
  phone: string | null
  email: string | null
  operating_hours: Record<string, { open: string; close: string }> | null
  created_at: string
  role: "owner" | "admin" | "staff"
}

const roleConfig = {
  owner: { label: "Propietario", icon: Crown, color: "text-amber-600", bgColor: "bg-amber-50" },
  admin: { label: "Admin", icon: Shield, color: "text-blue-600", bgColor: "bg-blue-50" },
  staff: { label: "Staff", icon: User, color: "text-gray-600", bgColor: "bg-gray-50" },
}

export default function ConsultoriosPage() {
  const { doctorId, loading: userLoading } = useAppUser()
  const [units, setUnits] = useState<MedicalUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUnits() {
      if (!doctorId) return

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
              operating_hours,
              created_at
            )
          `)
          .eq("doctor_id", doctorId)

        if (error) throw error

        const formatted = data?.map((d) => ({
          ...d.unit,
          role: d.role,
        })) as MedicalUnit[]

        setUnits(formatted || [])
      } catch (err) {
        console.error("Error fetching units:", err)
        setError("No se pudieron cargar los consultorios")
      } finally {
        setLoading(false)
      }
    }

    if (doctorId) {
      fetchUnits()
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
            <div className="h-4 w-64 rounded animate-shimmer" style={{ animationDelay: "0.1s" }} />
          </div>
          <div className="h-10 w-40 rounded animate-shimmer" style={{ animationDelay: "0.15s" }} />
        </div>
        <div className="grid gap-4">
          {[...Array(2)].map((_, i) => (
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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Consultorios</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestiona tus consultorios y clínicas
          </p>
        </div>
        <Link href="/consultorios/nuevo">
          <Button className="btn-zuli-gradient group">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Consultorio
          </Button>
        </Link>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!error && units.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-zuli-veronica/10 to-zuli-indigo/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-zuli-veronica" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No hay consultorios
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
              Registra tu primer consultorio o clínica.
            </p>
            <Link href="/consultorios/nuevo">
              <Button className="btn-zuli-gradient">
                <Plus className="h-4 w-4 mr-2" />
                Crear consultorio
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Units List */}
      {units.length > 0 && (
        <div className="grid gap-4">
          {units.map((unit) => {
            const role = roleConfig[unit.role]
            const RoleIcon = role.icon

            return (
              <Link key={unit.id} href={`/consultorios/${unit.id}`} className="block">
                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Icon */}
                        <div className="p-3 rounded-xl bg-gradient-to-br from-zuli-veronica/10 to-zuli-indigo/10 shrink-0">
                          <Building2 className="h-6 w-6 text-zuli-veronica" />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Name & Role */}
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                              {unit.name}
                            </h3>
                            <Badge variant="secondary" className={`shrink-0 ${role.bgColor}`}>
                              <RoleIcon className={`h-3 w-3 mr-1 ${role.color}`} />
                              <span className={role.color}>{role.label}</span>
                            </Badge>
                          </div>

                          {/* Info */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                            {unit.address_line && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                <span className="truncate max-w-[200px]">{unit.address_line}</span>
                              </span>
                            )}
                            {unit.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                {unit.phone}
                              </span>
                            )}
                            {unit.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                {unit.email}
                              </span>
                            )}
                          </div>
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
