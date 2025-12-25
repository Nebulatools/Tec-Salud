// Formulario base del paciente (vista user) - Diseño profesional uniforme
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, X, CheckCircle2, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

// Tipos de respuesta para preguntas booleanas
type BooleanAnswer = true | false | "no_sabe" | null

// Lista predefinida de condiciones crónicas comunes
const COMMON_CONDITIONS = [
  "Diabetes",
  "Hipertensión",
  "Asma",
  "Enfermedad cardíaca",
  "Artritis",
  "Depresión/Ansiedad",
  "Enfermedad renal",
  "Hipotiroidismo",
  "Cáncer",
  "EPOC",
]

// Lista predefinida de alergias comunes
const COMMON_ALLERGIES = [
  "Penicilina",
  "Sulfonamidas",
  "Aspirina/AINEs",
  "Látex",
  "Mariscos",
  "Nueces",
  "Huevo",
  "Leche",
  "Polen",
  "Ácaros del polvo",
]

type BaselineState = {
  blood_type: string
  height_cm: string
  weight_kg: string
  // Condiciones con respuesta Sí/No/No sabe
  has_diabetes: BooleanAnswer
  has_hypertension: BooleanAnswer
  has_heart_disease: BooleanAnswer
  has_asthma: BooleanAnswer
  has_cancer_history: BooleanAnswer
  has_surgeries: BooleanAnswer
  // Listas de items seleccionados
  selected_conditions: string[]
  custom_conditions: string[]
  selected_allergies: string[]
  custom_allergies: string[]
  // Texto libre
  current_medications: string
  surgeries_detail: string
  lifestyle_notes: string
}

// Componente para agregar items personalizados
function AddCustomItem({
  onAdd,
  placeholder,
}: {
  onAdd: (value: string) => void
  placeholder: string
}) {
  const [value, setValue] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = () => {
    if (value.trim()) {
      onAdd(value.trim())
      setValue("")
      setIsAdding(false)
    }
  }

  if (!isAdding) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsAdding(true)}
        className="border-dashed border-gray-300 text-gray-500 hover:text-zuli-indigo hover:border-zuli-indigo"
      >
        <Plus className="h-4 w-4 mr-1" />
        Agregar otro
      </Button>
    )
  }

  return (
    <div className="flex gap-2 items-center">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
        autoFocus
      />
      <Button type="button" size="sm" onClick={handleAdd} className="h-8 px-3 bg-zuli-indigo hover:bg-zuli-indigo-600">
        <CheckCircle2 className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)} className="h-8 px-2">
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

// Componente para pregunta con opciones Sí/No/No sabe
function BooleanQuestion({
  label,
  value,
  onChange,
  description,
}: {
  label: string
  value: BooleanAnswer
  onChange: (value: BooleanAnswer) => void
  description?: string
}) {
  return (
    <div className="space-y-2">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={value === true ? "default" : "outline"}
          size="sm"
          className={cn(
            "flex-1 h-9",
            value === true && "bg-zuli-indigo hover:bg-zuli-indigo-600 text-white"
          )}
          onClick={() => onChange(true)}
        >
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Sí
        </Button>
        <Button
          type="button"
          variant={value === false ? "default" : "outline"}
          size="sm"
          className={cn(
            "flex-1 h-9",
            value === false && "bg-slate-600 hover:bg-slate-700 text-white"
          )}
          onClick={() => onChange(false)}
        >
          No
        </Button>
        <Button
          type="button"
          variant={value === "no_sabe" ? "default" : "outline"}
          size="sm"
          className={cn(
            "flex-1 h-9",
            value === "no_sabe" && "bg-amber-500 hover:bg-amber-600 text-white"
          )}
          onClick={() => onChange("no_sabe")}
        >
          <HelpCircle className="h-4 w-4 mr-1" />
          No sé
        </Button>
      </div>
    </div>
  )
}

