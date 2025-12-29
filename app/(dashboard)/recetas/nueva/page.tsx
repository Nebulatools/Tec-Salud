"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAppUser } from "@/hooks/use-app-user"
import { supabase } from "@/lib/supabase"
import { PrescriptionForm } from "@/components/prescriptions/prescription-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileText, Search, User } from "lucide-react"
import { Input } from "@/components/ui/input"

interface Patient {
  id: string
  first_name: string
  last_name: string
  email: string | null
}

export default function NuevaRecetaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { doctorId, loading: userLoading } = useAppUser()

  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    searchParams.get("patient_id")
  )
  const [searchTerm, setSearchTerm] = useState("")

  const appointmentId = searchParams.get("appointment_id") || undefined

  useEffect(() => {
    async function fetchPatients() {
      if (!doctorId) return

      try {
        const { data, error } = await supabase
          .from("patients")
          .select("id, first_name, last_name, email")
          .eq("doctor_id", doctorId)
          .order("last_name", { ascending: true })

        if (error) throw error
        setPatients(data || [])
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
    return fullName.includes(searchTerm.toLowerCase())
  })

  const selectedPatient = patients.find((p) => p.id === selectedPatientId)

  const handleSuccess = () => {
    router.push("/recetas")
  }

  const handleCancel = () => {
    router.push("/recetas")
  }

  if (userLoading || loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded animate-shimmer" />
          <div className="h-8 w-48 rounded animate-shimmer" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-96 rounded animate-shimmer" />
          </CardContent>
        </Card>
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
      <div className="flex items-center gap-4">
        <Link href="/recetas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Nueva Receta
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Crea una nueva receta médica para un paciente
          </p>
        </div>
      </div>

      {/* Patient Selection */}
      {!selectedPatientId ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-zuli-veronica" />
              Seleccionar Paciente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Patient List */}
            {patients.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No tienes pacientes registrados.</p>
                <Link href="/expedientes/nuevo">
                  <Button className="mt-4" variant="outline">
                    Registrar primer paciente
                  </Button>
                </Link>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-8">
                <Search className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">
                  No se encontraron pacientes con "{searchTerm}"
                </p>
              </div>
            ) : (
              <div className="grid gap-2 max-h-80 overflow-y-auto">
                {filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => setSelectedPatientId(patient.id)}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-zuli-veronica hover:bg-zuli-veronica/5 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zuli-veronica/10 to-zuli-indigo/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-zuli-veronica">
                        {patient.first_name[0]}
                        {patient.last_name[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {patient.first_name} {patient.last_name}
                      </p>
                      {patient.email && (
                        <p className="text-sm text-gray-500 truncate">
                          {patient.email}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Selected Patient Header */}
          <Card className="border-zuli-veronica/20 bg-zuli-veronica/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zuli-veronica to-zuli-indigo flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {selectedPatient?.first_name[0]}
                      {selectedPatient?.last_name[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedPatient?.first_name} {selectedPatient?.last_name}
                    </p>
                    <p className="text-sm text-gray-500">Paciente seleccionado</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPatientId(null)}
                >
                  Cambiar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Prescription Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-zuli-veronica" />
                Datos de la Receta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PrescriptionForm
                patientId={selectedPatientId}
                appointmentId={appointmentId}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
