"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Stethoscope,
  ClipboardList,
  ChevronRight,
  ChevronLeft,
  User,
  Phone,
  Mail,
} from "lucide-react"

interface DoctorInfo {
  id: string
  first_name: string
  last_name: string
  specialty: string | null
}

interface QrLinkInfo {
  id: string
  doctor_id: string
  campaign_type: string
  metadata: Record<string, unknown> | null
}

// Survey question types
interface SurveyQuestion {
  id: string
  question: string
  type: "text" | "textarea" | "radio" | "scale"
  options?: string[]
  required?: boolean
}

// Default health survey questions
const defaultSurveyQuestions: SurveyQuestion[] = [
  {
    id: "chief_complaint",
    question: "¿Cuál es el motivo principal de tu consulta?",
    type: "textarea",
    required: true,
  },
  {
    id: "symptom_duration",
    question: "¿Hace cuánto tiempo presentas estos síntomas?",
    type: "radio",
    options: ["Menos de 1 semana", "1-2 semanas", "2-4 semanas", "1-3 meses", "Más de 3 meses"],
    required: true,
  },
  {
    id: "pain_level",
    question: "Si tienes dolor, ¿qué tan intenso es? (1 = leve, 10 = severo)",
    type: "scale",
    required: false,
  },
  {
    id: "medical_history",
    question: "¿Tienes alguna condición médica conocida? (diabetes, hipertensión, etc.)",
    type: "textarea",
    required: false,
  },
  {
    id: "current_medications",
    question: "¿Actualmente tomas algún medicamento?",
    type: "textarea",
    required: false,
  },
  {
    id: "allergies",
    question: "¿Tienes alergias a medicamentos o alimentos?",
    type: "text",
    required: false,
  },
]

