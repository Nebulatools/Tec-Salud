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
import { Checkbox } from "@/components/ui/checkbox"
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
  Sparkles,
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

const FAMILY_HISTORY = [
  { id: "hipertension", label: "Hipertensión" },
  { id: "diabetes", label: "Diabetes" },
  { id: "cardiopatias", label: "Cardiopatías" },
  { id: "hepatopatias", label: "Hepatopatías" },
  { id: "tumores", label: "Tumores" },
  { id: "mentales", label: "Mentales" },
]

const PERSONAL_HISTORY = [
  { id: "hipertension_p", label: "Hipertensión" },
  { id: "diabetes_p", label: "Diabetes" },
  { id: "cardiopatias_p", label: "Cardiopatías" },
  { id: "hepatopatias_p", label: "Hepatopatías" },
  { id: "nefritis", label: "Nefritis" },
  { id: "tumores_p", label: "Tumores" },
  { id: "tromboflebitis", label: "Tromboflebitis" },
  { id: "mentales_p", label: "Mentales" },
  { id: "fuma", label: "Fuma", followUp: "cigarettes" },
  { id: "infeccion_pelvica", label: "Infección pélvica", femaleOnly: true },
  { id: "infeccion_cervical", label: "Infección cervical", femaleOnly: true },
  { id: "flujo_vaginal", label: "Flujo vaginal", femaleOnly: true },
  { id: "cirugia_ginecologica", label: "Cirugía ginecológica", femaleOnly: true },
  { id: "otros", label: "Otros", hasText: true },
  { id: "resultado_citologia", label: "Resultado citología", femaleOnly: true, hasDate: true },
]

type BaselineState = {
  gender: string
  birth_date: string
  blood_type: string
  height_cm: string
  weight_kg: string
  percentile_height: number | null
  percentile_weight: number | null
  allergies: string[]
  other_allergy: string
  chronic_conditions: string[]
  other_condition: string
  medications: { name: string; dose: string; frequency: string }[]
  has_surgeries: boolean | null
  surgeries: { id: string; description: string }[]
  smoking: string
  alcohol: string
  exercise: string
  diet: string
  family_history: Record<string, string>
  personal_history: Record<string, string>
  fuma_cigarettes: string
  other_personal: string
  citologia_result: string
  citologia_date: string
}

