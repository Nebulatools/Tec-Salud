// Gestión de órdenes de laboratorio y pasante virtual (vista doctor)
"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PatientFileCard } from "./patient-file-card"
import { Users, UserCheck } from "lucide-react"

type LinkedPatient = {
  id: string
  email: string
  full_name: string | null
}

type PatientSpecialty = {
  specialty_id: string
  specialty_name: string
}

export function LabOrdersAdmin({ doctorId }: { doctorId: string }) {
  const [patients, setPatients] = useState<LinkedPatient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<string>("")
  const [patientSpecialties, setPatientSpecialties] = useState<PatientSpecialty[]>([])
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("")
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)

    // Obtener pacientes vinculados
    const { data: linked } = await supabase
      .from("doctor_patient_links")
      .select("patient_user_id")
      .eq("doctor_id", doctorId)
      .eq("status", "accepted")

    const ids = Array.from(new Set(linked?.map((l) => l.patient_user_id) ?? []))

    if (ids.length > 0) {
      const { data: users } = await supabase
        .from("app_users")
        .select("id, email, full_name")
        .in("id", ids)

      setPatients(users ?? [])

      // Seleccionar primer paciente si no hay ninguno seleccionado
      if (!selectedPatient && users && users.length > 0) {
        setSelectedPatient(users[0].id)
      }
    } else {
      setPatients([])
    }

    setLoading(false)
  }

  // Cargar especialidades del paciente seleccionado
  const loadPatientSpecialties = async () => {
    if (!selectedPatient) {
      setPatientSpecialties([])
      setSelectedSpecialty("")
      return
    }

    // Obtener las especialidades donde el paciente tiene respuestas o lab_orders
    const { data: orders } = await supabase
      .from("lab_orders")
      .select("specialty_id, specialties(id, name)")
      .eq("patient_user_id", selectedPatient)
      .eq("doctor_id", doctorId)

    const seen = new Set<string>()
    const specialties: PatientSpecialty[] = []

    orders?.forEach((o) => {
      const spec = (o as any).specialties
      if (spec && !seen.has(spec.id)) {
        seen.add(spec.id)
        specialties.push({
          specialty_id: spec.id,
          specialty_name: spec.name,
        })
      }
    })

    setPatientSpecialties(specialties)

    // Seleccionar primera especialidad si existe
    if (specialties.length > 0 && !selectedSpecialty) {
      setSelectedSpecialty(specialties[0].specialty_id)
    } else if (specialties.length === 0) {
      setSelectedSpecialty("")
    }
  }

  useEffect(() => {
    if (doctorId) load()
  }, [doctorId])

  useEffect(() => {
    loadPatientSpecialties()
  }, [selectedPatient])

  const currentPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatient),
    [patients, selectedPatient]
  )

  const currentSpecialtyName = useMemo(
    () => patientSpecialties.find((s) => s.specialty_id === selectedSpecialty)?.specialty_name,
    [patientSpecialties, selectedSpecialty]
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
            <p className="text-sm text-gray-500 mt-3">Cargando pacientes...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-100">
            <Users className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <CardTitle>Fichas de Pacientes</CardTitle>
            <CardDescription>
              Selecciona un paciente para ver su ficha completa y ejecutar el pasante virtual.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selectores */}
        <div className="grid md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-orange-500" />
              Paciente vinculado
            </label>
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Selecciona un paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-medium">
                        {(p.full_name ?? p.email)?.[0]?.toUpperCase()}
                      </div>
                      {p.full_name ?? p.email}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {patients.length === 0 && (
              <p className="text-xs text-gray-500">No tienes pacientes vinculados aún.</p>
            )}
          </div>

          {patientSpecialties.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Especialidad</label>
              <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Selecciona especialidad" />
                </SelectTrigger>
                <SelectContent>
                  {patientSpecialties.map((s) => (
                    <SelectItem key={s.specialty_id} value={s.specialty_id}>
                      {s.specialty_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Ficha del paciente */}
        {selectedPatient && currentPatient ? (
          <PatientFileCard
            patientUserId={selectedPatient}
            patientName={currentPatient.full_name ?? currentPatient.email}
            patientEmail={currentPatient.email}
            doctorId={doctorId}
            specialtyId={selectedSpecialty || null}
            specialtyName={currentSpecialtyName || null}
          />
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Selecciona un paciente para ver su ficha</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
