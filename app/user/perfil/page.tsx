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
import { cn } from "@/lib/utils"
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

// ============================================================================
// COMPONENTES REUTILIZABLES PARA UI PROFESIONAL
// ============================================================================

type BooleanAnswer = "SI" | "NO" | "NO SABE" | null

function BooleanButtons({
  value,
  onChange,
  size = "default",
}: {
  value: string | null | undefined
  onChange: (val: BooleanAnswer) => void
  size?: "sm" | "default"
}) {
  const options: { value: BooleanAnswer; label: string; color: string }[] = [
    { value: "SI", label: "Sí", color: "bg-emerald-500 hover:bg-emerald-600 text-white" },
    { value: "NO", label: "No", color: "bg-gray-500 hover:bg-gray-600 text-white" },
    { value: "NO SABE", label: "No sé", color: "bg-amber-500 hover:bg-amber-600 text-white" },
  ]

  return (
    <div className="flex gap-1.5">
      {options.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          size={size === "sm" ? "sm" : "default"}
          variant={value === opt.value ? "default" : "outline"}
          className={cn(
            "min-w-[60px] transition-all",
            value === opt.value ? opt.color : "hover:bg-gray-100"
          )}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  )
}

function ToggleBadge({
  label,
  selected,
  onClick,
  colorClass = "bg-zuli-indigo",
}: {
  label: string
  selected: boolean
  onClick: () => void
  colorClass?: string
}) {
  return (
    <Badge
      variant={selected ? "default" : "outline"}
      className={cn(
        "cursor-pointer transition-all text-sm py-1.5 px-3",
        selected ? `${colorClass} hover:opacity-90` : "hover:bg-gray-100 border-gray-300"
      )}
      onClick={onClick}
    >
      {selected && <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
      {label}
    </Badge>
  )
}

function AddCustomInput({
  placeholder,
  onAdd,
}: {
  placeholder: string
  onAdd: (value: string) => void
}) {
  const [inputValue, setInputValue] = useState("")

  const handleAdd = () => {
    if (!inputValue.trim()) return
    onAdd(inputValue.trim())
    setInputValue("")
  }

  return (
    <div className="flex gap-2 mt-3">
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            handleAdd()
          }
        }}
        placeholder={placeholder}
        className="flex-1"
      />
      <Button
        type="button"
        variant="outline"
        onClick={handleAdd}
        disabled={!inputValue.trim()}
        className="shrink-0"
      >
        <Plus className="h-4 w-4 mr-1" />
        Agregar
      </Button>
    </div>
  )
}

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
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <Heart className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <CardTitle className="text-base">Información Básica</CardTitle>
                <p className="text-sm text-gray-500">Datos demográficos y vitales</p>
              </div>
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
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Alergias</CardTitle>
                <p className="text-sm text-gray-500">Selecciona todas las que apliquen</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGIES.map((allergy) => (
                <ToggleBadge
                  key={allergy}
                  label={allergy}
                  selected={form.allergies.includes(allergy)}
                  onClick={() => toggleAllergy(allergy)}
                  colorClass="bg-blue-600"
                />
              ))}
              {/* Mostrar alergias personalizadas agregadas */}
              {form.allergies
                .filter((a) => !COMMON_ALLERGIES.includes(a))
                .map((customAllergy) => (
                  <Badge
                    key={customAllergy}
                    className="bg-blue-600 text-white py-1.5 px-3 flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {customAllergy}
                    <button
                      type="button"
                      onClick={() => toggleAllergy(customAllergy)}
                      className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
            </div>
            {!form.allergies.includes("Ninguna conocida") && (
              <AddCustomInput
                placeholder="Agregar otra alergia..."
                onAdd={(value) => {
                  setForm((prev) => ({
                    ...prev,
                    allergies: [...prev.allergies.filter((a) => a !== "Ninguna conocida"), value],
                  }))
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Condiciones y Antecedentes */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base">Condiciones y Antecedentes</CardTitle>
                <p className="text-sm text-gray-500">Responde Sí, No o No sé para cada pregunta</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Condiciones Crónicas */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                  <FileText className="h-4 w-4 text-purple-600" />
                </div>
                <p className="font-medium text-gray-800">Condiciones crónicas</p>
              </div>
              <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                {CHRONIC_CONDITIONS.filter(c => c !== "Ninguna").map((condition) => (
                  <div key={condition} className="flex items-center justify-between gap-4 py-1">
                    <span className="text-sm text-gray-700 font-medium">{condition}</span>
                    <BooleanButtons
                      value={form.chronic_conditions.includes(condition) ? "SI" : (form.chronic_conditions.includes("Ninguna") ? "NO" : null)}
                      onChange={(val) => {
                        if (val === "SI") {
                          setForm((prev) => ({
                            ...prev,
                            chronic_conditions: [...prev.chronic_conditions.filter(c => c !== "Ninguna" && c !== condition), condition],
                          }))
                        } else {
                          setForm((prev) => ({
                            ...prev,
                            chronic_conditions: prev.chronic_conditions.filter(c => c !== condition),
                          }))
                        }
                      }}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Antecedentes Familiares */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-100 rounded-lg">
                  <Heart className="h-4 w-4 text-red-500" />
                </div>
                <p className="font-medium text-gray-800">Antecedentes familiares</p>
              </div>
              <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                {FAMILY_HISTORY.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 py-1">
                    <span className="text-sm text-gray-700 font-medium">{item.label}</span>
                    <BooleanButtons
                      value={form.family_history[item.id]}
                      onChange={(val) => updateFamilyHistory(item.id, val || "")}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Antecedentes Personales */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 rounded-lg">
                  <User className="h-4 w-4 text-indigo-600" />
                </div>
                <p className="font-medium text-gray-800">Antecedentes personales</p>
              </div>
              <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                {PERSONAL_HISTORY.filter((p) => !p.femaleOnly || isFemale).map((item) => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-4 py-1">
                      <span className="text-sm text-gray-700 font-medium">{item.label}</span>
                      <BooleanButtons
                        value={form.personal_history[item.id]}
                        onChange={(val) => updatePersonalHistory(item.id, val || "")}
                        size="sm"
                      />
                    </div>
                    {item.followUp === "cigarettes" && form.personal_history[item.id] === "SI" && (
                      <div className="ml-4 p-3 bg-white rounded-lg border border-amber-200">
                        <Label className="text-xs text-amber-700 font-medium">¿Cuántos cigarros al día?</Label>
                        <Input
                          value={form.fuma_cigarettes}
                          onChange={(e) => setForm((prev) => ({ ...prev, fuma_cigarettes: e.target.value }))}
                          placeholder="Ej. 5"
                          className="mt-1"
                        />
                      </div>
                    )}
                    {item.hasDate && (
                      <div className="ml-4 p-3 bg-white rounded-lg border grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-gray-500">Resultado</Label>
                          <Input
                            type="text"
                            value={form.citologia_result}
                            onChange={(e) => setForm((prev) => ({ ...prev, citologia_result: e.target.value }))}
                            placeholder="Resultado"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Fecha</Label>
                          <Input
                            type="date"
                            value={form.citologia_date}
                            onChange={(e) => setForm((prev) => ({ ...prev, citologia_date: e.target.value }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medicamentos */}
        <Card className="border-l-4 border-l-pink-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Pill className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Medicamentos Actuales</CardTitle>
                  <p className="text-sm text-gray-500">Medicamentos que tomas regularmente</p>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addMedication} className="shrink-0">
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
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-base">Cirugías / Hospitalizaciones</CardTitle>
                <p className="text-sm text-gray-500">Procedimientos quirúrgicos previos</p>
              </div>
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
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Activity className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">Estilo de Vida</CardTitle>
                <p className="text-sm text-gray-500">Hábitos y rutina diaria</p>
              </div>
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