export default function PerfilPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<BaselineState>({
    gender: "",
    birth_date: "",
    blood_type: "",
    height_cm: "",
    weight_kg: "",
    percentile_height: null,
    percentile_weight: null,
    allergies: [],
    other_allergy: "",
    chronic_conditions: [],
    other_condition: "",
    medications: [],
    has_surgeries: null,
    surgeries: [],
    smoking: "",
    alcohol: "",
    exercise: "",
    diet: "",
    family_history: {},
    personal_history: {},
    fuma_cigarettes: "",
    other_personal: "",
    citologia_result: "",
    citologia_date: "",
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
        const gi = data.general_info as any
        const v = data.vitals as any
        const l = data.lifestyle as any
        const c = data.conditions as any

        // Ensure arrays are actually arrays
        const allergiesRaw = gi?.allergies
        const allergiesArr = Array.isArray(allergiesRaw) ? allergiesRaw : []

        const conditionsRaw = c?.chronic_conditions
        const conditionsArr = Array.isArray(conditionsRaw) ? conditionsRaw : []

        const medsRaw = c?.medications
        const medsArr = Array.isArray(medsRaw) ? medsRaw : []

        const surgeriesRaw = c?.surgeries
        const surgeriesArr = Array.isArray(surgeriesRaw)
          ? surgeriesRaw
          : surgeriesRaw
            ? [{ id: "s-0", description: String(surgeriesRaw) }]
            : []

        setForm({
          gender: gi?.gender ?? "",
          birth_date: gi?.birth_date ?? "",
          blood_type: gi?.blood_type ?? "",
          height_cm: v?.height_cm ?? "",
          weight_kg: v?.weight_kg ?? "",
          percentile_height: v?.percentile_height ?? null,
          percentile_weight: v?.percentile_weight ?? null,
          allergies: allergiesArr,
          other_allergy: gi?.other_allergy ?? "",
          chronic_conditions: conditionsArr,
          other_condition: c?.other_condition ?? "",
          medications: medsArr,
          has_surgeries: c?.has_surgeries ?? null,
          surgeries: surgeriesArr,
          smoking: l?.smoking ?? "",
          alcohol: l?.alcohol ?? "",
          exercise: l?.exercise ?? "",
          diet: l?.diet ?? "",
          family_history: gi?.family_history ?? {},
          personal_history: c?.personal_history ?? {},
          fuma_cigarettes: c?.fuma_cigarettes ?? "",
          other_personal: c?.other_personal ?? "",
          citologia_result: c?.citologia_result ?? "",
          citologia_date: c?.citologia_date ?? "",
        })
      }
      setLoading(false)
    }
    load()
  }, [user])

  const calculateAge = (dateString: string) => {
    if (!dateString) return null
    const birth = new Date(dateString)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const estimatePercentiles = (height: number, weight: number, gender: string, age: number | null) => {
    // Estimación sencilla (no clínica) para dar contexto rápido; usa promedios de adultos.
    const norms =
      gender === "Femenino"
        ? { heightAvg: 162, heightSd: 7, bmiPivot: 23 }
        : { heightAvg: 175, heightSd: 7.5, bmiPivot: 24 }

    const bmi = weight && height ? weight / Math.pow(height / 100, 2) : null

    const percentileFromZ = (z: number) => {
      // Aproximación lineal simple para mostrar rango (no es una tabla CDC)
      const p = Math.round(50 + z * 15)
      return Math.min(99, Math.max(1, p))
    }

    const heightZ = height ? (height - norms.heightAvg) / norms.heightSd : null
    const weightPercentile = bmi !== null ? percentileFromZ((bmi - norms.bmiPivot) / 4) : null
    const heightPercentile = heightZ !== null ? percentileFromZ(heightZ) : null

    return {
      bmi,
      weightPercentile,
      heightPercentile,
    }
  }

  useEffect(() => {
    const h = Number.parseFloat(form.height_cm)
    const w = Number.parseFloat(form.weight_kg)
    const age = calculateAge(form.birth_date)
    if (Number.isFinite(h) && Number.isFinite(w) && form.gender) {
      const { weightPercentile, heightPercentile } = estimatePercentiles(h, w, form.gender, age)
      setForm((prev) => ({
        ...prev,
        percentile_height: heightPercentile,
        percentile_weight: weightPercentile,
      }))
    }
  }, [form.height_cm, form.weight_kg, form.birth_date, form.gender])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setStatus(null)
    setError(null)

    const general_info = {
      gender: form.gender,
      birth_date: form.birth_date,
      blood_type: form.blood_type,
      allergies: form.allergies,
      other_allergy: form.other_allergy,
      family_history: form.family_history,
    }
    const vitals = {
      height_cm: form.height_cm,
      weight_kg: form.weight_kg,
      percentile_height: form.percentile_height,
      percentile_weight: form.percentile_weight,
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
      personal_history: form.personal_history,
      fuma_cigarettes: form.fuma_cigarettes,
      other_personal: form.other_personal,
      citologia_result: form.citologia_result,
      citologia_date: form.citologia_date,
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

  const addOtherAllergy = () => {
    if (!form.other_allergy.trim()) return
    setForm((prev) => ({
      ...prev,
      allergies: [...prev.allergies.filter((a) => a !== "Ninguna conocida"), prev.other_allergy.trim()],
      other_allergy: "",
    }))
  }

  const updateFamilyHistory = (id: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      family_history: { ...prev.family_history, [id]: value },
    }))
  }

  const updatePersonalHistory = (id: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      personal_history: { ...prev.personal_history, [id]: value },
    }))
  }

  const addSurgery = () => {
    setForm((prev) => ({
      ...prev,
      surgeries: [...prev.surgeries, { id: `s-${Date.now()}`, description: "" }],
      has_surgeries: true,
    }))
  }

  const updateSurgery = (id: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      surgeries: prev.surgeries.map((s) => (s.id === id ? { ...s, description: value } : s)),
    }))
  }

  const removeSurgery = (id: string) => {
    setForm((prev) => ({
      ...prev,
      surgeries: prev.surgeries.filter((s) => s.id !== id),
    }))
  }

  const isFemale = form.gender === "Femenino"

  // Calcular progreso
  const totalFields = 10
  let filledFields = 0
  if (form.gender) filledFields++
  if (form.birth_date) filledFields++
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
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Género</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, gender: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Femenino">Femenino</SelectItem>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha de nacimiento</Label>
                <Input
                  value={form.birth_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, birth_date: e.target.value }))}
                  type="date"
                />
              </div>
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
            {(form.percentile_height || form.percentile_weight) && (
              <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                {form.percentile_height && (
                  <Badge variant="secondary" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-zuli-veronica" />
                    Estatura aprox. p{form.percentile_height}
                  </Badge>
                )}
                {form.percentile_weight && (
                  <Badge variant="secondary" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-zuli-indigo" />
                    Peso aprox. p{form.percentile_weight}
                  </Badge>
                )}
                <p className="text-xs text-gray-500 w-full">
                  *Estimación rápida basada en promedio poblacional; no reemplaza tablas de referencia clínicas.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alergias */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base">Alergias</CardTitle>
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
                <div className="flex gap-2">
                  <Input
                    value={form.other_allergy}
                    onChange={(e) => setForm((prev) => ({ ...prev, other_allergy: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addOtherAllergy()
                      }
                    }}
                    placeholder="Especificar otra alergia..."
                  />
                  <Button type="button" variant="outline" onClick={addOtherAllergy}>
                    Agregar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Condiciones crónicas */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-900" />
              <CardTitle className="text-base">Condiciones y antecedentes</CardTitle>
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

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  <p className="font-medium text-gray-800">Antecedentes familiares</p>
                </div>
                <div className="space-y-3">
                  {FAMILY_HISTORY.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4">
                      <span className="text-sm text-gray-700">{item.label}</span>
                      <div className="flex gap-2">
                        {["SI", "NO", "NO SABE"].map((opt) => (
                          <Button
                            key={opt}
                            type="button"
                            size="sm"
                            variant={form.family_history[item.id] === opt ? "default" : "outline"}
                            onClick={() => updateFamilyHistory(item.id, opt)}
                            className={form.family_history[item.id] === opt ? "bg-zuli-indigo hover:bg-zuli-indigo-600" : ""}
                          >
                            {opt}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-zuli-indigo" />
                  <p className="font-medium text-gray-800">Antecedentes personales</p>
                </div>
                <div className="space-y-3">
                  {PERSONAL_HISTORY.filter((p) => !p.femaleOnly || isFemale).map((item) => (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-gray-700">{item.label}</span>
                        <div className="flex gap-2">
                          {["SI", "NO", "NO SABE"].map((opt) => (
                            <Button
                              key={opt}
                              type="button"
                              size="sm"
                              variant={form.personal_history[item.id] === opt ? "default" : "outline"}
                              onClick={() => updatePersonalHistory(item.id, opt)}
                              className={
                                form.personal_history[item.id] === opt ? "bg-zuli-veronica hover:bg-zuli-veronica-600" : ""
                              }
                            >
                              {opt}
                            </Button>
                          ))}
                        </div>
                      </div>
                      {item.followUp === "cigarettes" && form.personal_history[item.id] === "SI" && (
                        <div className="pl-2">
                          <Label className="text-xs text-gray-500">¿Cuántos diarios?</Label>
                          <Input
                            value={form.fuma_cigarettes}
                            onChange={(e) => setForm((prev) => ({ ...prev, fuma_cigarettes: e.target.value }))}
                            placeholder="Ej. 5"
                          />
                        </div>
                      )}
                      {item.hasDate && (
                        <div className="pl-2 grid grid-cols-2 gap-2">
                          <Input
                            type="text"
                            value={form.citologia_result}
                            onChange={(e) => setForm((prev) => ({ ...prev, citologia_result: e.target.value }))}
                            placeholder="Resultado"
                          />
                          <Input
                            type="date"
                            value={form.citologia_date}
                            onChange={(e) => setForm((prev) => ({ ...prev, citologia_date: e.target.value }))}
                            placeholder="Fecha"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
                No has agregado medicamentos. Si tomas alguno, haz clic en "Agregar".
              </p>
            ) : (
              form.medications.map((med, index) => (
                <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Compuesto"
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
                  onClick={() => setForm((prev) => ({ ...prev, has_surgeries: true, surgeries: prev.surgeries.length ? prev.surgeries : [{ id: "s-0", description: "" }] }))}
                >
                  Sí
                </Button>
                <Button
                  type="button"
                  variant={form.has_surgeries === false ? "default" : "outline"}
                  className={form.has_surgeries === false ? "bg-gray-500 hover:bg-gray-600" : ""}
                  onClick={() => setForm((prev) => ({ ...prev, has_surgeries: false, surgeries: [] }))}
                >
                  No
                </Button>
              </div>
            </div>
            {form.has_surgeries && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-gray-500">Cirugías u hospitalizaciones</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSurgery}>
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar
                  </Button>
                </div>
                {form.surgeries.length === 0 && (
                  <p className="text-sm text-gray-500">Agrega cada evento con año y procedimiento.</p>
                )}
                <div className="space-y-2">
                  {form.surgeries.map((surgery) => (
                    <div key={surgery.id} className="flex items-center gap-2">
                      <Input
                        value={surgery.description}
                        onChange={(e) => updateSurgery(surgery.id, e.target.value)}
                        placeholder="Ej: 2020 - Apendicectomía"
                      />
                      <Button type="button" variant="ghost" onClick={() => removeSurgery(surgery.id)}>
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
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
