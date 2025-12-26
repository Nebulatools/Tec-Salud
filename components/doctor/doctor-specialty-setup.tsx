// Permite que el doctor/admin seleccione su especialidad y quede visible en el marketplace
"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

type Specialty = { id: string; name: string; description: string | null }

const defaultSpecialties: Array<Pick<Specialty, "name" | "description">> = [
  { name: "Cardiología", description: "Corazón y sistema circulatorio" },
  { name: "Endocrinología", description: "Especialistas hormonales" },
  { name: "Medicina Interna", description: "Atención integral de adultos" },
]

const defaultQuestionsByName: Record<string, { prompt: string; field_type: string; options?: any; order_index: number }[]> = {
  Cardiología: [
    { prompt: "¿Presentas dolor de pecho al esfuerzo?", field_type: "boolean", order_index: 1 },
    { prompt: "¿Dolor en reposo o nocturno?", field_type: "boolean", order_index: 2 },
    { prompt: "¿Tienes antecedentes familiares de enfermedad cardiaca prematura (<55h/65m)?", field_type: "boolean", order_index: 3 },
    { prompt: "¿Tomas medicamentos para presión arterial? Menciona nombre y dosis", field_type: "long_text", order_index: 4 },
    { prompt: "¿Fumas actualmente o fumaste en los últimos 12 meses?", field_type: "boolean", order_index: 5 },
    { prompt: "¿Tienes diagnóstico de hipertensión o dislipidemia?", field_type: "boolean", order_index: 6 },
    { prompt: "¿Has tenido síncope, palpitaciones o falta de aire al esfuerzo?", field_type: "boolean", order_index: 7 },
    { prompt: "Último colesterol/LDL conocido (si aplica)", field_type: "short_text", order_index: 8 },
  ],
  Endocrinología: [
    { prompt: "¿Tienes diagnóstico previo de diabetes o tiroides?", field_type: "short_text", order_index: 1 },
    { prompt: "Última hemoglobina glucosilada (HbA1c)", field_type: "short_text", order_index: 2 },
    { prompt: "¿Has tenido cambios de peso recientes?", field_type: "boolean", order_index: 3 },
    { prompt: "¿Fatiga, intolerancia al frío/calor o caída de cabello?", field_type: "boolean", order_index: 4 },
    { prompt: "¿Embarazo o posparto reciente?", field_type: "boolean", order_index: 5 },
  ],
  "Medicina Interna": [
    { prompt: "Motivo principal de consulta", field_type: "long_text", order_index: 1 },
    { prompt: "Alergias conocidas", field_type: "long_text", order_index: 2 },
    { prompt: "Medicamentos actuales", field_type: "long_text", order_index: 3 },
    { prompt: "¿Fiebre, pérdida de peso o sudoraciones nocturnas?", field_type: "boolean", order_index: 4 },
  ],
}

export function DoctorSpecialtySetup({ doctorId }: { doctorId: string }) {
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [selected, setSelected] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentSpecialty, setCurrentSpecialty] = useState<string | null>(null)

  const chosen = useMemo(() => specialties.find((s) => s.id === selected), [specialties, selected])

  const load = async () => {
    setLoading(true)
    setError(null)

    const [
      { data: specs, error: specsError },
      { data: doctorRow, error: doctorError },
      { data: existingSpecs, error: linksError },
    ] = await Promise.all([
      supabase.from("specialties").select("id,name,description").order("name"),
      supabase.from("doctors").select("specialty").eq("id", doctorId).maybeSingle(),
      supabase.from("doctor_specialties").select("specialty_id").eq("doctor_id", doctorId).order("is_primary", { ascending: false }),
    ])

    // Si no hay especialidades, crear las de base para que el flujo no quede vacío
    if (!specsError && (specs?.length ?? 0) === 0) {
      await supabase
        .from("specialties")
        .upsert(defaultSpecialties, { onConflict: "name" })
      const { data: refreshed } = await supabase.from("specialties").select("id,name,description").order("name")
      if (refreshed) {
        setSpecialties(refreshed)
      }
    } else {
      setSpecialties(specs ?? [])
    }

    if (specsError || doctorError || linksError) {
      setError(specsError?.message ?? doctorError?.message ?? linksError?.message ?? "No se pudieron cargar los datos.")
    }

    const primary = existingSpecs?.[0]?.specialty_id ?? ""
    setSelected(primary)
    setCurrentSpecialty(doctorRow?.specialty ?? null)
    setLoading(false)
  }

  useEffect(() => {
    if (doctorId) load()
  }, [doctorId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) {
      setError("Selecciona una especialidad")
      return
    }
    setSaving(true)
    setError(null)
    setStatus(null)

    const specialtyName = chosen?.name ?? "General Medicine"

    const { error: doctorError } = await supabase
      .from("doctors")
      .update({ specialty: specialtyName, is_specialist: true, doctor_role: "admin" })
      .eq("id", doctorId)

    if (doctorError) {
      setError(doctorError.message)
      setSaving(false)
      return
    }

    await supabase.from("doctor_specialties").delete().eq("doctor_id", doctorId)
    const { error: linkError } = await supabase
      .from("doctor_specialties")
      .insert({ doctor_id: doctorId, specialty_id: selected, is_primary: true })

    if (linkError) {
      setError(linkError.message)
      setSaving(false)
      return
    }

    // Si la especialidad no tiene preguntas, sembrar preguntas base para habilitar el cuestionario.
    const { data: existingPrompts } = await supabase
      .from("specialist_questions")
      .select("prompt")
      .eq("specialty_id", selected)

    const defaults = defaultQuestionsByName[specialtyName] ?? []
    const toInsert = defaults.filter(
      (dq) => !(existingPrompts ?? []).some((ep) => ep.prompt?.trim() === dq.prompt.trim()),
    )
    if (toInsert.length > 0) {
      await supabase.from("specialist_questions").insert(
        toInsert.map((q) => ({
          specialty_id: selected,
          prompt: q.prompt,
          field_type: q.field_type,
          options: q.options ?? {},
          is_required: true,
          order_index: q.order_index,
          active: true,
        })),
      )
    }

    setStatus("Especialidad guardada. Los pacientes ahora verán esta especialidad y sus cuestionarios asociados.")
    setCurrentSpecialty(specialtyName)
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configura tu especialidad</CardTitle>
        <CardDescription>
          Define la especialidad con la que te verán los pacientes y que activará el cuestionario extra y los laboratorios
          sugeridos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <p className="text-sm text-gray-500">Cargando especialidades...</p>}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {status && (
          <Alert className="bg-green-50 border-green-200 text-green-700">
            <AlertDescription>{status}</AlertDescription>
          </Alert>
        )}

        <form className="grid md:grid-cols-2 gap-4 items-end" onSubmit={handleSave}>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Especialidad principal</p>
            <Select value={selected} onValueChange={setSelected} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona especialidad" />
              </SelectTrigger>
              <SelectContent>
                {specialties.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {chosen?.description && <p className="text-xs text-gray-500">{chosen.description}</p>}
            {currentSpecialty && (
              <p className="text-xs text-gray-500">Actual: {currentSpecialty}</p>
            )}
          </div>
          <div>
            <Button type="submit" className="btn-zuli-gradient text-white w-full md:w-auto rounded-xl font-medium" disabled={saving || loading}>
              {saving ? "Guardando..." : "Guardar especialidad"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
