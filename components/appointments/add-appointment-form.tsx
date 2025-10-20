// Add appointment form component
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Loader2, Search } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface Patient {
  id: string
  first_name: string
  last_name: string
}

interface AddAppointmentFormProps {
  onSuccess: () => void
  onCancel?: () => void
}

export default function AddAppointmentForm({ onSuccess, onCancel }: AddAppointmentFormProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [open, setOpen] = useState(false)

  const [formData, setFormData] = useState({
    patient_id: "",
    appointment_date: "",
    start_time: "",
    end_time: "",
    notes: "",
  })

  useEffect(() => {
    fetchPatients()
  }, [user])

  const fetchPatients = async () => {
    if (!user) return

    try {
      const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user.id).single()
      if (!doctor) return

      const { data } = await supabase
        .from("patients")
        .select("id, first_name, last_name")
        .eq("doctor_id", doctor.id)
        .order("first_name", { ascending: true })

      if (data) {
        setPatients(data)
      }
    } catch (error) {
      console.error("Error fetching patients:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user?.id).single()
      if (!doctor) {
        setError("Error: No se encontró información del doctor")
        return
      }

      if (!selectedPatient) {
        setError("Por favor selecciona un paciente")
        return
      }

      const { error: insertError } = await supabase.from("appointments").insert({
        doctor_id: doctor.id,
        patient_id: selectedPatient.id,
        appointment_date: formData.appointment_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        notes: formData.notes || null,
        status: "Programada",
      })

      if (insertError) {
        setError(insertError.message)
      } else {
        onSuccess()
      }
    } catch (error) {
      setError("Error al crear la cita")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Información de la Cita</h3>

        {/* Patient Selection */}
        <div className="space-y-2">
          <Label>Paciente *</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                {selectedPatient
                  ? `${selectedPatient.first_name} ${selectedPatient.last_name}`
                  : "Seleccionar paciente..."}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Buscar paciente..." />
                <CommandList>
                  <CommandEmpty>No se encontraron pacientes.</CommandEmpty>
                  <CommandGroup>
                    {patients.map((patient) => (
                      <CommandItem
                        key={patient.id}
                        onSelect={() => {
                          setSelectedPatient(patient)
                          setOpen(false)
                        }}
                      >
                        {patient.first_name} {patient.last_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="appointment_date">Fecha *</Label>
            <Input
              id="appointment_date"
              name="appointment_date"
              type="date"
              value={formData.appointment_date}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_time">Hora de Inicio *</Label>
            <Input
              id="start_time"
              name="start_time"
              type="time"
              value={formData.start_time}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_time">Hora de Fin *</Label>
            <Input
              id="end_time"
              name="end_time"
              type="time"
              value={formData.end_time}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            disabled={loading}
            rows={3}
            placeholder="Notas adicionales sobre la cita..."
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => {
            if (typeof onCancel === 'function') onCancel()
          }}
        >
          Cancelar
        </Button>
        <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Programando...
            </>
          ) : (
            "Programar Cita"
          )}
        </Button>
      </div>
    </form>
  )
}