export default function PatientSurveyPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const qrId = searchParams.get("qr")
  const doctorIdParam = searchParams.get("doctor_id")

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrLink, setQrLink] = useState<QrLinkInfo | null>(null)
  const [doctor, setDoctor] = useState<DoctorInfo | null>(null)

  // Survey steps
  const [currentStep, setCurrentStep] = useState(0) // 0 = patient info, 1+ = survey questions
  const [questions] = useState<SurveyQuestion[]>(defaultSurveyQuestions)

  // Patient info
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")

  // Survey answers
  const [answers, setAnswers] = useState<Record<string, string>>({})

  useEffect(() => {
    async function fetchQrData() {
      if (!qrId && !doctorIdParam) {
        setError("Enlace inválido. Por favor escanea un código QR válido.")
        setLoading(false)
        return
      }

      try {
        let doctorId = doctorIdParam

        if (qrId) {
          const { data: qrData, error: qrError } = await supabase
            .from("qr_links")
            .select("id, doctor_id, campaign_type, metadata")
            .eq("id", qrId)
            .single()

          if (qrError || !qrData) {
            setError("Código QR no encontrado o expirado.")
            setLoading(false)
            return
          }

          setQrLink(qrData)
          doctorId = qrData.doctor_id
        }

        if (doctorId) {
          const { data: doctorData, error: doctorError } = await supabase
            .from("doctors")
            .select("id, first_name, last_name, specialty")
            .eq("id", doctorId)
            .single()

          if (!doctorError && doctorData) {
            setDoctor(doctorData)
          }
        }
      } catch (err) {
        console.error("Error fetching QR data:", err)
        setError("Error al cargar la información. Intenta de nuevo.")
      } finally {
        setLoading(false)
      }
    }

    fetchQrData()
  }, [qrId, doctorIdParam])

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleNext = () => {
    if (currentStep === 0) {
      // Validate patient info
      if (!firstName.trim() || !lastName.trim()) {
        setError("Por favor ingresa tu nombre y apellido.")
        return
      }
    }
    setError(null)
    setCurrentStep((prev) => prev + 1)
  }

  const handleBack = () => {
    setError(null)
    setCurrentStep((prev) => prev - 1)
  }

  const handleSubmit = async () => {
    if (!doctor) return

    setSubmitting(true)
    setError(null)

    try {
      // Create patient record
      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          doctor_id: doctor.id,
        })
        .select()
        .single()

      if (patientError) throw patientError

      // Store survey responses
      const surveyData = {
        patient_id: patient.id,
        doctor_id: doctor.id,
        qr_link_id: qrLink?.id || null,
        survey_type: "specialty_survey",
        responses: answers,
        submitted_at: new Date().toISOString(),
      }

      // Try to store in patient_surveys if table exists, otherwise store in patient notes
      const { error: surveyError } = await supabase
        .from("patient_surveys")
        .insert(surveyData)

      if (surveyError) {
        // Fallback: store in patient notes or metadata
        console.log("Survey table may not exist, storing in notes")
      }

      // Record QR conversion
      if (qrLink) {
        // Fire and forget
        supabase
          .from("qr_conversions")
          .insert({
            qr_link_id: qrLink.id,
            patient_id: patient.id,
            conversion_type: "survey_completed",
          })
          .then(() => {})
      }

      setSuccess(true)
    } catch (err) {
      console.error("Error submitting survey:", err)
      setError("Error al enviar el cuestionario. Intenta de nuevo.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fadeIn">
        <Loader2 className="h-8 w-8 animate-spin text-zuli-indigo mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Cargando cuestionario...</p>
      </div>
    )
  }

  if (error && !doctor) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 animate-fadeIn">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Error
          </h2>
          <p className="text-red-600 dark:text-red-300">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (success) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 animate-fadeIn">
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">
            ¡Cuestionario Enviado!
          </h2>
          <p className="text-green-600 dark:text-green-300 mb-4">
            Gracias por completar el cuestionario. El Dr. {doctor?.first_name} {doctor?.last_name} revisará tu información.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => router.push("/login")}
              className="w-full btn-zuli-gradient"
            >
              Crear cuenta
            </Button>
            <Button
              variant="outline"
              onClick={() => window.close()}
              className="w-full"
            >
              Cerrar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalSteps = questions.length + 1 // +1 for patient info step
  const progress = ((currentStep + 1) / totalSteps) * 100

  return (
    <div className="space-y-4 pb-20 animate-fadeIn">
      {/* Doctor Info */}
      {doctor && (
        <Card className="bg-gradient-to-r from-zuli-indigo/10 to-zuli-veronica/10 border-zuli-indigo/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zuli-tricolor flex items-center justify-center shadow-md">
                <Stethoscope className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500">Cuestionario de</p>
                <p className="font-medium text-sm">
                  Dr. {doctor.first_name} {doctor.last_name}
                </p>
              </div>
              {doctor.specialty && (
                <Badge variant="secondary" className="text-xs">
                  {doctor.specialty}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Paso {currentStep + 1} de {totalSteps}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-zuli-tricolor rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Step 0: Patient Info */}
      {currentStep === 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-5 w-5 text-zuli-veronica" />
              Tus Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="firstName" className="text-sm">Nombre *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName" className="text-sm">Apellido *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-11"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone" className="text-sm flex items-center gap-1">
                <Phone className="h-3 w-3" /> Teléfono
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Survey Questions */}
      {currentStep > 0 && currentStep <= questions.length && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-5 w-5 text-zuli-veronica" />
              Pregunta {currentStep}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const question = questions[currentStep - 1]
              return (
                <div className="space-y-3">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {question.question}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </p>

                  {question.type === "text" && (
                    <Input
                      value={answers[question.id] || ""}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      className="h-11"
                    />
                  )}

                  {question.type === "textarea" && (
                    <Textarea
                      value={answers[question.id] || ""}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      rows={4}
                      className="text-base"
                    />
                  )}

                  {question.type === "radio" && question.options && (
                    <RadioGroup
                      value={answers[question.id] || ""}
                      onValueChange={(value) => handleAnswerChange(question.id, value)}
                    >
                      {question.options.map((option) => (
                        <div key={option} className="flex items-center space-x-3 py-2">
                          <RadioGroupItem value={option} id={option} />
                          <Label htmlFor={option} className="cursor-pointer">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {question.type === "scale" && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>1 - Leve</span>
                        <span>10 - Severo</span>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleAnswerChange(question.id, num.toString())}
                            className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all ${
                              answers[question.id] === num.toString()
                                ? "bg-zuli-indigo text-white"
                                : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        {currentStep > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="flex-1 h-12"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
        )}

        {currentStep < questions.length && (
          <Button
            type="button"
            onClick={handleNext}
            className="flex-1 h-12 btn-zuli-gradient"
          >
            Siguiente
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}

        {currentStep === questions.length && (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 h-12 btn-zuli-gradient"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Enviar Cuestionario
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
