// Cuestionario de especialidad - página con todas las preguntas + selección de laboratorio
"use client"

import { useEffect, useState, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Heart,
  Activity,
  Stethoscope,
  Send,
  Loader2,
  FlaskConical,
  MapPin,
  Building2,
  ChevronRight,
  CreditCard,
} from "lucide-react"
import { MockPaymentModal } from "@/components/user/mock-payment-modal"

type Question = {
  id: string
  prompt: string
  field_type: string
  options: any
  is_required: boolean
}

type Doctor = {
  id: string
  first_name: string
  last_name: string
  email: string
}

type Specialty = {
  id: string
  name: string
  description: string | null
}

// Preguntas con opciones de selección por especialidad
const fallbackQuestions: Record<string, { prompt: string; field_type: string; options: any; order_index: number }[]> = {
  Cardiología: [
    { prompt: "¿Presentas dolor de pecho al esfuerzo?", field_type: "boolean", options: {}, order_index: 1 },
    { prompt: "¿Tienes dolor en reposo o nocturno?", field_type: "boolean", options: {}, order_index: 2 },
    { prompt: "¿Tienes antecedentes familiares de enfermedad cardiaca prematura (<55h/65m)?", field_type: "boolean", options: {}, order_index: 3 },
    { prompt: "¿Tomas medicamentos para presión arterial?", field_type: "boolean", options: {}, order_index: 4 },
    { prompt: "¿Fumas actualmente o fumaste en los últimos 12 meses?", field_type: "boolean", options: {}, order_index: 5 },
    { prompt: "¿Tienes diagnóstico de hipertensión o dislipidemia?", field_type: "boolean", options: {}, order_index: 6 },
    { prompt: "¿Has tenido síncope, palpitaciones o falta de aire al esfuerzo?", field_type: "boolean", options: {}, order_index: 7 },
    {
      prompt: "¿Cuál es tu nivel de actividad física?",
      field_type: "single_select",
      options: { choices: ["Sedentario", "Ligera (1-2 días/sem)", "Moderada (3-4 días/sem)", "Intensa (5+ días/sem)"] },
      order_index: 8
    },
    {
      prompt: "Síntomas que has experimentado (selecciona todos los que apliquen)",
      field_type: "multi_select",
      options: { choices: ["Palpitaciones", "Mareos", "Dolor de pecho", "Falta de aire", "Hinchazón de piernas", "Fatiga inusual", "Ninguno"] },
      order_index: 9
    },
  ],
  Endocrinología: [
    { prompt: "¿Tienes diagnóstico de diabetes?", field_type: "boolean", options: {}, order_index: 1 },
    { prompt: "¿Tienes diagnóstico de enfermedad tiroidea?", field_type: "boolean", options: {}, order_index: 2 },
    { prompt: "¿Has tenido cambios de peso significativos en los últimos 6 meses?", field_type: "boolean", options: {}, order_index: 3 },
    { prompt: "¿Experimentas fatiga, intolerancia al frío/calor o caída de cabello?", field_type: "boolean", options: {}, order_index: 4 },
    { prompt: "¿Estás embarazada o en periodo posparto?", field_type: "boolean", options: {}, order_index: 5 },
    { prompt: "¿Tienes antecedentes familiares de diabetes?", field_type: "boolean", options: {}, order_index: 6 },
    {
      prompt: "Síntomas que has experimentado (selecciona todos los que apliquen)",
      field_type: "multi_select",
      options: { choices: ["Sed excesiva", "Micción frecuente", "Pérdida de peso inexplicable", "Cansancio extremo", "Visión borrosa", "Piel seca", "Ninguno"] },
      order_index: 7
    },
  ],
  "Medicina Interna": [
    {
      prompt: "¿Cuál es el motivo principal de tu consulta?",
      field_type: "single_select",
      options: { choices: ["Chequeo general", "Síntomas específicos", "Seguimiento de enfermedad", "Segunda opinión", "Otro"] },
      order_index: 1
    },
    { prompt: "¿Has tenido fiebre en los últimos días?", field_type: "boolean", options: {}, order_index: 2 },
    { prompt: "¿Has experimentado pérdida de peso involuntaria?", field_type: "boolean", options: {}, order_index: 3 },
    { prompt: "¿Has tenido sudoraciones nocturnas?", field_type: "boolean", options: {}, order_index: 4 },
    {
      prompt: "Síntomas actuales (selecciona todos los que apliquen)",
      field_type: "multi_select",
      options: { choices: ["Dolor de cabeza", "Dolor abdominal", "Náuseas/vómito", "Diarrea", "Estreñimiento", "Tos", "Dolor de garganta", "Congestión nasal", "Ninguno"] },
      order_index: 5
    },
  ],
}

