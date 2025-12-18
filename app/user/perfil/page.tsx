// Página de perfil / cuestionario base del usuario
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  User,
  Heart,
  Activity,
  Pill,
  FileText,
  CheckCircle2,
  Save,
  Loader2,
  X,
  Plus,
} from "lucide-react"

// Opciones predefinidas
const BLOOD_TYPES = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-", "No sé"]

const COMMON_ALLERGIES = [
  "Penicilina",
  "Aspirina / AINEs",
  "Sulfas",
  "Látex",
  "Mariscos",
  "Maní / cacahuate",
  "Lácteos",
  "Gluten",
  "Polen",
  "Ácaros",
  "Ninguna conocida",
]

const CHRONIC_CONDITIONS = [
  "Diabetes tipo 1",
  "Diabetes tipo 2",
  "Hipertensión arterial",
  "Asma",
  "EPOC",
  "Enfermedad cardiaca",
  "Hipotiroidismo",
  "Hipertiroidismo",
  "Artritis",
  "Depresión / ansiedad",
  "Ninguna",
]

const LIFESTYLE_OPTIONS = {
  smoking: ["No fumo", "Fumador ocasional", "Menos de 10 cigarros/día", "Más de 10 cigarros/día", "Ex fumador"],
  alcohol: ["No bebo", "Ocasional (social)", "1-2 veces/semana", "3+ veces/semana", "Diario"],
  exercise: ["Sedentario", "1-2 veces/semana", "3-4 veces/semana", "5+ veces/semana", "Atleta"],
  diet: ["Balanceada", "Vegetariana", "Vegana", "Keto/baja en carbohidratos", "Sin restricciones", "Otra"],
}

type BaselineState = {
  blood_type: string
  height_cm: string
  weight_kg: string
  allergies: string[]
  other_allergy: string
  chronic_conditions: string[]
  other_condition: string
  medications: { name: string; dose: string; frequency: string }[]
  has_surgeries: boolean | null
  surgeries: string
  smoking: string
  alcohol: string
  exercise: string
  diet: string
}

