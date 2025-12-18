// Marketplace de especialistas + cuestionario especializado
"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

type Specialty = { id: string; name: string; description: string | null }
type DoctorOption = { id: string; name: string; email: string }
type Question = {
  id: string
  prompt: string
  field_type: string
  options: Record<string, unknown>
  is_required: boolean
  specialty_id: string
}

const fieldLabels: Record<string, string> = {
  short_text: "Respuesta corta",
  long_text: "Respuesta larga",
  number: "Número",
  date: "Fecha",
  boolean: "Sí / No",
  single_select: "Opción única",
  multi_select: "Múltiples opciones",
}

const recommendedTestsBySpecialty: Record<string, string[]> = {
  Cardiología: ["Biometría hemática", "Perfil lipídico", "ECG basal"],
  Endocrinología: ["HbA1c", "TSH", "T4 libre", "Glucosa en ayuno"],
  "Medicina Interna": ["Biometría hemática", "Química sanguínea", "PFH", "EGO"],
}

const fallbackQuestions: Record<string, { prompt: string; field_type: string; order_index: number }[]> = {
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

const buildRecommendedTests = (specName: string, answers: Record<string, unknown>, questions: Question[]): string[] => {
  const base = recommendedTestsBySpecialty[specName] ?? []
  const byPrompt = (text: string) =>
    questions.find((q) => q.prompt.toLowerCase().includes(text.toLowerCase()))?.id ?? ""

  const getVal = (promptMatch: string) => answers[byPrompt(promptMatch)]

  if (specName === "Cardiología") {
    const chestPain = getVal("pecho")
    const restPain = getVal("reposo")
    const familyHx = getVal("familiares")
    const meds = getVal("medicamentos")
    const dyspnea = getVal("falta de aire") ?? getVal("palpitaciones")

    const tests = [...base]
    if (chestPain === true || restPain === true) {
      tests.push("Troponina I/T", "CK-MB", "Ecocardiograma de esfuerzo", "RX tórax")
    }
    if (familyHx === true) {
      tests.push("Perfil lipídico ampliado", "Score de calcio coronario (según edad)")
    }
    if (dyspnea === true) {
      tests.push("BNP/NT-proBNP", "Ecocardiograma")
    }
    if (meds) {
      tests.push("Función renal y electrolitos", "TSH")
    }
    return Array.from(new Set(tests))
  }

  if (specName === "Endocrinología") {
    const dx = getVal("diagnóstico previo")
    const weightChange = getVal("peso")
    const fatigue = getVal("fatiga") ?? getVal("cabello")
    const pregnancy = getVal("embarazo") ?? false
    const tests = [...base]
    if ((dx && typeof dx === "string" && dx.toLowerCase().includes("diab")) || pregnancy) {
      tests.push("Microalbuminuria", "Perfil lipídico", "Cr sérica", "EGO")
    }
    if (weightChange === true || fatigue === true) {
      tests.push("Cortisol AM", "ACTH")
    }
    return Array.from(new Set(tests))
  }

  if (specName === "Medicina Interna") {
    const systemic = getVal("fiebre") ?? false
    const tests = [...base]
    if (systemic === true) {
      tests.push("PCR", "VSG", "Hemocultivos (si fiebre alta)")
    }
    return Array.from(new Set(tests))
  }

  return base
}

export function SpecialistMarketplace() {
  const { user } = useAuth()
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [doctors, setDoctors] = useState<DoctorOption[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("")
  const [selectedDoctor, setSelectedDoctor] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [responsesSaved, setResponsesSaved] = useState(false)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [linkStatus, setLinkStatus] = useState<"none" | "pending" | "accepted">("none")
  const [labOrder, setLabOrder] = useState<{ id: string; tests: string[]; lab_provider: string | null; status: string } | null>(null)
  const [labProviders, setLabProviders] = useState<{ id: string; name: string }[]>([])
  const [uploading, setUploading] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: labs } = await supabase.from("labs").select("id,name").order("name")
      setLabProviders(labs ?? [])

      const { data: specs } = await supabase.from("specialties").select("id,name,description").order("name")
      if ((specs?.length ?? 0) === 0) {
        await supabase
          .from("specialties")
          .upsert(
            [
              { name: "Cardiología", description: "Corazón y sistema circulatorio" },
              { name: "Endocrinología", description: "Especialistas hormonales" },
              { name: "Medicina Interna", description: "Atención integral de adultos" },
            ],
            { onConflict: "name" },
          )
        const { data: refreshed } = await supabase.from("specialties").select("id,name,description").order("name")
        setSpecialties(refreshed ?? [])
      } else {
        setSpecialties(specs ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    const loadDoctors = async () => {
      if (!selectedSpecialty) {
        setDoctors([])
        setSelectedDoctor("")
        setLinkStatus("none")
        return
      }
      const { data } = await supabase
        .from("doctor_specialties")
        .select("doctor_id, doctors(id, first_name, last_name, email)")
        .eq("specialty_id", selectedSpecialty)

      const mapped =
        data?.map((row: { doctor_id: string; doctors?: { first_name?: string; last_name?: string; email?: string } | null }) => ({
          id: row.doctor_id,
          name: `${row.doctors?.first_name ?? ""} ${row.doctors?.last_name ?? ""}`.trim() || "Doctor sin nombre",
          email: row.doctors?.email ?? "",
        })) ?? []
      setDoctors(mapped)
    }

    const loadOrder = async () => {
      if (!user || !selectedSpecialty || !selectedDoctor) {
        setLabOrder(null)
        return
      }
      const { data } = await supabase
        .from("lab_orders")
        .select("id, recommended_tests, status")
        .eq("patient_user_id", user.id)
        .eq("doctor_id", selectedDoctor)
        .eq("specialty_id", selectedSpecialty)
        .order("recommended_at", { ascending: false })
        .limit(1)
      const row = data?.[0]
      if (row) {
        const recommendedTests = row.recommended_tests as Record<string, unknown>
        const tests =
          Array.isArray(row.recommended_tests) && row.recommended_tests.length > 0
            ? row.recommended_tests as string[]
            : typeof row.recommended_tests === "object" && row.recommended_tests !== null
              ? ((recommendedTests.tests ?? []) as string[])
              : []
        const labProv =
          typeof row.recommended_tests === "object" && row.recommended_tests !== null
            ? ((recommendedTests.lab_provider ?? null) as string | null)
            : null
        setLabOrder({ id: row.id, tests, lab_provider: labProv, status: row.status })
      } else {
        setLabOrder(null)
      }
    }

    const loadLinkStatus = async () => {
      if (!user || !selectedDoctor) {
        setLinkStatus("none")
        return
      }
      const { data: links } = await supabase
        .from("doctor_patient_links")
        .select("status")
        .eq("doctor_id", selectedDoctor)
        .eq("patient_user_id", user.id)
        .limit(1)
      const st = links?.[0]?.status ?? null
      setLinkStatus(st === "accepted" ? "accepted" : st === "pending" ? "pending" : "none")
    }

    const loadQuestions = async () => {
      if (!selectedSpecialty) {
        setQuestions([])
        setAnswers({})
        setResponsesSaved(false)
        return
      }
      const { data } = await supabase
        .from("specialist_questions")
        .select("id, prompt, field_type, options, is_required, specialty_id")
        .eq("specialty_id", selectedSpecialty)
        .eq("active", true)
        .order("order_index")

      let rows = data ?? []
      if (rows.length === 0) {
        const specName = specialties.find((s) => s.id === selectedSpecialty)?.name ?? ""
        const defaults = fallbackQuestions[specName] ?? []
        if (defaults.length > 0) {
          await supabase.from("specialist_questions").insert(
            defaults.map((q) => ({
              specialty_id: selectedSpecialty,
              prompt: q.prompt,
              field_type: q.field_type,
              options: {},
              is_required: true,
              order_index: q.order_index,
              active: true,
            })),
          )
          const { data: refreshed } = await supabase
            .from("specialist_questions")
            .select("id, prompt, field_type, options, is_required, specialty_id")
            .eq("specialty_id", selectedSpecialty)
            .eq("active", true)
            .order("order_index")
          rows = refreshed ?? []
        }
      }

      // Asegurar que se inserten faltantes aunque ya existan algunas
      if (rows.length > 0) {
        const specName = specialties.find((s) => s.id === selectedSpecialty)?.name ?? ""
        const defaults = fallbackQuestions[specName] ?? []
        const existingPrompts = new Set(rows.map((r) => r.prompt.trim().toLowerCase()))
        const missing = defaults.filter((q) => !existingPrompts.has(q.prompt.trim().toLowerCase()))
        if (missing.length > 0) {
          await supabase.from("specialist_questions").insert(
            missing.map((q) => ({
              specialty_id: selectedSpecialty,
              prompt: q.prompt,
              field_type: q.field_type,
              options: {},
              is_required: true,
              order_index: q.order_index,
              active: true,
            })),
          )
          const { data: refreshed } = await supabase
            .from("specialist_questions")
            .select("id, prompt, field_type, options, is_required, specialty_id")
            .eq("specialty_id", selectedSpecialty)
            .eq("active", true)
            .order("order_index")
          rows = refreshed ?? rows
        }
      }

      setQuestions(rows)
      setAnswers({})
      setResponsesSaved(false)
    }

    loadDoctors()
    loadQuestions()
    loadLinkStatus()
    loadOrder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpecialty, selectedDoctor, user])

  const loadLatestOrder = async () => {
    if (!user || !selectedSpecialty || !selectedDoctor) return
    const { data } = await supabase
      .from("lab_orders")
      .select("id, recommended_tests, status")
      .eq("patient_user_id", user.id)
      .eq("doctor_id", selectedDoctor)
      .eq("specialty_id", selectedSpecialty)
      .order("recommended_at", { ascending: false })
      .limit(1)
    const row = data?.[0]
    if (row) {
      const recommendedTests = row.recommended_tests as Record<string, unknown>
      const tests =
        Array.isArray(row.recommended_tests) && row.recommended_tests.length > 0
          ? row.recommended_tests as string[]
          : typeof row.recommended_tests === "object" && row.recommended_tests !== null
            ? ((recommendedTests.tests ?? []) as string[])
            : []
      const labProv =
        typeof row.recommended_tests === "object" && row.recommended_tests !== null
          ? ((recommendedTests.lab_provider ?? null) as string | null)
          : null
      setLabOrder({ id: row.id, tests, lab_provider: labProv, status: row.status })
    }
  }

  useEffect(() => {
    const loadExistingResponses = async () => {
      if (!user || !selectedSpecialty || linkStatus !== "accepted") return
      const { data } = await supabase
        .from("specialist_responses")
        .select("question_id, answer")
        .eq("patient_user_id", user.id)
        .eq("specialty_id", selectedSpecialty)
      if (!data || data.length === 0) {
        return
      }
      const mapped: Record<string, unknown> = {}
      data.forEach((r) => {
        const answer = r.answer as Record<string, unknown> | null
        const val = answer && typeof answer === "object" && "value" in answer ? answer.value : answer
        mapped[r.question_id] = val
      })
      setAnswers(mapped)
      setResponsesSaved(true)
    }

    if (linkStatus === "accepted") {
      loadExistingResponses()
      loadLatestOrder()
    } else {
      setAnswers({})
      setResponsesSaved(false)
      setLabOrder(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkStatus])

  const handleRequestLink = async () => {
    if (!user || !selectedDoctor) return
    setError(null)
    setStatus(null)
    const payload = {
      doctor_id: selectedDoctor,
      patient_user_id: user.id,
      status: "pending",
      requested_by: "patient",
      requested_at: new Date().toISOString(),
      responded_at: null,
    }

    const { error: linkError } = await supabase
      .from("doctor_patient_links")
      .upsert(payload, { onConflict: "doctor_id,patient_user_id" })

    if (linkError) {
      // Si ya existe, reactivamos la solicitud a estado pending
      if (linkError.code === "23505" /* unique_violation */) {
        const { error: updateError } = await supabase
          .from("doctor_patient_links")
          .update({ status: "pending", requested_by: "patient", requested_at: new Date().toISOString(), responded_at: null })
          .eq("doctor_id", selectedDoctor)
          .eq("patient_user_id", user.id)
        if (updateError) {
          setError(updateError.message)
          return
        }
      } else {
        setError(linkError.message)
        return
      }
    }
    setLinkStatus("pending")
    setStatus("Solicitud enviada o reactivada. Verás el estado en tu portal. Cuando el doctor la acepte, verás el cuestionario.")
  }

  const handleSubmitResponses = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedSpecialty || questions.length === 0) return
    if (!selectedDoctor) {
      setError("Selecciona un especialista para enviar tus respuestas.")
      return
    }
    if (linkStatus !== "accepted") {
      setError("Primero debes tener la vinculación aceptada por el doctor.")
      return
    }
    setStatus(null)
    setError(null)

    const rows = questions.map((q) => ({
      patient_user_id: user.id,
      specialty_id: selectedSpecialty,
      doctor_id: selectedDoctor || null,
      question_id: q.id,
      answer: { value: answers[q.id] ?? null },
    }))

    await supabase
      .from("specialist_responses")
      .delete()
      .eq("patient_user_id", user.id)
      .eq("specialty_id", selectedSpecialty)

    const { error: insertError } = await supabase.from("specialist_responses").insert(rows)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setResponsesSaved(true)
    await ensureLabOrder()
    await loadLatestOrder()
    setStatus("Respuestas guardadas. Ahora puedes solicitar la vinculación.")
  }

  const ensureLabOrder = async () => {
    if (!user || !selectedSpecialty || !selectedDoctor) return
    if (creatingOrder) return
    if (linkStatus !== "accepted") return
    setCreatingOrder(true)
    try {
      const { data: existing } = await supabase
        .from("lab_orders")
        .select("id, recommended_tests")
        .eq("patient_user_id", user.id)
        .eq("doctor_id", selectedDoctor)
        .eq("specialty_id", selectedSpecialty)
        .limit(1)
      if (existing && existing.length > 0) {
        await loadLatestOrder()
        setCreatingOrder(false)
        return
      }

      const specName = specialties.find((s) => s.id === selectedSpecialty)?.name ?? ""
      const recommended = buildRecommendedTests(specName, answers, questions)
      const payload = {
        patient_user_id: user.id,
        doctor_id: selectedDoctor,
        specialty_id: selectedSpecialty,
        recommended_tests: { tests: recommended },
        notes: answers["notes"] ?? null,
        status: "pending_upload",
      }
      const { error: orderError } = await supabase.from("lab_orders").insert(payload)
      if (orderError) {
        setError(orderError.message)
      }
      await loadLatestOrder()
    } finally {
      setCreatingOrder(false)
    }
  }

  const handleLabChoice = async (choice: string) => {
    if (!labOrder || !user) return
    const payload = { tests: labOrder.tests, lab_provider: choice }
    const { error: updateError } = await supabase.from("lab_orders").update({ recommended_tests: payload }).eq("id", labOrder.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setLabOrder({ ...labOrder, lab_provider: choice })
    setStatus("Laboratorio guardado.")
  }

  const handleUpload = async (file: File | null) => {
    if (!file || !labOrder || !user) return
    setUploading(labOrder.id)
    setStatus(null)
    setError(null)

    const path = `lab-results/${labOrder.id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from("lab-results").upload(path, file)
    if (uploadError) {
      setError(uploadError.message)
      setUploading(null)
      return
    }

    const { error: insertError } = await supabase.from("lab_results").insert({
      lab_order_id: labOrder.id,
      storage_path: path,
      mime_type: file.type,
      uploaded_by: user.id,
    })
    if (insertError) {
      setError(insertError.message)
      setUploading(null)
      return
    }

    await supabase.from("lab_orders").update({ status: "awaiting_review" }).eq("id", labOrder.id)
    setStatus("Resultados cargados. El médico revisará tu estudio.")
    setUploading(null)
    setLabOrder({ ...labOrder, status: "awaiting_review" })
  }

  const renderField = (q: Question) => {
    const value = answers[q.id] ?? ""
    switch (q.field_type) {
      case "long_text":
        return (
          <Textarea
            value={value}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
            required={q.is_required}
          />
        )
      case "number":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
            required={q.is_required}
          />
        )
      case "date":
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
            required={q.is_required}
          />
        )
      case "boolean":
        return (
          <Select
            value={value?.toString() ?? ""}
            onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v === "true" }))}
            required={q.is_required}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una opción" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Sí</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        )
      case "single_select": {
        const opts: string[] = Array.isArray(q.options) ? q.options : []
        return (
          <Select
            value={value ?? ""}
            onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
            required={q.is_required}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona" />
            </SelectTrigger>
            <SelectContent>
              {opts.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }
      case "multi_select": {
        const opts: string[] = Array.isArray(q.options) ? q.options : []
        const selected: string[] = value ?? []
        return (
          <div className="flex flex-wrap gap-2">
            {opts.map((opt) => {
              const active = selected.includes(opt)
              return (
                <Button
                  key={opt}
                  type="button"
                  variant={active ? "default" : "outline"}
                  className={active ? "bg-zuli-veronica hover:bg-zuli-veronica-600 text-white" : ""}
                  onClick={() => {
                    setAnswers((prev) => {
                      const current: string[] = prev[q.id] ?? []
                      return {
                        ...prev,
                        [q.id]: active ? current.filter((c) => c !== opt) : [...current, opt],
                      }
                    })
                  }}
                >
                  {opt}
                </Button>
              )
            })}
          </div>
        )
      }
      default:
        return (
          <Input
            value={value}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
            required={q.is_required}
          />
        )
    }
  }

  const currentSpecialty = useMemo(
    () => specialties.find((s) => s.id === selectedSpecialty),
    [specialties, selectedSpecialty],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marketplace de especialistas</CardTitle>
        <CardDescription>
          Elige una especialidad, envía tus respuestas específicas y solicita el vínculo con el médico.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Especialidad</Label>
            <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
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
            {currentSpecialty?.description && (
              <p className="text-xs text-gray-500 mt-1">{currentSpecialty.description}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Especialista</Label>
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor} disabled={!selectedSpecialty || doctors.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={doctors.length === 0 ? "Sin especialistas aún" : "Selecciona especialista"} />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} · {d.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={!selectedDoctor || (questions.length > 0 && !responsesSaved)}
              onClick={handleRequestLink}
            >
              {questions.length > 0 && !responsesSaved ? "Guarda tus respuestas" : "Solicitar vinculación"}
            </Button>
          </div>
          <div className="space-y-2">
            <Label>Notas para el especialista</Label>
            <Input
              placeholder="Opcional: motivo de consulta"
              value={answers["notes"] ?? ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </div>

        {loading && <p className="text-sm text-gray-500">Cargando especialidades...</p>}

        {linkStatus === "accepted" && questions.length > 0 && (
          <form className="space-y-4" onSubmit={handleSubmitResponses}>
            <div className="grid gap-4">
              {questions.map((q) => (
                <div key={q.id} className="p-4 border rounded-lg bg-gray-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium text-gray-800">{q.prompt}</Label>
                    <span className="text-xs text-gray-500">{fieldLabels[q.field_type] ?? q.field_type}</span>
                  </div>
                  {renderField(q)}
                </div>
              ))}
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
            <Button type="submit" className="btn-zuli-gradient">
              Guardar respuestas
            </Button>
          </form>
        )}

        {linkStatus !== "accepted" && selectedSpecialty && selectedDoctor && (
          <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
            <AlertDescription>
              Solicita la vinculación y espera que el especialista la acepte para desbloquear el cuestionario.
              Estado: {linkStatus === "pending" ? "pendiente" : "sin solicitud"}
            </AlertDescription>
          </Alert>
        )}

        {linkStatus === "accepted" && !loading && questions.length === 0 && selectedSpecialty && (
          <p className="text-sm text-gray-500">No hay preguntas especializadas registradas para esta especialidad.</p>
        )}

        {linkStatus === "accepted" && labOrder && (
          <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-800">Estudios recomendados</p>
              <Badge variant="secondary">
                {labOrder.status === "pending_upload"
                  ? "Pendiente de carga"
                  : labOrder.status === "awaiting_review"
                    ? "En revisión"
                    : "Revisado"}
              </Badge>
            </div>
            {labOrder.tests.length > 0 ? (
              <ul className="text-sm text-gray-800 list-disc ml-4 space-y-1">
                {labOrder.tests.map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Sin pruebas registradas.</p>
            )}
            <div className="space-y-2">
              <Label>Laboratorio de convenio</Label>
              <Select value={labOrder.lab_provider ?? ""} onValueChange={handleLabChoice}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona laboratorio" />
                </SelectTrigger>
                <SelectContent>
                  {labProviders.map((lab) => (
                    <SelectItem key={lab.id} value={lab.id}>
                      {lab.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sube tu estudio (PDF o imagen)</Label>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
                disabled={uploading === labOrder.id}
                className="text-sm"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