// Laboratorios recomendados por especialidad y respuestas
const labRecommendations: Record<string, { condition: (answers: Record<string, any>) => boolean; tests: string[] }[]> = {
  Cardiología: [
    { condition: () => true, tests: ["Perfil de lípidos completo", "Glucosa en ayunas"] },
    { condition: (a) => a["dolor_pecho"] === true, tests: ["Troponinas", "Electrocardiograma"] },
    { condition: (a) => a["hipertension"] === true, tests: ["Creatinina", "Electrolitos séricos", "BUN"] },
    { condition: (a) => a["antecedentes_cardiacos"] === true, tests: ["BNP o NT-proBNP"] },
  ],
  Endocrinología: [
    { condition: () => true, tests: ["Glucosa en ayunas", "Hemoglobina glucosilada (HbA1c)"] },
    { condition: (a) => a["tiroides"] === true, tests: ["TSH", "T4 libre", "T3"] },
    { condition: (a) => a["diabetes"] === true, tests: ["Perfil de lípidos", "Creatinina", "Microalbuminuria"] },
  ],
  "Medicina Interna": [
    { condition: () => true, tests: ["Biometría hemática completa", "Química sanguínea básica"] },
    { condition: (a) => a["fiebre"] === true, tests: ["Examen general de orina", "Proteína C reactiva"] },
    { condition: (a) => a["perdida_peso"] === true, tests: ["Perfil tiroideo", "Marcadores tumorales básicos"] },
  ],
}

// Laboratorios con sucursales
const LAB_PROVIDERS = [
  {
    id: "salud-digna",
    name: "Salud Digna",
    logo: "🏥",
    branches: [
      { id: "sd-1", name: "Centro", address: "Av. Juárez 123, Centro" },
      { id: "sd-2", name: "Norte", address: "Blvd. Independencia 456" },
      { id: "sd-3", name: "Sur", address: "Av. Universidad 789" },
    ]
  },
  {
    id: "chopo",
    name: "Laboratorios Chopo",
    logo: "🔬",
    branches: [
      { id: "ch-1", name: "Sucursal Principal", address: "Av. Constitución 100" },
      { id: "ch-2", name: "Plaza Central", address: "Centro Comercial Plaza, Local 45" },
    ]
  },
  {
    id: "similares",
    name: "Laboratorios Similares",
    logo: "💊",
    branches: [
      { id: "sim-1", name: "Centro", address: "Calle Principal 50" },
      { id: "sim-2", name: "Colonia Roma", address: "Av. Roma 200" },
      { id: "sim-3", name: "Del Valle", address: "Calle Del Valle 300" },
      { id: "sim-4", name: "Coyoacán", address: "Av. Coyoacán 400" },
    ]
  },
  {
    id: "olab",
    name: "OLAB",
    logo: "🧪",
    branches: [
      { id: "ol-1", name: "Matriz", address: "Blvd. Principal 1000" },
      { id: "ol-2", name: "Express", address: "Plaza Express, Local 12" },
    ]
  },
]

const specialtyIcons: Record<string, React.ReactNode> = {
  Cardiología: <Heart className="h-5 w-5" />,
  Endocrinología: <Activity className="h-5 w-5" />,
  "Medicina Interna": <Stethoscope className="h-5 w-5" />,
}

function CuestionarioContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const doctorId = searchParams.get("doctor")
  const specialtyId = searchParams.get("specialty")

  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [specialty, setSpecialty] = useState<Specialty | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [dataLoading, setDataLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [linkStatus, setLinkStatus] = useState<"none" | "pending" | "accepted">("none")

  // Estados para el flujo de laboratorio
  const [step, setStep] = useState<"questionnaire" | "labs">("questionnaire")
  const [recommendedTests, setRecommendedTests] = useState<string[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)

  // Estado para el modal de pago
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  useEffect(() => {
    if (!doctorId || !specialtyId) {
      router.push("/user/especialistas")
      return
    }
    if (!user) {
      return
    }
    loadData()
  }, [doctorId, specialtyId, user])

  const loadData = async () => {
    if (!doctorId || !specialtyId || !user) return
    setDataLoading(true)

    const { data: doc } = await supabase
      .from("doctors")
      .select("id, first_name, last_name, email")
      .eq("id", doctorId)
      .single()
    setDoctor(doc)

    const { data: spec } = await supabase
      .from("specialties")
      .select("id, name, description")
      .eq("id", specialtyId)
      .single()
    setSpecialty(spec)

    const { data: links } = await supabase
      .from("doctor_patient_links")
      .select("status")
      .eq("doctor_id", doctorId)
      .eq("patient_user_id", user.id)
      .limit(1)

    const st = links?.[0]?.status ?? null
    setLinkStatus(st === "accepted" ? "accepted" : st === "pending" ? "pending" : "none")

    let { data: qs } = await supabase
      .from("specialist_questions")
      .select("id, prompt, field_type, options, is_required")
      .eq("specialty_id", specialtyId)
      .eq("active", true)
      .order("order_index")

    if (!qs || qs.length === 0) {
      const specName = spec?.name ?? ""
      const defaults = fallbackQuestions[specName] ?? []
      if (defaults.length > 0) {
        await supabase.from("specialist_questions").insert(
          defaults.map((q) => ({
            specialty_id: specialtyId,
            prompt: q.prompt,
            field_type: q.field_type,
            options: q.options,
            is_required: true,
            order_index: q.order_index,
            active: true,
          }))
        )
        const { data: refreshed } = await supabase
          .from("specialist_questions")
          .select("id, prompt, field_type, options, is_required")
          .eq("specialty_id", specialtyId)
          .eq("active", true)
          .order("order_index")
        qs = refreshed ?? []
      }
    }

    setQuestions(qs ?? [])

    const { data: existing } = await supabase
      .from("specialist_responses")
      .select("question_id, answer")
      .eq("patient_user_id", user.id)
      .eq("specialty_id", specialtyId)

    if (existing && existing.length > 0) {
      const mapped: Record<string, any> = {}
      existing.forEach((r) => {
        const val =
          r.answer && typeof r.answer === "object" && "value" in r.answer
            ? (r.answer as any).value
            : r.answer
        mapped[r.question_id] = val
      })
      setAnswers(mapped)
    }

    setDataLoading(false)
  }

  // Calcular laboratorios recomendados basados en respuestas
  const calculateRecommendedTests = () => {
    // Normaliza prompts para ser menos frágil ante cambios de texto
    const slugify = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\\s]/g, " ")
        .replace(/\\s+/g, " ")
        .trim()

    const keywordMap: { key: string; matches: string[] }[] = [
      { key: "dolor_pecho", matches: ["dolor pecho", "pecho esfuerzo", "angina"] },
      { key: "hipertension", matches: ["hipertension", "presion", "presion arterial"] },
      { key: "antecedentes_cardiacos", matches: ["antecedentes cardiaca", "familiar cardiaca", "familiar cardiopatia"] },
      { key: "tiroides", matches: ["tiroides"] },
      { key: "diabetes", matches: ["diabetes"] },
      { key: "fiebre", matches: ["fiebre"] },
      { key: "perdida_peso", matches: ["perdida peso", "perdida de peso"] },
    ]

    const specName = specialty?.name ?? ""
    const recommendations = labRecommendations[specName] ?? []
    const tests = new Set<string>()

    // Mapear respuestas a keys simples para las condiciones
    const answerMap: Record<string, any> = {}
    questions.forEach((q) => {
      const val = answers[q.id]
      const slug = slugify(q.prompt)
      keywordMap.forEach(({ key, matches }) => {
        if (matches.some((m) => slug.includes(m))) {
          answerMap[key] = val
        }
      })
    })

    recommendations.forEach((rec) => {
      if (rec.condition(answerMap)) {
        rec.tests.forEach((t) => tests.add(t))
      }
    })

    return Array.from(tests)
  }

  const handleSubmitQuestionnaire = async () => {
    if (!user || !specialtyId || !doctorId) return
    setSaving(true)
    setError(null)
    setStatus(null)

    const rows = questions.map((q) => ({
      patient_user_id: user.id,
      specialty_id: specialtyId,
      doctor_id: doctorId,
      question_id: q.id,
      answer: { value: answers[q.id] ?? null },
    }))

    await supabase
      .from("specialist_responses")
      .delete()
      .eq("patient_user_id", user.id)
      .eq("specialty_id", specialtyId)

    const { error: insertError } = await supabase.from("specialist_responses").insert(rows)

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    // Calcular labs recomendados y guardar/crear la orden para que aparezca en "Laboratorios"
    const tests = calculateRecommendedTests()
    setRecommendedTests(tests)

    const { data: existingOrder, error: fetchOrderError } = await supabase
      .from("lab_orders")
      .select("id, recommended_tests")
      .eq("patient_user_id", user.id)
      .eq("doctor_id", doctorId)
      .eq("specialty_id", specialtyId)
      .maybeSingle()

    if (fetchOrderError && fetchOrderError.code !== "PGRST116") {
      setError(fetchOrderError.message)
      setSaving(false)
      return
    }

    const mergedRecommended =
      existingOrder?.recommended_tests && typeof existingOrder.recommended_tests === "object" && !Array.isArray(existingOrder.recommended_tests)
        ? { ...existingOrder.recommended_tests, tests }
        : { tests }

    const labOrderPayload = {
      patient_user_id: user.id,
      doctor_id: doctorId,
      specialty_id: specialtyId,
      recommended_tests: mergedRecommended,
      status: "pending_upload" as const,
    }

    if (existingOrder?.id) {
      const { error: updateError } = await supabase
        .from("lab_orders")
        .update(labOrderPayload)
        .eq("id", existingOrder.id)

      if (updateError) {
        setError(updateError.message)
        setSaving(false)
        return
      }
    } else {
      const { error: createError } = await supabase.from("lab_orders").insert(labOrderPayload)
      if (createError) {
        setError(createError.message)
        setSaving(false)
        return
      }
    }

    // Si no está vinculado, mostrar modal de pago para solicitar cita
    if (linkStatus === "none") {
      setStatus("¡Cuestionario guardado! Ahora puedes solicitar tu cita.")
      setSaving(false)
      setShowPaymentModal(true)
      return
    }

    // Si ya está vinculado, ir directamente a selección de laboratorio
    setStatus("¡Cuestionario guardado! Ahora selecciona tu laboratorio para continuar.")
    setStep("labs")
    setSaving(false)
  }

  // Manejar el éxito del pago - crear vinculación y cita
  const handlePaymentSuccess = async () => {
    if (!user || !doctorId) return

    try {
      const response = await fetch("/api/appointments/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientUserId: user.id,
          doctorId,
          specialistResponses: answers,
        }),
      })

      if (response.ok) {
        setLinkStatus("pending")
        setShowPaymentModal(false)
        setStatus("¡Cita reservada exitosamente! El especialista confirmará la fecha. Ahora selecciona tu laboratorio.")
        setStep("labs")
      } else {
        const data = await response.json()
        setError(data.error || "Error al reservar la cita")
        setShowPaymentModal(false)
      }
    } catch (err) {
      setError("Error de conexión. Intenta nuevamente.")
      setShowPaymentModal(false)
    }
  }

  const handleSubmitLabSelection = async () => {
    if (!user || !specialtyId || !doctorId) return
    setSaving(true)
    setError(null)

    const provider = LAB_PROVIDERS.find((p) => p.id === selectedProvider)
    const branch = provider?.branches.find((b) => b.id === selectedBranch)

    // Crear o actualizar lab_order
    const { data: existingOrder } = await supabase
      .from("lab_orders")
      .select("id")
      .eq("patient_user_id", user.id)
      .eq("doctor_id", doctorId)
      .eq("specialty_id", specialtyId)
      .limit(1)

    const labOrderData = {
      patient_user_id: user.id,
      doctor_id: doctorId,
      specialty_id: specialtyId,
      recommended_tests: {
        tests: recommendedTests,
        lab_provider: provider?.name ?? null,
        lab_branch: branch?.name ?? null,
        lab_branch_address: branch?.address ?? null,
      },
      status: "pending_upload" as const,
    }

    if (existingOrder && existingOrder.length > 0) {
      await supabase
        .from("lab_orders")
        .update(labOrderData)
        .eq("id", existingOrder[0].id)
    } else {
      await supabase.from("lab_orders").insert(labOrderData)
    }

    setStatus("¡Cuestionario y laboratorio guardados! El especialista revisará tus datos.")
    setSaving(false)

    setTimeout(() => {
      router.push("/user/laboratorios")
    }, 2000)
  }

  const renderField = (q: Question) => {
    const value = answers[q.id]
    const options = q.options?.choices ?? []

    switch (q.field_type) {
      case "boolean":
        return (
          <div className="flex gap-3">
            <Button
              type="button"
              variant={value === true ? "default" : "outline"}
              className={`flex-1 h-12 touch-target transition-all duration-200 ${
                value === true
                  ? "bg-gradient-to-r from-zuli-veronica to-zuli-indigo hover:opacity-90 shadow-md shadow-zuli-veronica/25 border-0"
                  : "hover:border-zuli-veronica/50 hover:bg-zuli-veronica/5"
              }`}
              onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: true }))}
            >
              <CheckCircle2 className={`h-4 w-4 mr-2 transition-transform ${value === true ? "scale-110" : ""}`} />
              Sí
            </Button>
            <Button
              type="button"
              variant={value === false ? "default" : "outline"}
              className={`flex-1 h-12 touch-target transition-all duration-200 ${
                value === false
                  ? "bg-slate-600 hover:bg-slate-700 shadow-md border-0"
                  : "hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
              onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: false }))}
            >
              No
            </Button>
          </div>
        )

      case "single_select":
        return (
          <RadioGroup
            value={value ?? ""}
            onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
            className="space-y-2"
          >
            {options.map((opt: string) => (
              <div key={opt} className="flex items-center space-x-2">
                <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                <Label htmlFor={`${q.id}-${opt}`} className="cursor-pointer">{opt}</Label>
              </div>
            ))}
          </RadioGroup>
        )

      case "multi_select":
        const selectedValues: string[] = Array.isArray(value) ? value : []
        return (
          <div className="flex flex-wrap gap-2">
            {options.map((opt: string) => {
              const isSelected = selectedValues.includes(opt)
              return (
                <Badge
                  key={opt}
                  variant={isSelected ? "default" : "outline"}
                  className={`cursor-pointer transition-all duration-200 py-1.5 px-3 touch-target ${
                    isSelected
                      ? "bg-gradient-to-r from-zuli-veronica to-zuli-indigo hover:opacity-90 shadow-sm border-0 text-white"
                      : "hover:bg-zuli-veronica/5 hover:border-zuli-veronica/50 border-gray-200 dark:border-gray-700"
                  }`}
                  onClick={() => {
                    const newValues = isSelected
                      ? selectedValues.filter((v) => v !== opt)
                      : [...selectedValues.filter((v) => v !== "Ninguno"), opt]
                    setAnswers((prev) => ({ ...prev, [q.id]: newValues }))
                  }}
                >
                  {isSelected && <CheckCircle2 className="h-3 w-3 mr-1.5 animate-scale-in" />}
                  {opt}
                </Badge>
              )
            })}
          </div>
        )

      case "long_text":
        return (
          <Textarea
            value={value ?? ""}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
            placeholder="Escribe tu respuesta..."
            className="min-h-[80px] focus:ring-2 focus:ring-zuli-veronica/30 focus:border-zuli-veronica transition-all"
          />
        )

      case "number":
        return (
          <Input
            type="number"
            value={value ?? ""}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
            placeholder="Ingresa un número"
            className="focus:ring-2 focus:ring-zuli-veronica/30 focus:border-zuli-veronica transition-all"
          />
        )

      default:
        return (
          <Input
            value={value ?? ""}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
            placeholder="Tu respuesta"
            className="focus:ring-2 focus:ring-zuli-veronica/30 focus:border-zuli-veronica transition-all"
          />
        )
    }
  }

  const answeredCount = questions.filter((q) => {
    const val = answers[q.id]
    return val !== undefined && val !== null && val !== "" && (!Array.isArray(val) || val.length > 0)
  }).length
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0

  if (authLoading || dataLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
        {/* Header skeleton */}
        <div className="h-32 rounded-2xl animate-shimmer" />

        {/* Alert skeleton */}
        <div className="h-14 rounded-lg animate-shimmer" style={{ animationDelay: '0.1s' }} />

        {/* Question cards skeleton */}
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-5 rounded-xl border border-gray-100 dark:border-gray-800" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full animate-shimmer" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-3/4 rounded animate-shimmer" />
                  <div className="flex gap-3">
                    <div className="h-10 flex-1 rounded-lg animate-shimmer" />
                    <div className="h-10 flex-1 rounded-lg animate-shimmer" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Button skeleton */}
        <div className="h-12 rounded-xl animate-shimmer" style={{ animationDelay: '0.3s' }} />
      </div>
    )
  }

  if (!doctor || !specialty) {
    return (
      <Card className="border-2 border-dashed border-gray-200 dark:border-gray-700 animate-fadeIn">
        <CardContent className="py-16 text-center">
          <div className="empty-state-icon-colored">
            <Stethoscope className="h-10 w-10 text-zuli-veronica" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Especialista no encontrado
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
            No se encontró el especialista o la especialidad. Es posible que el enlace haya expirado.
          </p>
          <Button onClick={() => router.push("/user/especialistas")} className="btn-zuli-gradient">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al marketplace
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Paso de selección de laboratorio
  if (step === "labs") {
    const selectedProviderData = LAB_PROVIDERS.find((p) => p.id === selectedProvider)

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
        <Button variant="ghost" onClick={() => setStep("questionnaire")} className="group hover:bg-zuli-veronica/5">
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Volver al cuestionario
        </Button>

        {/* Header */}
        <Card className="bg-gradient-to-r from-zuli-cyan to-zuli-indigo text-white border-0 overflow-hidden relative">
          {/* Decorative pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/20 -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/20 translate-y-1/2 -translate-x-1/2" />
          </div>
          <CardContent className="py-6 relative">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/20 shadow-lg">
                <FlaskConical className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Estudios de Laboratorio</h1>
                <p className="text-white/80 text-sm">
                  Basado en tus respuestas, te recomendamos los siguientes estudios
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tests recomendados */}
        <Card className="overflow-hidden animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <div className="h-1 bg-gradient-to-r from-zuli-cyan to-zuli-indigo" />
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-zuli-indigo" />
              Estudios Recomendados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {recommendedTests.map((test, index) => (
                <Badge
                  key={test}
                  variant="secondary"
                  className="py-1.5 px-3 bg-zuli-indigo/10 text-zuli-indigo border border-zuli-indigo/20 animate-fadeInUp"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1.5" />
                  {test}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selección de laboratorio */}
        <Card className="overflow-hidden animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
          <div className="h-1 bg-gradient-to-r from-zuli-veronica to-zuli-indigo" />
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-5 w-5 text-zuli-veronica" />
              Selecciona tu Laboratorio
            </CardTitle>
            <CardDescription>
              Elige el laboratorio con el que tienes convenio o preferencia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {LAB_PROVIDERS.map((provider, index) => (
                <Card
                  key={provider.id}
                  className={`cursor-pointer transition-all duration-300 group overflow-hidden animate-fadeInUp ${
                    selectedProvider === provider.id
                      ? "border-2 border-zuli-veronica bg-zuli-veronica/5 shadow-md shadow-zuli-veronica/10"
                      : "border-2 border-transparent hover:border-zuli-veronica/30 hover:shadow-lg"
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => {
                    setSelectedProvider(provider.id)
                    setSelectedBranch(null)
                  }}
                >
                  {/* Top accent bar */}
                  <div className={`h-1 bg-gradient-to-r from-zuli-veronica to-zuli-indigo transition-opacity duration-300 ${
                    selectedProvider === provider.id ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                  }`} />
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-200">{provider.logo}</div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{provider.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{provider.branches.length} sucursales</p>
                    {selectedProvider === provider.id && (
                      <CheckCircle2 className="h-4 w-4 text-zuli-veronica mx-auto mt-2 animate-scale-in" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selección de sucursal */}
        {selectedProviderData && (
          <Card className="overflow-hidden animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            <div className="h-1 bg-gradient-to-r from-zuli-cyan to-zuli-veronica" />
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-5 w-5 text-zuli-cyan-600" />
                Selecciona la Sucursal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedProviderData.branches.map((branch, index) => (
                <div
                  key={branch.id}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 animate-fadeInUp ${
                    selectedBranch === branch.id
                      ? "border-zuli-veronica bg-zuli-veronica/5 shadow-md shadow-zuli-veronica/10"
                      : "border-gray-100 dark:border-gray-800 hover:border-zuli-veronica/30 hover:bg-zuli-veronica/5"
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => setSelectedBranch(branch.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors ${
                        selectedBranch === branch.id
                          ? "bg-zuli-veronica text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                      }`}>
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{branch.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{branch.address}</p>
                      </div>
                    </div>
                    {selectedBranch === branch.id && (
                      <CheckCircle2 className="h-5 w-5 text-zuli-veronica animate-scale-in" />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Botón de confirmación */}
        <Button
          onClick={handleSubmitLabSelection}
          disabled={saving || !selectedProvider || !selectedBranch}
          className="w-full btn-zuli-gradient"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Confirmar y Continuar
            </>
          )}
        </Button>

        {status && (
          <Alert className="bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 animate-fadeInUp">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{status}</AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  // Cuestionario principal - todas las preguntas a la vez
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      {/* Header con info del doctor */}
      <Card className="bg-gradient-to-r from-zuli-veronica to-zuli-indigo text-white border-0 overflow-hidden relative">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/20 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/20 translate-y-1/2 -translate-x-1/2" />
        </div>
        <CardContent className="py-6 relative">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold ring-4 ring-white/30 shadow-lg">
              {doctor.first_name?.[0]}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg">
                Dr. {doctor.first_name} {doctor.last_name}
              </p>
              <Badge variant="secondary" className="mt-1 bg-white/20 text-white border-0 backdrop-blur-sm">
                {specialtyIcons[specialty.name]}
                <span className="ml-1">{specialty.name}</span>
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/80">Progreso</p>
              <p className="text-2xl font-bold">{Math.round(progress)}%</p>
            </div>
          </div>
          <Progress value={progress} className="mt-4 h-2 bg-white/30" />
        </CardContent>
      </Card>

      {linkStatus !== "accepted" && (
        <Alert className="bg-amber-50 border-amber-200 text-amber-700">
          <AlertDescription className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 flex-shrink-0" />
            {linkStatus === "pending"
              ? "Tu solicitud de vinculación está pendiente. El especialista la revisará pronto."
              : "Completa el cuestionario y después podrás solicitar tu cita con el especialista."}
          </AlertDescription>
        </Alert>
      )}

      {/* Todas las preguntas */}
      <div className="space-y-4">
        {questions.map((q, index) => {
          const isAnswered = answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== "" && (!Array.isArray(answers[q.id]) || answers[q.id].length > 0)

          return (
            <Card
              key={q.id}
              className={`border-2 overflow-hidden transition-all duration-300 animate-fadeInUp ${
                isAnswered
                  ? "border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10"
                  : "border-gray-100 dark:border-gray-800 hover:border-zuli-veronica/30"
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Top accent bar - shows green when answered */}
              <div className={`h-1 transition-colors duration-300 ${
                isAnswered ? "bg-green-500" : "bg-gradient-to-r from-zuli-veronica to-zuli-indigo opacity-20"
              }`} />
              <CardContent className="pt-5 pb-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    isAnswered
                      ? "bg-green-500 text-white"
                      : "bg-zuli-veronica/10 text-zuli-veronica"
                  }`}>
                    {isAnswered ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </div>
                  <div className="flex-1 space-y-3">
                    <Label className="text-base font-medium text-gray-900 dark:text-white">
                      {q.prompt}
                      {q.is_required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {renderField(q)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Botón continuar */}
      <Button
        onClick={handleSubmitQuestionnaire}
        disabled={saving || answeredCount < questions.filter((q) => q.is_required).length}
        className="w-full h-12 btn-zuli-gradient touch-target group"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Procesando...
          </>
        ) : (
          <>
            Continuar
            <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </Button>

      {error && (
        <Alert variant="destructive" className="animate-fadeInUp">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Modal de pago para solicitar cita */}
      {doctor && (
        <MockPaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          doctor={{
            id: doctor.id,
            full_name: `${doctor.first_name} ${doctor.last_name}`,
            specialty: specialty ? { name: specialty.name } : null,
          }}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  )
}

export default function CuestionarioPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-zuli-veronica/20 border-t-zuli-veronica" />
      </div>
    }>
      <CuestionarioContent />
    </Suspense>
  )
}
