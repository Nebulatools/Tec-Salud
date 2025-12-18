// Portal de usuario/paciente - Dashboard de progreso
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  User,
  FileText,
  Upload,
  CheckCircle2,
  Circle,
  ArrowRight,
  Stethoscope,
  Heart,
  Activity,
  Clock,
  AlertTriangle,
  Sparkles,
  Calendar,
} from "lucide-react"

type ProgressData = {
  baselineCompleted: boolean
  specialtyQuestionnaires: {
    specialty_id: string
    specialty_name: string
    doctor_name: string
    completed: boolean
    has_lab_results: boolean
    status: string
  }[]
}

const specialtyIcons: Record<string, React.ReactNode> = {
  Cardiología: <Heart className="h-4 w-4" />,
  Endocrinología: <Activity className="h-4 w-4" />,
  "Medicina Interna": <Stethoscope className="h-4 w-4" />,
}

export default function UserPortalPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<ProgressData>({
    baselineCompleted: false,
    specialtyQuestionnaires: [],
  })

  useEffect(() => {
    const loadProgress = async () => {
      if (!user) return
      setLoading(true)

      // Verificar cuestionario base
      const { data: baseline } = await supabase
        .from("patient_baseline_forms")
        .select("general_info, vitals, lifestyle, conditions")
        .eq("patient_user_id", user.id)
        .maybeSingle()

      const hasBaseline =
        baseline &&
        Object.values(baseline).some(
          (section) =>
            section && Object.values(section as object).some((v) => v && String(v).trim())
        )

      // Obtener lab_orders para ver especialidades y estado
      const { data: orders } = await supabase
        .from("lab_orders")
        .select(
          "specialty_id, doctor_id, status, specialties(name), doctors(first_name, last_name), lab_results(id)"
        )
        .eq("patient_user_id", user.id)

      // Obtener respuestas de especialidad
      const { data: responses } = await supabase
        .from("specialist_responses")
        .select("specialty_id")
        .eq("patient_user_id", user.id)

      const responsesBySpecialty = new Set(responses?.map((r) => r.specialty_id) ?? [])

      // Mapear cuestionarios de especialidad
      const specialtyMap = new Map<
        string,
        {
          specialty_id: string
          specialty_name: string
          doctor_name: string
          completed: boolean
          has_lab_results: boolean
          status: string
        }
      >()

      orders?.forEach((o: {
        specialty_id: string
        doctor_id: string
        status: string
        specialties?: { name: string } | null
        doctors?: { first_name: string; last_name: string } | null
        lab_results?: { id: string }[] | null
      }) => {
        const key = o.specialty_id
        if (!specialtyMap.has(key)) {
          specialtyMap.set(key, {
            specialty_id: o.specialty_id,
            specialty_name: o.specialties?.name ?? "Especialidad",
            doctor_name: `Dr. ${o.doctors?.first_name ?? ""} ${o.doctors?.last_name ?? ""}`.trim(),
            completed: responsesBySpecialty.has(o.specialty_id),
            has_lab_results: (o.lab_results?.length ?? 0) > 0,
            status: o.status,
          })
        }
      })

      setProgress({
        baselineCompleted: !!hasBaseline,
        specialtyQuestionnaires: Array.from(specialtyMap.values()),
      })

      setLoading(false)
    }

    if (user) loadProgress()
  }, [user])

  const totalSteps = 1 + progress.specialtyQuestionnaires.length * 2
  const completedSteps =
    (progress.baselineCompleted ? 1 : 0) +
    progress.specialtyQuestionnaires.reduce(
      (acc, q) => acc + (q.completed ? 1 : 0) + (q.has_lab_results ? 1 : 0),
      0
    )
  const overallProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-zuli-veronica/20 border-t-zuli-veronica mx-auto" />
          <p className="text-gray-500 mt-3">Cargando tu portal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-zuli-veronica to-zuli-indigo rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mi Portal de Salud</h1>
            <p className="text-white/80 mt-1">
              Completa tu información para una mejor atención médica
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/80">Progreso general</p>
            <p className="text-3xl font-bold">{Math.round(overallProgress)}%</p>
          </div>
        </div>
        <Progress value={overallProgress} className="mt-4 h-2 bg-white/30" />
      </div>

      {/* Pasos del proceso */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Paso 1: Cuestionario Base */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-lg ${
            progress.baselineCompleted
              ? "border-zuli-indigo/30 bg-zuli-indigo/5"
              : "border-zuli-veronica/20 bg-zuli-veronica/5"
          }`}
          onClick={() => router.push("/user/perfil")}
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-white shadow-sm">
                <User
                  className={`h-6 w-6 ${
                    progress.baselineCompleted ? "text-zuli-indigo" : "text-zuli-veronica"
                  }`}
                />
              </div>
              {progress.baselineCompleted ? (
                <Badge className="bg-zuli-indigo/10 text-zuli-indigo">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completado
                </Badge>
              ) : (
                <Badge className="bg-zuli-veronica/10 text-zuli-veronica">
                  <Circle className="h-3 w-3 mr-1" />
                  Pendiente
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 mt-4">Cuestionario Base</h3>
            <p className="text-sm text-gray-500 mt-1">
              Tu información médica general: tipo de sangre, alergias, condiciones
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-zuli-veronica hover:text-zuli-veronica-600 hover:bg-zuli-veronica/10 p-0"
            >
              {progress.baselineCompleted ? "Ver/Editar" : "Completar ahora"}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Paso 2: Buscar Especialista */}
        <Card
          className="cursor-pointer transition-all hover:shadow-lg border-zuli-indigo/20 bg-zuli-indigo/5"
          onClick={() => router.push("/user/especialistas")}
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-white shadow-sm">
                <Stethoscope className="h-6 w-6 text-zuli-indigo" />
              </div>
              <Badge className="bg-zuli-indigo/10 text-zuli-indigo">
                <Sparkles className="h-3 w-3 mr-1" />
                Marketplace
              </Badge>
            </div>
            <h3 className="font-semibold text-gray-900 mt-4">Buscar Especialista</h3>
            <p className="text-sm text-gray-500 mt-1">
              Encuentra al médico ideal y completa su cuestionario específico
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-zuli-veronica hover:text-zuli-veronica-600 hover:bg-zuli-veronica/10 p-0"
            >
              Explorar especialistas
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Paso 3: Subir Resultados */}
        <Card
          className="cursor-pointer transition-all hover:shadow-lg border-zuli-cyan/20 bg-zuli-cyan/5"
          onClick={() => router.push("/user/laboratorios")}
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-white shadow-sm">
                <Upload className="h-6 w-6 text-zuli-cyan-600" />
              </div>
              <Badge className="bg-zuli-cyan/10 text-zuli-cyan-700">
                <FileText className="h-3 w-3 mr-1" />
                Archivos
              </Badge>
            </div>
            <h3 className="font-semibold text-gray-900 mt-4">Resultados de Lab</h3>
            <p className="text-sm text-gray-500 mt-1">
              Sube tus estudios de laboratorio para que el doctor los revise
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-zuli-veronica hover:text-zuli-veronica-600 hover:bg-zuli-veronica/10 p-0"
            >
              Ver laboratorios
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Estado de cuestionarios de especialidad */}
      {progress.specialtyQuestionnaires.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-zuli-veronica" />
              Mis Consultas Activas
            </CardTitle>
            <CardDescription>
              Estado de tus cuestionarios y resultados de laboratorio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {progress.specialtyQuestionnaires.map((q) => (
                <div
                  key={q.specialty_id}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-lg ${
                        q.completed && q.has_lab_results
                          ? "bg-zuli-indigo/10"
                          : q.completed
                          ? "bg-zuli-veronica/10"
                          : "bg-gray-100"
                      }`}
                    >
                      {specialtyIcons[q.specialty_name] ?? <Stethoscope className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{q.specialty_name}</p>
                      <p className="text-sm text-gray-500">{q.doctor_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Estado del cuestionario */}
                    <div className="flex items-center gap-1">
                      {q.completed ? (
                        <Badge className="bg-zuli-indigo/10 text-zuli-indigo">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Cuestionario
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          <Circle className="h-3 w-3 mr-1" />
                          Cuestionario
                        </Badge>
                      )}
                    </div>

                    {/* Estado de resultados */}
                    <div className="flex items-center gap-1">
                      {q.has_lab_results ? (
                        <Badge className="bg-zuli-indigo/10 text-zuli-indigo">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Resultados
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          Resultados
                        </Badge>
                      )}
                    </div>

                    {/* Estado general */}
                    {q.status === "reviewed" ? (
                      <Badge className="bg-zuli-indigo/10 text-zuli-indigo">Revisado</Badge>
                    ) : q.status === "awaiting_review" ? (
                      <Badge className="bg-amber-100 text-amber-700">En revisión</Badge>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensaje si no hay consultas activas */}
      {progress.specialtyQuestionnaires.length === 0 && (
        <Card className="border-2 border-dashed border-gray-200">
          <CardContent className="py-12 text-center">
            <Stethoscope className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-700">Sin consultas activas</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              {progress.baselineCompleted
                ? "Ya completaste tu cuestionario base. Busca un especialista para continuar."
                : "Completa primero tu cuestionario base, luego busca un especialista."}
            </p>
            <Button
              className="mt-4 btn-zuli-gradient"
              onClick={() =>
                router.push(progress.baselineCompleted ? "/user/especialistas" : "/user/perfil")
              }
            >
              {progress.baselineCompleted ? "Buscar especialista" : "Completar cuestionario base"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Alerta si falta el cuestionario base */}
      {!progress.baselineCompleted && progress.specialtyQuestionnaires.length > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-700">Cuestionario base pendiente</p>
                <p className="text-sm text-amber-600">
                  Completa tu información general para que los especialistas tengan un mejor
                  contexto.
                </p>
              </div>
              <Button
                size="sm"
                className="ml-auto bg-amber-500 hover:bg-amber-600"
                onClick={() => router.push("/user/perfil")}
              >
                Completar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