export default function PerfilPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<BaselineState>({
    blood_type: "",
    height_cm: "",
    weight_kg: "",
    allergies: [],
    other_allergy: "",
    chronic_conditions: [],
    other_condition: "",
    medications: [],
    has_surgeries: null,
    surgeries: "",
    smoking: "",
    alcohol: "",
    exercise: "",
    diet: "",
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
        const gi = data.general_info as Record<string, unknown> | null
        const v = data.vitals as Record<string, unknown> | null
        const l = data.lifestyle as Record<string, unknown> | null
        const c = data.conditions as Record<string, unknown> | null

        // Ensure arrays are actually arrays
        const allergiesRaw = gi?.allergies
        const allergiesArr = Array.isArray(allergiesRaw) ? allergiesRaw : []

        const conditionsRaw = c?.chronic_conditions
        const conditionsArr = Array.isArray(conditionsRaw) ? conditionsRaw : []

        const medsRaw = c?.medications
        const medsArr = Array.isArray(medsRaw) ? medsRaw : []

        setForm({
          blood_type: typeof gi?.blood_type === 'string' ? gi.blood_type : "",
          height_cm: typeof v?.height_cm === 'string' ? v.height_cm : "",
          weight_kg: typeof v?.weight_kg === 'string' ? v.weight_kg : "",
          allergies: allergiesArr,
          other_allergy: typeof gi?.other_allergy === 'string' ? gi.other_allergy : "",
          chronic_conditions: conditionsArr,
          other_condition: typeof c?.other_condition === 'string' ? c.other_condition : "",
          medications: medsArr,
          has_surgeries: typeof c?.has_surgeries === 'boolean' ? c.has_surgeries : null,
          surgeries: typeof c?.surgeries === 'string' ? c.surgeries : "",
          smoking: typeof l?.smoking === 'string' ? l.smoking : "",
          alcohol: typeof l?.alcohol === 'string' ? l.alcohol : "",
          exercise: typeof l?.exercise === 'string' ? l.exercise : "",
          diet: typeof l?.diet === 'string' ? l.diet : "",
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
      other_allergy: form.other_allergy,
    }
    const vitals = {
      height_cm: form.height_cm,
      weight_kg: form.weight_kg,
    }
    const lifestyle = {
      smoking: form.smoking,
      alcohol: form.alcohol,
      exercise: form.exercise,
      diet: form.diet,
    }
    const conditions = {
      chronic_conditions: form.chronic_conditions,
      other_condition: form.other_condition,
      medications: form.medications,
      has_surgeries: form.has_surgeries,
      surgeries: form.surgeries,
    }

    const { error: upsertError } = await supabase.from("patient_baseline_forms").upsert(
      {
        patient_user_id: user.id,
        general_info,
        vitals,
        lifestyle,
        conditions,
      },
      { onConflict: "patient_user_id" }
    )

    if (upsertError) {
      setError(upsertError.message)
      setSaving(false)
      return
    }

    await supabase.from("patient_profiles").upsert({
      id: user.id,
      baseline_completed: true,
    })

    setStatus("¡Guardado! Tu médico verá estos datos en tus consultas.")
    setSaving(false)

    setTimeout(() => {
      router.push("/user")
    }, 2000)
  }

  const toggleAllergy = (allergy: string) => {
    setForm((prev) => ({
      ...prev,
      allergies: prev.allergies.includes(allergy)
        ? prev.allergies.filter((a) => a !== allergy)
        : [...prev.allergies.filter((a) => a !== "Ninguna conocida"), allergy],
    }))
  }

  const toggleCondition = (condition: string) => {
    setForm((prev) => ({
      ...prev,
      chronic_conditions: prev.chronic_conditions.includes(condition)
        ? prev.chronic_conditions.filter((c) => c !== condition)
        : [...prev.chronic_conditions.filter((c) => c !== "Ninguna"), condition],
    }))
  }

  const addMedication = () => {
    setForm((prev) => ({
      ...prev,
      medications: [...prev.medications, { name: "", dose: "", frequency: "" }],
    }))
  }

  const updateMedication = (index: number, field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      medications: prev.medications.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    }))
  }

  const removeMedication = (index: number) => {
    setForm((prev) => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index),
    }))
  }

  // Calcular progreso
  const totalFields = 8
  let filledFields = 0
  if (form.blood_type) filledFields++
  if (form.height_cm) filledFields++
  if (form.weight_kg) filledFields++
  if (form.allergies.length > 0) filledFields++
  if (form.chronic_conditions.length > 0) filledFields++
  if (form.has_surgeries !== null) filledFields++
  if (form.smoking) filledFields++
  if (form.exercise) filledFields++
  const progress = (filledFields / totalFields) * 100

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-zuli-veronica/20 border-t-zuli-veronica mx-auto" />
          <p className="text-gray-500 mt-3">Cargando tu perfil...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-zuli-veronica to-zuli-indigo text-white border-0">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/20">
              <User className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Cuestionario Base</h1>
              <p className="text-white/80 text-sm">
                Tu información médica general para una mejor atención
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/80">Completado</p>
              <p className="text-2xl font-bold">{Math.round(progress)}%</p>
            </div>
          </div>
          <Progress value={progress} className="mt-4 h-2 bg-white/30" />
        </CardContent>
      </Card>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Información básica */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              <CardTitle className="text-base">Información Básica</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo de sangre</Label>
                <Select
                  value={form.blood_type}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, blood_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estatura (cm)</Label>
                <Input
                  value={form.height_cm}
                  onChange={(e) => setForm((prev) => ({ ...prev, height_cm: e.target.value }))}
                  type="number"
                  placeholder="170"
                />
              </div>
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Input
                  value={form.weight_kg}
                  onChange={(e) => setForm((prev) => ({ ...prev, weight_kg: e.target.value }))}
                  type="number"
                  placeholder="70"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alergias */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base">Alergias Conocidas</CardTitle>
            </div>
            <p className="text-sm text-gray-500">Selecciona todas las que apliquen</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGIES.map((allergy) => {
                const isSelected = form.allergies.includes(allergy)
                return (
                  <Badge
                    key={allergy}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? "bg-zuli-indigo hover:bg-zuli-indigo-600"
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => toggleAllergy(allergy)}
                  >
                    {isSelected && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {allergy}
                  </Badge>
                )
              })}
            </div>
            {!form.allergies.includes("Ninguna conocida") && (
              <div className="space-y-2">
                <Label className="text-sm text-gray-500">¿Otra alergia no listada?</Label>
                <Input
                  value={form.other_allergy}
                  onChange={(e) => setForm((prev) => ({ ...prev, other_allergy: e.target.value }))}
                  placeholder="Especificar otra alergia..."
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Condiciones crónicas */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-900" />
              <CardTitle className="text-base">Condiciones Crónicas</CardTitle>
            </div>
            <p className="text-sm text-gray-500">Selecciona todas las que apliquen</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {CHRONIC_CONDITIONS.map((condition) => {
                const isSelected = form.chronic_conditions.includes(condition)
                return (
                  <Badge
                    key={condition}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? "bg-zuli-veronica hover:bg-zuli-veronica-600"
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => toggleCondition(condition)}
                  >
                    {isSelected && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {condition}
                  </Badge>
                )
              })}
            </div>
            {!form.chronic_conditions.includes("Ninguna") && (
              <div className="space-y-2">
                <Label className="text-sm text-gray-500">¿Otra condición no listada?</Label>
                <Input
                  value={form.other_condition}
                  onChange={(e) => setForm((prev) => ({ ...prev, other_condition: e.target.value }))}
                  placeholder="Especificar otra condición..."
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Medicamentos */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-zuli-veronica" />
                <CardTitle className="text-base">Medicamentos Actuales</CardTitle>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addMedication}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {form.medications.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No has agregado medicamentos. Si tomas alguno, haz clic en &quot;Agregar&quot;.
              </p>
            ) : (
              form.medications.map((med, index) => (
                <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Nombre"
                      value={med.name}
                      onChange={(e) => updateMedication(index, "name", e.target.value)}
                    />
                    <Input
                      placeholder="Dosis"
                      value={med.dose}
                      onChange={(e) => updateMedication(index, "dose", e.target.value)}
                    />
                    <Select
                      value={med.frequency}
                      onValueChange={(v) => updateMedication(index, "frequency", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Frecuencia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1x/día">1 vez al día</SelectItem>
                        <SelectItem value="2x/día">2 veces al día</SelectItem>
                        <SelectItem value="3x/día">3 veces al día</SelectItem>
                        <SelectItem value="c/8h">Cada 8 horas</SelectItem>
                        <SelectItem value="c/12h">Cada 12 horas</SelectItem>
                        <SelectItem value="PRN">Según necesidad</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMedication(index)}
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Cirugías */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base">Cirugías / Hospitalizaciones</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>¿Has tenido alguna cirugía u hospitalización?</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={form.has_surgeries === true ? "default" : "outline"}
                  className={form.has_surgeries === true ? "bg-zuli-indigo hover:bg-zuli-indigo-600" : ""}
                  onClick={() => setForm((prev) => ({ ...prev, has_surgeries: true }))}
                >
                  Sí
                </Button>
                <Button
                  type="button"
                  variant={form.has_surgeries === false ? "default" : "outline"}
                  className={form.has_surgeries === false ? "bg-gray-500 hover:bg-gray-600" : ""}
                  onClick={() => setForm((prev) => ({ ...prev, has_surgeries: false, surgeries: "" }))}
                >
                  No
                </Button>
              </div>
            </div>
            {form.has_surgeries && (
              <div className="space-y-2">
                <Label className="text-sm text-gray-500">Describe brevemente (año y procedimiento)</Label>
                <Input
                  value={form.surgeries}
                  onChange={(e) => setForm((prev) => ({ ...prev, surgeries: e.target.value }))}
                  placeholder="Ej: 2020 - Apendicectomía"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estilo de vida */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-900" />
              <CardTitle className="text-base">Estilo de Vida</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tabaco</Label>
                <Select
                  value={form.smoking}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, smoking: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {LIFESTYLE_OPTIONS.smoking.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alcohol</Label>
                <Select
                  value={form.alcohol}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, alcohol: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {LIFESTYLE_OPTIONS.alcohol.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ejercicio</Label>
                <Select
                  value={form.exercise}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, exercise: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {LIFESTYLE_OPTIONS.exercise.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dieta</Label>
                <Select
                  value={form.diet}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, diet: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {LIFESTYLE_OPTIONS.diet.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mensajes */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {status && (
          <Alert className="bg-zuli-veronica/10 border-zuli-veronica/20 text-zuli-veronica">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{status}</AlertDescription>
          </Alert>
        )}

        {/* Botón guardar */}
        <Button
          type="submit"
          className="w-full btn-zuli-gradient"
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar cuestionario
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
