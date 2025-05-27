// Add medical report form component
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

interface AddReportFormProps {
  onSuccess: () => void
}

export default function AddReportForm({ onSuccess }: AddReportFormProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [open, setOpen] = useState(false)

  const [formData, setFormData] = useState({
    patient_id: "",
    report_type: "",
    title: "",
    content: "",
  })

  const reportTypes = [
    "Consulta General",
    "Diagnóstico",
    "Tratamiento",
    "Seguimiento",
    "Laboratorio",
    "Radiología",
    "Cirugía",
    "Interconsulta",
    "Alta Médica",
    "Otros",
  ]

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

      const { error: insertError } = await supabase.from("medical_reports").insert({
        doctor_id: doctor.id,
        patient_id: selectedPatient.id,
        report_type: formData.report_type,
        title: formData.title,
        content: formData.content,
      })

      if (insertError) {
        setError(insertError.message)
      } else {
        onSuccess()
      }
    } catch (error) {
      setError("Error al crear el reporte")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Información del Reporte</h3>

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

        {/* Report Type and Title */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="report_type">Tipo de Reporte *</Label>
            <select
              id="report_type"
              name="report_type"
              value={formData.report_type}
              onChange={handleChange}
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="">Seleccionar tipo</option>
              {reportTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título del Reporte *</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="Ej: Reporte Médico - Consulta General"
            />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <Label htmlFor="content">Contenido del Reporte *</Label>
          <Textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            required
            disabled={loading}
            rows={12}
            placeholder="Escriba el contenido completo del reporte médico..."
            className="min-h-[300px]"
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar Reporte"
          )}
        </Button>
      </div>
    </form>
  )
}