// Componente para selección múltiple con badges
function MultiSelectBadges({
  label,
  options,
  selectedValues,
  customValues,
  onToggle,
  onAddCustom,
  onRemoveCustom,
  addPlaceholder,
}: {
  label: string
  options: string[]
  selectedValues: string[]
  customValues: string[]
  onToggle: (value: string) => void
  onAddCustom: (value: string) => void
  onRemoveCustom: (value: string) => void
  addPlaceholder: string
}) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selectedValues.includes(opt)
          return (
            <Badge
              key={opt}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all text-sm py-1 px-3",
                isSelected
                  ? "bg-zuli-veronica hover:bg-zuli-veronica-600 text-white"
                  : "hover:bg-gray-100 text-gray-700"
              )}
              onClick={() => onToggle(opt)}
            >
              {isSelected && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {opt}
            </Badge>
          )
        })}
        {/* Items personalizados con botón de eliminar */}
        {customValues.map((opt) => (
          <Badge
            key={`custom-${opt}`}
            variant="default"
            className="bg-zuli-cyan hover:bg-zuli-cyan-600 text-white cursor-pointer transition-all text-sm py-1 px-3 group"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {opt}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemoveCustom(opt)
              }}
              className="ml-1 opacity-70 hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <AddCustomItem onAdd={onAddCustom} placeholder={addPlaceholder} />
    </div>
  )
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
    has_diabetes: null,
    has_hypertension: null,
    has_heart_disease: null,
    has_asthma: null,
    has_cancer_history: null,
    has_surgeries: null,
    selected_conditions: [],
    custom_conditions: [],
    selected_allergies: [],
    custom_allergies: [],
    current_medications: "",
    surgeries_detail: "",
    lifestyle_notes: "",
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
        const generalInfo = data.general_info as Record<string, unknown> | null
        const vitals = data.vitals as Record<string, unknown> | null
        const conditions = data.conditions as Record<string, unknown> | null
        const lifestyle = data.lifestyle as Record<string, unknown> | null

        setForm({
          blood_type: (generalInfo?.blood_type as string) ?? "",
          height_cm: (vitals?.height_cm as string) ?? "",
          weight_kg: (vitals?.weight_kg as string) ?? "",
          has_diabetes: (conditions?.has_diabetes as BooleanAnswer) ?? null,
          has_hypertension: (conditions?.has_hypertension as BooleanAnswer) ?? null,
          has_heart_disease: (conditions?.has_heart_disease as BooleanAnswer) ?? null,
          has_asthma: (conditions?.has_asthma as BooleanAnswer) ?? null,
          has_cancer_history: (conditions?.has_cancer_history as BooleanAnswer) ?? null,
          has_surgeries: (conditions?.has_surgeries as BooleanAnswer) ?? null,
          selected_conditions: (conditions?.selected_conditions as string[]) ?? [],
          custom_conditions: (conditions?.custom_conditions as string[]) ?? [],
          selected_allergies: (generalInfo?.selected_allergies as string[]) ?? [],
          custom_allergies: (generalInfo?.custom_allergies as string[]) ?? [],
          current_medications: (conditions?.current_medications as string) ?? "",
          surgeries_detail: (conditions?.surgeries_detail as string) ?? "",
          lifestyle_notes: (lifestyle?.notes as string) ?? "",
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
      selected_allergies: form.selected_allergies,
      custom_allergies: form.custom_allergies,
    }
    const vitals = {
      height_cm: form.height_cm,
      weight_kg: form.weight_kg,
    }
    const lifestyle = {
      notes: form.lifestyle_notes,
    }
    const conditions = {
      has_diabetes: form.has_diabetes,
      has_hypertension: form.has_hypertension,
      has_heart_disease: form.has_heart_disease,
      has_asthma: form.has_asthma,
      has_cancer_history: form.has_cancer_history,
      has_surgeries: form.has_surgeries,
      selected_conditions: form.selected_conditions,
      custom_conditions: form.custom_conditions,
      current_medications: form.current_medications,
      surgeries_detail: form.surgeries_detail,
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

    setStatus("Guardado correctamente. Tu médico verá estos datos en sus consultas.")
    setSaving(false)
  }

  // Helpers para toggle de listas
  const toggleCondition = (value: string) => {
    setForm((prev) => ({
      ...prev,
      selected_conditions: prev.selected_conditions.includes(value)
        ? prev.selected_conditions.filter((v) => v !== value)
        : [...prev.selected_conditions, value],
    }))
  }

  const toggleAllergy = (value: string) => {
    setForm((prev) => ({
      ...prev,
      selected_allergies: prev.selected_allergies.includes(value)
        ? prev.selected_allergies.filter((v) => v !== value)
        : [...prev.selected_allergies, value],
    }))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-zuli-veronica/20 border-t-zuli-veronica mx-auto mb-3" />
          Cargando formulario...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-zuli-indigo to-zuli-veronica text-white rounded-t-lg">
        <CardTitle className="text-xl">Formulario Médico Base</CardTitle>
        <CardDescription className="text-white/80">
          Completa tus datos generales para que tu médico tenga un contexto completo.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form className="space-y-8" onSubmit={handleSubmit}>
          {/* Sección: Datos Vitales */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
              Datos Vitales
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo de sangre</Label>
                <Input
                  value={form.blood_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, blood_type: e.target.value }))}
                  placeholder="Ej: O+, A-, AB+"
                />
              </div>
              <div className="space-y-2">
                <Label>Estatura (cm)</Label>
                <Input
                  value={form.height_cm}
                  onChange={(e) => setForm((prev) => ({ ...prev, height_cm: e.target.value }))}
                  type="number"
                  placeholder="Ej: 170"
                />
              </div>
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Input
                  value={form.weight_kg}
                  onChange={(e) => setForm((prev) => ({ ...prev, weight_kg: e.target.value }))}
                  type="number"
                  placeholder="Ej: 70"
                />
              </div>
            </div>
          </section>

          {/* Sección: Condiciones y Antecedentes */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
              Condiciones y Antecedentes
            </h3>

            {/* Preguntas Sí/No/No sabe */}
            <div className="grid md:grid-cols-2 gap-4">
              <BooleanQuestion
                label="¿Tiene diabetes?"
                value={form.has_diabetes}
                onChange={(v) => setForm((prev) => ({ ...prev, has_diabetes: v }))}
              />
              <BooleanQuestion
                label="¿Tiene hipertensión?"
                value={form.has_hypertension}
                onChange={(v) => setForm((prev) => ({ ...prev, has_hypertension: v }))}
              />
              <BooleanQuestion
                label="¿Tiene enfermedad cardíaca?"
                value={form.has_heart_disease}
                onChange={(v) => setForm((prev) => ({ ...prev, has_heart_disease: v }))}
              />
              <BooleanQuestion
                label="¿Tiene asma u otra enfermedad respiratoria?"
                value={form.has_asthma}
                onChange={(v) => setForm((prev) => ({ ...prev, has_asthma: v }))}
              />
              <BooleanQuestion
                label="¿Tiene antecedentes de cáncer?"
                value={form.has_cancer_history}
                onChange={(v) => setForm((prev) => ({ ...prev, has_cancer_history: v }))}
              />
              <BooleanQuestion
                label="¿Ha tenido cirugías previas?"
                value={form.has_surgeries}
                onChange={(v) => setForm((prev) => ({ ...prev, has_surgeries: v }))}
              />
            </div>

            {/* Detalle de cirugías si aplica */}
            {form.has_surgeries === true && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <Label>Detalle de cirugías</Label>
                <Textarea
                  value={form.surgeries_detail}
                  onChange={(e) => setForm((prev) => ({ ...prev, surgeries_detail: e.target.value }))}
                  placeholder="Describe las cirugías que has tenido y cuándo fueron..."
                  className="min-h-[80px]"
                />
              </div>
            )}

            {/* Otras condiciones (badges seleccionables) */}
            <div className="pt-4">
              <MultiSelectBadges
                label="Otras condiciones crónicas"
                options={COMMON_CONDITIONS}
                selectedValues={form.selected_conditions}
                customValues={form.custom_conditions}
                onToggle={toggleCondition}
                onAddCustom={(v) =>
                  setForm((prev) => ({ ...prev, custom_conditions: [...prev.custom_conditions, v] }))
                }
                onRemoveCustom={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    custom_conditions: prev.custom_conditions.filter((c) => c !== v),
                  }))
                }
                addPlaceholder="Ej: Fibromialgia"
              />
            </div>
          </section>

          {/* Sección: Alergias */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
              Alergias
            </h3>
            <MultiSelectBadges
              label="Selecciona las alergias que apliquen"
              options={COMMON_ALLERGIES}
              selectedValues={form.selected_allergies}
              customValues={form.custom_allergies}
              onToggle={toggleAllergy}
              onAddCustom={(v) =>
                setForm((prev) => ({ ...prev, custom_allergies: [...prev.custom_allergies, v] }))
              }
              onRemoveCustom={(v) =>
                setForm((prev) => ({
                  ...prev,
                  custom_allergies: prev.custom_allergies.filter((a) => a !== v),
                }))
              }
              addPlaceholder="Ej: Contraste yodado"
            />
          </section>

          {/* Sección: Medicamentos */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
              Medicamentos Actuales
            </h3>
            <div className="space-y-2">
              <Label>Lista de medicamentos que tomas actualmente</Label>
              <Textarea
                value={form.current_medications}
                onChange={(e) => setForm((prev) => ({ ...prev, current_medications: e.target.value }))}
                placeholder="Nombre del medicamento, dosis y frecuencia. Ej: Metformina 500mg, 2 veces al día"
                className="min-h-[100px]"
              />
            </div>
          </section>

          {/* Sección: Estilo de Vida */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
              Estilo de Vida
            </h3>
            <div className="space-y-2">
              <Label>Hábitos y estilo de vida</Label>
              <Textarea
                value={form.lifestyle_notes}
                onChange={(e) => setForm((prev) => ({ ...prev, lifestyle_notes: e.target.value }))}
                placeholder="Tabaco, alcohol, ejercicio, dieta, horas de sueño..."
                className="min-h-[100px]"
              />
            </div>
          </section>

          {/* Mensajes de estado */}
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

          {/* Botón de guardar */}
          <Button
            type="submit"
            className="w-full md:w-auto btn-zuli-gradient text-lg py-5"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white mr-2" />
                Guardando...
              </>
            ) : (
              "Guardar Formulario"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
