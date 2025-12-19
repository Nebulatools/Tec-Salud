"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import {
  Search,
  User,
  Calendar,
  FileText,
  Plus,
  LayoutDashboard,
  Clock,
  X,
  Loader2,
} from "lucide-react"

interface Patient {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
}

interface Appointment {
  id: string
  appointment_date: string
  start_time: string
  status: string
  patient: {
    first_name: string
    last_name: string
  } | null
}

interface Report {
  id: string
  title: string
  created_at: string
  patient: {
    first_name: string
    last_name: string
  } | null
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [search, setSearch] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [patients, setPatients] = React.useState<Patient[]>([])
  const [appointments, setAppointments] = React.useState<Appointment[]>([])
  const [reports, setReports] = React.useState<Report[]>([])
  const [doctorId, setDoctorId] = React.useState<string | null>(null)

  // Get doctor ID on mount
  React.useEffect(() => {
    const fetchDoctorId = async () => {
      if (!user?.id) return
      const { data } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .single()
      if (data) setDoctorId(data.id)
    }
    void fetchDoctorId()
  }, [user?.id])

  // Search when query changes
  React.useEffect(() => {
    if (!open || !doctorId) return

    const searchData = async () => {
      setLoading(true)
      try {
        const searchTerm = search.trim().toLowerCase()

        // Fetch patients
        const patientsQuery = supabase
          .from("patients")
          .select("id, first_name, last_name, email, phone")
          .eq("doctor_id", doctorId)
          .limit(5)

        if (searchTerm) {
          patientsQuery.or(
            `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
          )
        }

        // Fetch today's appointments
        const today = new Date().toISOString().split("T")[0]
        const appointmentsQuery = supabase
          .from("appointments")
          .select(`
            id,
            appointment_date,
            start_time,
            status,
            patient:patients!inner(first_name, last_name)
          `)
          .eq("doctor_id", doctorId)
          .gte("appointment_date", today)
          .order("appointment_date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(5)

        // Fetch recent reports
        const reportsQuery = supabase
          .from("medical_reports")
          .select(`
            id,
            title,
            created_at,
            patient:patients!inner(first_name, last_name)
          `)
          .eq("doctor_id", doctorId)
          .order("created_at", { ascending: false })
          .limit(5)

        if (searchTerm) {
          reportsQuery.ilike("title", `%${searchTerm}%`)
        }

        const [patientsRes, appointmentsRes, reportsRes] = await Promise.all([
          patientsQuery,
          appointmentsQuery,
          reportsQuery,
        ])

        setPatients((patientsRes.data as Patient[]) || [])
        setAppointments((appointmentsRes.data as unknown as Appointment[]) || [])
        setReports((reportsRes.data as unknown as Report[]) || [])
      } catch (error) {
        console.error("Search error:", error)
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(searchData, 200)
    return () => clearTimeout(debounce)
  }, [search, open, doctorId])

  // Close on escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onOpenChange])

  const handleSelect = (callback: () => void) => {
    callback()
    onOpenChange(false)
    setSearch("")
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (dateStr === today.toISOString().split("T")[0]) {
      return "Hoy"
    } else if (dateStr === tomorrow.toISOString().split("T")[0]) {
      return "Mañana"
    }
    return date.toLocaleDateString("es-MX", { day: "numeric", month: "short" })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Command Dialog */}
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-xl">
        <Command
          className="rounded-xl border shadow-2xl bg-white overflow-hidden"
          shouldFilter={false}
        >
          {/* Search Input */}
          <div className="flex items-center border-b px-4">
            <Search className="h-5 w-5 text-gray-400 mr-3" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Buscar pacientes, citas, reportes..."
              className="flex-1 h-14 bg-transparent outline-none text-gray-900 placeholder:text-gray-400"
              autoFocus
            />
            {loading && <Loader2 className="h-5 w-5 text-gray-400 animate-spin mr-2" />}
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
            <kbd className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            {/* Quick Actions */}
            <Command.Group heading="Acciones rápidas">
              <Command.Item
                onSelect={() => handleSelect(() => router.push("/consultas/nueva"))}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer",
                  "hover:bg-orange-50 aria-selected:bg-orange-50"
                )}
              >
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Plus className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Nueva cita</p>
                  <p className="text-xs text-gray-500">Agendar una consulta</p>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect(() => router.push("/dashboard"))}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer",
                  "hover:bg-blue-50 aria-selected:bg-blue-50"
                )}
              >
                <div className="p-2 bg-blue-100 rounded-lg">
                  <LayoutDashboard className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Dashboard</p>
                  <p className="text-xs text-gray-500">Ver resumen del día</p>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect(() => router.push("/consultas"))}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer",
                  "hover:bg-green-50 aria-selected:bg-green-50"
                )}
              >
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Mis consultas</p>
                  <p className="text-xs text-gray-500">Ver calendario de citas</p>
                </div>
              </Command.Item>
            </Command.Group>

            {/* Patients */}
            {patients.length > 0 && (
              <Command.Group heading="Pacientes">
                {patients.map((patient) => (
                  <Command.Item
                    key={patient.id}
                    value={`patient-${patient.id}`}
                    onSelect={() =>
                      handleSelect(() => router.push(`/especialistas`))
                    }
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer",
                      "hover:bg-gray-50 aria-selected:bg-gray-50"
                    )}
                  >
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <User className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {patient.first_name} {patient.last_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {patient.email || patient.phone || "Sin contacto"}
                      </p>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Appointments */}
            {appointments.length > 0 && (
              <Command.Group heading="Próximas citas">
                {appointments.map((apt) => (
                  <Command.Item
                    key={apt.id}
                    value={`appointment-${apt.id}`}
                    onSelect={() =>
                      handleSelect(() => router.push(`/consultas/${apt.id}`))
                    }
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer",
                      "hover:bg-gray-50 aria-selected:bg-gray-50"
                    )}
                  >
                    <div className="p-2 bg-cyan-100 rounded-lg">
                      <Clock className="h-4 w-4 text-cyan-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {apt.patient?.first_name} {apt.patient?.last_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(apt.appointment_date)} • {apt.start_time.slice(0, 5)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        apt.status === "Programada"
                          ? "bg-blue-100 text-blue-700"
                          : apt.status === "Completada"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      )}
                    >
                      {apt.status}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Reports */}
            {reports.length > 0 && (
              <Command.Group heading="Reportes recientes">
                {reports.map((report) => (
                  <Command.Item
                    key={report.id}
                    value={`report-${report.id}`}
                    onSelect={() =>
                      handleSelect(() => router.push(`/reportes/${report.id}`))
                    }
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer",
                      "hover:bg-gray-50 aria-selected:bg-gray-50"
                    )}
                  >
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <FileText className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {report.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {report.patient?.first_name} {report.patient?.last_name} •{" "}
                        {new Date(report.created_at).toLocaleDateString("es-MX")}
                      </p>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Empty state */}
            {!loading &&
              search &&
              patients.length === 0 &&
              appointments.length === 0 &&
              reports.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No se encontraron resultados para "{search}"</p>
                </div>
              )}
          </Command.List>

          {/* Footer */}
          <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↑↓</kbd> navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↵</kbd> seleccionar
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">⌘K</kbd> para abrir
            </span>
          </div>
        </Command>
      </div>
    </div>
  )
}

// Hook to manage command palette state globally
export function useCommandPalette() {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  return { open, setOpen }
}
