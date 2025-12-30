"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAppUser } from "@/hooks/use-app-user"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  FolderOpen,
  Search,
  User,
  Calendar,
  FileText,
  Activity,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { format, differenceInYears } from "date-fns"
import { es } from "date-fns/locale"

interface PatientWithStats {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  phone: string | null
  email: string | null
  created_at: string
  appointments_count: number
  reports_count: number
  last_appointment: string | null
}

export default function ExpedientesPage() {
  const { doctorId, loading: userLoading } = useAppUser()
  const [patients, setPatients] = useState<PatientWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    async function fetchPatients() {
      if (!doctorId) return

      try {
        // Get patients linked to this doctor
        const { data: patientsData, error: patientsError } = await supabase
          .from("patients")
          .select("id, first_name, last_name, date_of_birth, gender, phone, email, created_at")
          .eq("doctor_id", doctorId)
          .order("last_name", { ascending: true })

        if (patientsError) throw patientsError

        // Get appointment counts and last appointment for each patient
        const patientsWithStats = await Promise.all(
          (patientsData || []).map(async (patient) => {
            // Get appointments count
            const { count: appointmentsCount } = await supabase
              .from("appointments")
              .select("id", { count: "exact", head: true })
              .eq("patient_id", patient.id)

            // Get reports count
            const { count: reportsCount } = await supabase
              .from("medical_reports")
              .select("id", { count: "exact", head: true })
              .eq("patient_id", patient.id)

            // Get last appointment
            const { data: lastAppointment } = await supabase
              .from("appointments")
              .select("appointment_date")
              .eq("patient_id", patient.id)
              .order("appointment_date", { ascending: false })
              .limit(1)
              .single()

            return {
              ...patient,
              appointments_count: appointmentsCount || 0,
              reports_count: reportsCount || 0,
              last_appointment: lastAppointment?.appointment_date || null,
            }
          })
        )

        setPatients(patientsWithStats)
      } catch (err) {
        console.error("Error fetching patients:", err)
      } finally {
        setLoading(false)
      }
    }

    if (doctorId) {
      fetchPatients()
    } else if (!userLoading) {
      setLoading(false)
    }
  }, [doctorId, userLoading])

  const filteredPatients = patients.filter((patient) => {
    const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase())
  })

  if (userLoading || loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded animate-shimmer" />
          <div className="h-4 w-72 rounded animate-shimmer" style={{ animationDelay: "0.1s" }} />
        </div>
        <div className="h-10 w-full rounded animate-shimmer" />
        <div className="grid gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl animate-shimmer" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!doctorId) {
    return (
      <div className="text-center py-16 animate-fadeIn">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <FolderOpen className="h-8 w-8 text-gray-400" />
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expedientes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Historial médico de tus pacientes
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          {patients.length} paciente{patients.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por nombre..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Patients List */}
      {filteredPatients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <FolderOpen className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery ? "Sin resultados" : "Sin pacientes"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              {searchQuery
                ? "No se encontraron pacientes con ese nombre."
                : "Aún no tienes pacientes registrados. Los pacientes aparecerán aquí cuando tengan una consulta contigo."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPatients.map((patient) => {
            const age = differenceInYears(new Date(), new Date(patient.date_of_birth))

            return (
              <Link key={patient.id} href={`/expedientes/${patient.id}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-zuli-veronica/20 to-zuli-indigo/20 flex items-center justify-center">
                          <User className="h-6 w-6 text-zuli-veronica" />
                        </div>

                        {/* Info */}
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-zuli-veronica transition-colors">
                            {patient.first_name} {patient.last_name}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span>{age} años</span>
                            <span>•</span>
                            <span>{patient.gender}</span>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="hidden sm:flex items-center gap-6">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span>{patient.appointments_count} citas</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <FileText className="h-4 w-4" />
                          <span>{patient.reports_count} reportes</span>
                        </div>
                        {patient.last_appointment && (
                          <div className="text-sm text-gray-400">
                            Última: {format(new Date(patient.last_appointment), "d MMM yyyy", { locale: es })}
                          </div>
                        )}
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-zuli-veronica transition-colors" />
                      </div>

                      {/* Mobile chevron */}
                      <ChevronRight className="h-5 w-5 text-gray-400 sm:hidden group-hover:text-zuli-veronica transition-colors" />
                    </div>

                    {/* Mobile stats */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 sm:hidden">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {patient.appointments_count} citas
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <FileText className="h-3.5 w-3.5" />
                        {patient.reports_count} reportes
                      </div>
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
