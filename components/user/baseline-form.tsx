// Formulario base del paciente (vista user)
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

type BaselineState = {
  blood_type: string
  height_cm: string
  weight_kg: string
  allergies: string
  chronic_conditions: string
  medications: string
  surgeries: string
  lifestyle: string
}

export function BaselineForm() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<BaselineState>({
    blood_type: "",
    height_cm: "",
    weight_kg: "",
    allergies: "",
    chronic_conditions: "",
    medications: "",
    surgeries: "",
    lifestyle: "",
  })

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const { data } = await supabase
        .from("patient_baseline_forms")
        .select("general_info, vitals, lifestyle, conditions")
        .eq("patient_user_id", user.id)
        .maybeSingle()

      if (data) {
        const generalInfo = data.general_info as Record<string, unknown>
        const vitals = data.vitals as Record<string, unknown>
        const conditions = data.conditions as Record<string, unknown>
        const lifestyle = data.lifestyle as Record<string, unknown>

        setForm({
          blood_type: (generalInfo?.blood_type as string) ?? "",
          height_cm: (vitals?.height_cm as string) ?? "",
          weight_kg: (vitals?.weight_kg as string) ?? "",
          allergies: (generalInfo?.allergies as string) ?? "",
          chronic_conditions: (conditions?.chronic_conditions as string) ?? "",
          medications: (conditions?.medications as string) ?? "",
          surgeries: (conditions?.surgeries as string) ?? "",
          lifestyle: (lifestyle?.notes as string) ?? "",
        })
      }
      setLoading(false)
    }
    load()
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setStatus(null)
    setError(null)

    const general_info = {
      blood_type: form.blood_type,
      allergies: form.allergies,
    }
    const vitals = {
      height_cm: form.height_cm,
      weight_kg: form.weight_kg,
    }
    const lifestyle = {
      notes: form.lifestyle,
    }
    const conditions = {
      chronic_conditions: form.chronic_conditions,
      medications: form.medications,
      surgeries: form.surgeries,
    }

    const { error: upsertError } = await supabase.from("patient_baseline_forms").upsert({
      patient_user_id: user.id,
      general_info,
      vitals,
      lifestyle,
      conditions,
    })

    if (upsertError) {
      setError(upsertError.message)
      setSaving(false)
      return
    }

    await supabase.from("patient_profiles").upsert({
      id: user.id,
      baseline_completed: true,
    })

    setStatus("Guardado. Tu médico verá estos datos en sus consultas.")
    setSaving(false)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-gray-500">Cargando formulario...</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Formulario médico base</CardTitle>
        <CardDescription>Completa tus datos generales antes de solicitar una consulta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de sangre</Label>
              <Input
                value={form.blood_type}
                onChange={(e) => setForm((prev) => ({ ...prev, blood_type: e.target.value }))}
                placeholder="O+, A-, etc."
              />
            </div>
            <div className="space-y-2">
              <Label>Estatura (cm)</Label>
              <Input
                value={form.height_cm}
                onChange={(e) => setForm((prev) => ({ ...prev, height_cm: e.target.value }))}
                type="number"
              />
            </div>
            <div className="space-y-2">
              <Label>Peso (kg)</Label>
              <Input
                value={form.weight_kg}
                onChange={(e) => setForm((prev) => ({ ...prev, weight_kg: e.target.value }))}
                type="number"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Alergias</Label>
              <Textarea
                value={form.allergies}
                onChange={(e) => setForm((prev) => ({ ...prev, allergies: e.target.value }))}
                placeholder="Medicamentos, alimentos, ambiente..."
              />
            </div>
            <div className="space-y-2">
              <Label>Condiciones crónicas</Label>
              <Textarea
                value={form.chronic_conditions}
                onChange={(e) => setForm((prev) => ({ ...prev, chronic_conditions: e.target.value }))}
                placeholder="Diabetes, hipertensión, etc."
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Medicamentos actuales</Label>
              <Textarea
                value={form.medications}
                onChange={(e) => setForm((prev) => ({ ...prev, medications: e.target.value }))}
                placeholder="Nombre, dosis, frecuencia"
              />
            </div>
            <div className="space-y-2">
              <Label>Cirugías / hospitalizaciones previas</Label>
              <Textarea
                value={form.surgeries}
                onChange={(e) => setForm((prev) => ({ ...prev, surgeries: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Estilo de vida</Label>
            <Textarea
              value={form.lifestyle}
              onChange={(e) => setForm((prev) => ({ ...prev, lifestyle: e.target.value }))}
              placeholder="Tabaco, alcohol, ejercicio, dieta"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {status && (
            <Alert className="bg-zuli-veronica/10 border-zuli-veronica/20 text-zuli-veronica">
              <AlertDescription>{status}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="btn-zuli-gradient" disabled={saving}>
            {saving ? "Guardando..." : "Guardar formulario"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
