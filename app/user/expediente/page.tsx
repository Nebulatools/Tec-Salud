// Página de expediente del usuario - Cuestionario base + Cuestionarios especialidad + Labs
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
  ClipboardList,
  TestTube,
  Clock,
  Stethoscope,
  Upload,
  Download,
  FolderOpen,
  ChevronDown,
  Pencil,
} from "lucide-react"

// ============================================================================
// TIPOS Y CONSTANTES
// ============================================================================

type BooleanAnswer = "SI" | "NO" | "NO SABE" | null

type BaselineState = {
  first_name: string
  last_name: string
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

type SpecialtyResponse = {
  id: string
  specialty_name: string
  specialty_id: string
  doctor_name: string
  submitted_at: string
  questions: { prompt: string; answer: unknown }[]
}

type LabOrder = {
  id: string
  recommended_tests: unknown
  notes: string | null
  status: "pending_upload" | "awaiting_review" | "reviewed"
  doctor: { first_name: string; last_name: string } | null
  specialty: { name: string } | null
  lab_results: { id: string; storage_path: string; uploaded_at: string; mime_type: string }[]
  recommended_at: string
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

// ============================================================================
// COMPONENTES REUTILIZABLES
// ============================================================================

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

// Helper function to format specialty questionnaire answers
function formatSpecialtyAnswer(answer: unknown): string {
  if (answer === null || answer === undefined) return "Sin respuesta"

  // Handle object with value property (e.g., {"value": true}, {"value": "text"})
  if (typeof answer === "object" && answer !== null && "value" in answer) {
    const val = (answer as { value: unknown }).value
    if (typeof val === "boolean") return val ? "Sí" : "No"
    if (typeof val === "string") return val || "Sin respuesta"
    if (typeof val === "number") return String(val)
    return String(val)
  }

  // Handle direct boolean
  if (typeof answer === "boolean") return answer ? "Sí" : "No"

  // Handle string
  if (typeof answer === "string") return answer || "Sin respuesta"

  // Handle number
  if (typeof answer === "number") return String(answer)

  // Fallback for arrays or other objects
  if (Array.isArray(answer)) return answer.join(", ") || "Sin respuesta"

  return String(answer)
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function ExpedientePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("cuestionario-base")

  // Estado del cuestionario base
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<BaselineState>({
    first_name: "",
    last_name: "",
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

  // Estado de cuestionarios de especialidad
  const [specialtyResponses, setSpecialtyResponses] = useState<SpecialtyResponse[]>([])
  const [loadingSpecialty, setLoadingSpecialty] = useState(true)
  const [expandedSpecialties, setExpandedSpecialties] = useState<Set<string>>(new Set())
  const [editingSpecialty, setEditingSpecialty] = useState<string | null>(null)

  // Estado de laboratorios
  const [labOrders, setLabOrders] = useState<LabOrder[]>([])
  const [loadingLabs, setLoadingLabs] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)

  // Cargar datos del cuestionario base
  useEffect(() => {
    const load = async () => {
      if (!user) return

      // Load from app_users for name defaults
      const { data: appUserData } = await supabase
        .from("app_users")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle()

      const { data } = await supabase
        .from("patient_baseline_forms")
        .select("general_info, vitals, lifestyle, conditions")
        .eq("patient_user_id", user.id)
        .maybeSingle()

      if (data) {
        const gi = data.general_info as Record<string, unknown>
        const v = data.vitals as Record<string, unknown>
        const l = data.lifestyle as Record<string, unknown>
        const c = data.conditions as Record<string, unknown>

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
          first_name: (gi?.first_name as string) ?? "",
          last_name: (gi?.last_name as string) ?? "",
          gender: (gi?.gender as string) ?? "",
          birth_date: (gi?.birth_date as string) ?? "",
          blood_type: (gi?.blood_type as string) ?? "",
          height_cm: (v?.height_cm as string) ?? "",
          weight_kg: (v?.weight_kg as string) ?? "",
          percentile_height: (v?.percentile_height as number) ?? null,
          percentile_weight: (v?.percentile_weight as number) ?? null,
          allergies: allergiesArr as string[],
          other_allergy: (gi?.other_allergy as string) ?? "",
          chronic_conditions: conditionsArr as string[],
          other_condition: (c?.other_condition as string) ?? "",
          medications: medsArr as { name: string; dose: string; frequency: string }[],
          has_surgeries: (c?.has_surgeries as boolean) ?? null,
          surgeries: surgeriesArr as { id: string; description: string }[],
          smoking: (l?.smoking as string) ?? "",
          alcohol: (l?.alcohol as string) ?? "",
          exercise: (l?.exercise as string) ?? "",
          diet: (l?.diet as string) ?? "",
          family_history: (gi?.family_history as Record<string, string>) ?? {},
          personal_history: (c?.personal_history as Record<string, string>) ?? {},
          fuma_cigarettes: (c?.fuma_cigarettes as string) ?? "",
          other_personal: (c?.other_personal as string) ?? "",
          citologia_result: (c?.citologia_result as string) ?? "",
          citologia_date: (c?.citologia_date as string) ?? "",
        })
      } else if (appUserData?.full_name) {
        // Pre-fill from app_users if no baseline form exists
        const nameParts = appUserData.full_name.split(" ")
        setForm((prev) => ({
          ...prev,
          first_name: nameParts[0] || "",
          last_name: nameParts.slice(1).join(" ") || "",
        }))
      }
      setLoading(false)
    }
    load()
  }, [user])

  // Cargar cuestionarios de especialidad
  useEffect(() => {
    const loadSpecialty = async () => {
      if (!user) return
      setLoadingSpecialty(true)

      // Get all specialty responses grouped by specialty
      const { data: responses } = await supabase
        .from("specialist_responses")
        .select(`
          id,
          specialty_id,
          question_id,
          answer,
          submitted_at,
          doctor:doctors!specialist_responses_doctor_id_fkey(first_name, last_name),
          specialty:specialties!specialist_responses_specialty_id_fkey(name),
          question:specialist_questions!specialist_responses_question_id_fkey(prompt)
        `)
        .eq("patient_user_id", user.id)
        .order("submitted_at", { ascending: false })

      if (responses) {
        // Group by specialty_id + submitted_at (batch)
        const grouped = new Map<string, SpecialtyResponse>()

        responses.forEach((r: any) => {
          const dateKey = new Date(r.submitted_at).toISOString().split("T")[0]
          const key = `${r.specialty_id}-${dateKey}`

          if (!grouped.has(key)) {
            grouped.set(key, {
              id: key,
              specialty_id: r.specialty_id,
              specialty_name: r.specialty?.name || "Especialidad",
              doctor_name: r.doctor ? `Dr. ${r.doctor.first_name} ${r.doctor.last_name}` : "Doctor",
              submitted_at: r.submitted_at,
              questions: [],
            })
          }

          grouped.get(key)?.questions.push({
            prompt: r.question?.prompt || "Pregunta",
            answer: r.answer,
          })
        })

        setSpecialtyResponses(Array.from(grouped.values()))
      }
      setLoadingSpecialty(false)
    }
    loadSpecialty()
  }, [user])

  // Cargar laboratorios
  useEffect(() => {
    const loadLabs = async () => {
      if (!user) return
      setLoadingLabs(true)

      const { data } = await supabase
        .from("lab_orders")
        .select(`
          id, recommended_tests, notes, status, recommended_at,
          doctor:doctors!lab_orders_doctor_id_fkey(first_name, last_name),
          specialty:specialties(name),
          lab_results(id, storage_path, uploaded_at, mime_type)
        `)
        .eq("patient_user_id", user.id)
        .order("recommended_at", { ascending: false })

      if (data) {
        setLabOrders(data.map((row: any) => ({
          id: row.id,
          recommended_tests: row.recommended_tests,
          notes: row.notes,
          status: row.status,
          doctor: row.doctor,
          specialty: row.specialty,
          lab_results: row.lab_results ?? [],
          recommended_at: row.recommended_at,
        })))
      }
      setLoadingLabs(false)
    }
    loadLabs()
  }, [user])

  // Cálculos para el cuestionario base
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

  const estimatePercentiles = (height: number, weight: number, gender: string) => {
    const norms =
      gender === "Femenino"
        ? { heightAvg: 162, heightSd: 7, bmiPivot: 23 }
        : { heightAvg: 175, heightSd: 7.5, bmiPivot: 24 }

    const bmi = weight && height ? weight / Math.pow(height / 100, 2) : null

    const percentileFromZ = (z: number) => {
      const p = Math.round(50 + z * 15)
      return Math.min(99, Math.max(1, p))
    }

    const heightZ = height ? (height - norms.heightAvg) / norms.heightSd : null
    const weightPercentile = bmi !== null ? percentileFromZ((bmi - norms.bmiPivot) / 4) : null
    const heightPercentile = heightZ !== null ? percentileFromZ(heightZ) : null

    return { bmi, weightPercentile, heightPercentile }
  }

  useEffect(() => {
    const h = Number.parseFloat(form.height_cm)
    const w = Number.parseFloat(form.weight_kg)
    if (Number.isFinite(h) && Number.isFinite(w) && form.gender) {
      const { weightPercentile, heightPercentile } = estimatePercentiles(h, w, form.gender)
      setForm((prev) => ({
        ...prev,
        percentile_height: heightPercentile,
        percentile_weight: weightPercentile,
      }))
    }
  }, [form.height_cm, form.weight_kg, form.gender])

  // Handlers del cuestionario base
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setStatus(null)
    setError(null)

    const general_info = {
      first_name: form.first_name,
      last_name: form.last_name,
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

    // Sync patients table
    if (form.first_name || form.last_name || form.birth_date || form.gender) {
      await supabase
        .from("patients")
        .update({
          first_name: form.first_name || undefined,
          last_name: form.last_name || undefined,
          date_of_birth: form.birth_date || undefined,
          gender: form.gender || undefined,
        })
        .eq("user_id", user.id)
    }

    await supabase.from("patient_profiles").upsert({
      id: user.id,
      baseline_completed: true,
    })

    setStatus("¡Guardado! Tu médico verá estos datos en tus consultas.")
    setSaving(false)
  }

  const toggleAllergy = (allergy: string) => {
    setForm((prev) => ({
      ...prev,
      allergies: prev.allergies.includes(allergy)
        ? prev.allergies.filter((a) => a !== allergy)
        : [...prev.allergies.filter((a) => a !== "Ninguna conocida"), allergy],
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

  // Lab handlers
  const handleLabUpload = async (orderId: string, file: File | null) => {
    if (!file || !user) return
    setUploading(orderId)
    setError(null)

    const path = `lab-results/${orderId}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from("lab-results").upload(path, file)

    if (uploadError) {
      setError(uploadError.message)
      setUploading(null)
      return
    }

    const { error: insertError } = await supabase.from("lab_results").insert({
      lab_order_id: orderId,
      storage_path: path,
      mime_type: file.type,
      uploaded_by: user.id,
    })

    if (insertError) {
      setError(insertError.message)
      setUploading(null)
      return
    }

    await supabase.from("lab_orders").update({ status: "awaiting_review" }).eq("id", orderId)

    setStatus("¡Resultados cargados!")
    setUploading(null)

    // Reload labs
    const { data } = await supabase
      .from("lab_orders")
      .select(`
        id, recommended_tests, notes, status, recommended_at,
        doctor:doctors!lab_orders_doctor_id_fkey(first_name, last_name),
        specialty:specialties(name),
        lab_results(id, storage_path, uploaded_at, mime_type)
      `)
      .eq("patient_user_id", user.id)
      .order("recommended_at", { ascending: false })

    if (data) {
      setLabOrders(data.map((row: any) => ({
        id: row.id,
        recommended_tests: row.recommended_tests,
        notes: row.notes,
        status: row.status,
        doctor: row.doctor,
        specialty: row.specialty,
        lab_results: row.lab_results ?? [],
        recommended_at: row.recommended_at,
      })))
    }
  }

  const downloadResult = async (path: string) => {
    const { data } = await supabase.storage.from("lab-results").createSignedUrl(path, 3600)
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank")
    }
  }

  const parseTests = (recommended: unknown) => {
    if (!recommended) return { tests: [] as string[] }
    if (Array.isArray(recommended)) return { tests: recommended as string[] }
    if (typeof recommended === "object" && recommended !== null) {
      const obj = recommended as Record<string, unknown>
      return { tests: (obj.tests as string[]) ?? [] }
    }
    return { tests: [] as string[] }
  }

  const isFemale = form.gender === "Femenino"

  // Calcular progreso del cuestionario base
  const totalFields = 12
  let filledFields = 0
  if (form.first_name) filledFields++
  if (form.last_name) filledFields++
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
          <p className="text-gray-500 mt-3">Cargando expediente...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-zuli-veronica to-zuli-indigo text-white border-0">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/20">
              <FolderOpen className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Mi Expediente Médico</h1>
              <p className="text-white/80 text-sm">
                Tu historial de salud, cuestionarios y estudios de laboratorio
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cuestionario-base" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Cuestionario Base</span>
            <span className="sm:hidden">Base</span>
          </TabsTrigger>
          <TabsTrigger value="cuestionarios-especialidad" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            <span className="hidden sm:inline">Especialidades</span>
            <span className="sm:hidden">Esp.</span>
            {specialtyResponses.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {specialtyResponses.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="laboratorios" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            <span className="hidden sm:inline">Laboratorios</span>
            <span className="sm:hidden">Labs</span>
            {labOrders.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {labOrders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* TAB: Cuestionario Base */}
        <TabsContent value="cuestionario-base" className="mt-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Progress */}
            <Card className="bg-gray-50 border-0">
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progreso del cuestionario</span>
                  <span className="text-sm font-bold text-zuli-veronica">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </CardContent>
            </Card>

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
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre(s) *</Label>
                      <Input
                        value={form.first_name}
                        onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                        placeholder="Tu nombre"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Apellido(s) *</Label>
                      <Input
                        value={form.last_name}
                        onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
                        placeholder="Tu apellido"
                        required
                      />
                    </div>
                  </div>

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

              {/* Condiciones crónicas y antecedentes (simplificado) */}
              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Condiciones Crónicas</CardTitle>
                      <p className="text-sm text-gray-500">Padecimientos actuales</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {CHRONIC_CONDITIONS.filter((c) => c !== "Ninguna").map((condition) => (
                    <div key={condition} className="flex items-center justify-between gap-4 py-1">
                      <span className="text-sm text-gray-700 font-medium">{condition}</span>
                      <BooleanButtons
                        value={form.chronic_conditions.includes(condition) ? "SI" : null}
                        onChange={(val) => {
                          if (val === "SI") {
                            setForm((prev) => ({
                              ...prev,
                              chronic_conditions: [...prev.chronic_conditions.filter((c) => c !== "Ninguna" && c !== condition), condition],
                            }))
                          } else {
                            setForm((prev) => ({
                              ...prev,
                              chronic_conditions: prev.chronic_conditions.filter((c) => c !== condition),
                            }))
                          }
                        }}
                        size="sm"
                      />
                    </div>
                  ))}
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
                      No has agregado medicamentos.
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
                              <SelectItem value="1x/día">1x/día</SelectItem>
                              <SelectItem value="2x/día">2x/día</SelectItem>
                              <SelectItem value="3x/día">3x/día</SelectItem>
                              <SelectItem value="c/8h">Cada 8h</SelectItem>
                              <SelectItem value="c/12h">Cada 12h</SelectItem>
                              <SelectItem value="PRN">Según necesidad</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeMedication(index)}>
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))
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
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
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
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
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
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
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
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
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
              <Button type="submit" className="w-full btn-zuli-gradient" disabled={saving}>
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
        </TabsContent>

        {/* TAB: Cuestionarios de Especialidad */}
        <TabsContent value="cuestionarios-especialidad" className="mt-6">
          {loadingSpecialty ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zuli-veronica" />
            </div>
          ) : specialtyResponses.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="py-12 text-center">
                <Stethoscope className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-700">Sin cuestionarios de especialidad</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Cuando solicites una cita con un especialista, aquí aparecerán tus cuestionarios completados
                </p>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => router.push("/user/hub-medico")}
                >
                  Buscar especialista
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {specialtyResponses.map((response) => {
                const isExpanded = expandedSpecialties.has(response.id)
                return (
                  <Collapsible
                    key={response.id}
                    open={isExpanded}
                    onOpenChange={(open) => {
                      const newSet = new Set(expandedSpecialties)
                      if (open) {
                        newSet.add(response.id)
                      } else {
                        newSet.delete(response.id)
                      }
                      setExpandedSpecialties(newSet)
                    }}
                  >
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-zuli-veronica/10">
                                <Stethoscope className="h-5 w-5 text-zuli-veronica" />
                              </div>
                              <div>
                                <CardTitle className="text-base">{response.specialty_name}</CardTitle>
                                <CardDescription>{response.doctor_name}</CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                {new Date(response.submitted_at).toLocaleDateString("es-MX")}
                              </Badge>
                              <Badge variant="outline" className="text-gray-500">
                                {response.questions.length} preguntas
                              </Badge>
                              <ChevronDown
                                className={cn(
                                  "h-5 w-5 text-gray-400 transition-transform duration-200",
                                  isExpanded && "rotate-180"
                                )}
                              />
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-4">
                          <div className="flex justify-end mb-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                router.push(`/user/especialistas?specialty=${response.specialty_id}&edit=true`)
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Editar respuestas
                            </Button>
                          </div>
                          <div className="space-y-3">
                            {response.questions.map((q, idx) => {
                              const formattedAnswer = formatSpecialtyAnswer(q.answer)
                              const isBoolean =
                                formattedAnswer === "Sí" || formattedAnswer === "No"
                              return (
                                <div
                                  key={idx}
                                  className="p-3 bg-gray-50 rounded-lg flex items-start justify-between gap-4"
                                >
                                  <p className="text-sm font-medium text-gray-700 flex-1">
                                    {q.prompt}
                                  </p>
                                  {isBoolean ? (
                                    <Badge
                                      variant={formattedAnswer === "Sí" ? "default" : "secondary"}
                                      className={cn(
                                        "shrink-0",
                                        formattedAnswer === "Sí"
                                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                                          : "bg-gray-100 text-gray-600"
                                      )}
                                    >
                                      {formattedAnswer}
                                    </Badge>
                                  ) : (
                                    <p className="text-sm text-gray-600 text-right max-w-[50%]">
                                      {formattedAnswer}
                                    </p>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB: Laboratorios */}
        <TabsContent value="laboratorios" className="mt-6">
          {loadingLabs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zuli-veronica" />
            </div>
          ) : labOrders.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="py-12 text-center">
                <TestTube className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-700">Sin estudios de laboratorio</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Cuando un especialista te solicite estudios, aparecerán aquí
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {labOrders.map((order) => {
                const parsed = parseTests(order.recommended_tests)
                const statusConfig = {
                  pending_upload: { label: "Pendiente", color: "bg-amber-100 text-amber-700" },
                  awaiting_review: { label: "En revisión", color: "bg-zuli-veronica/10 text-zuli-veronica" },
                  reviewed: { label: "Revisado", color: "bg-zuli-indigo/10 text-zuli-indigo" },
                }
                const statusInfo = statusConfig[order.status]

                return (
                  <Card key={order.id}>
                    <CardHeader className="bg-gray-50 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-cyan-100">
                            <TestTube className="h-5 w-5 text-cyan-600" />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {order.specialty?.name || "Laboratorio"}
                            </CardTitle>
                            <CardDescription>
                              Dr. {order.doctor?.first_name} {order.doctor?.last_name}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      {/* Pruebas */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Pruebas recomendadas:</p>
                        <div className="flex flex-wrap gap-2">
                          {parsed.tests.length > 0 ? (
                            parsed.tests.map((t, idx) => (
                              <Badge key={idx} variant="outline">{t}</Badge>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">Sin especificar</span>
                          )}
                        </div>
                      </div>

                      {/* Upload */}
                      {order.status === "pending_upload" && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Subir resultados:</p>
                          <label
                            htmlFor={`file-${order.id}`}
                            className={`flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                              uploading === order.id
                                ? "border-zuli-veronica/30 bg-zuli-veronica/5"
                                : "border-gray-300 hover:border-zuli-veronica/40"
                            }`}
                          >
                            {uploading === order.id ? (
                              <Loader2 className="h-5 w-5 animate-spin text-zuli-veronica" />
                            ) : (
                              <>
                                <Upload className="h-5 w-5 text-gray-400" />
                                <span className="text-sm text-gray-600">Click para subir PDF o imagen</span>
                              </>
                            )}
                          </label>
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            onChange={(e) => handleLabUpload(order.id, e.target.files?.[0] ?? null)}
                            disabled={uploading === order.id}
                            className="hidden"
                            id={`file-${order.id}`}
                          />
                        </div>
                      )}

                      {/* Archivos subidos */}
                      {order.lab_results.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Archivos:</p>
                          {order.lab_results.map((result) => (
                            <div
                              key={result.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gray-500" />
                                <span className="text-sm truncate max-w-[200px]">
                                  {result.storage_path.split("/").pop()}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadResult(result.storage_path)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {order.notes && (
                        <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                          <strong>Notas:</strong> {order.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
