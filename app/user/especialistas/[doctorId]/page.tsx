// Página de detalle de un especialista
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Calendar,
  Star,
  Stethoscope,
  Heart,
  Activity,
  Mail,
  MapPin,
  GraduationCap,
  Clock,
  Award,
  User,
  Building2,
} from "lucide-react"

type DoctorDetail = {
  id: string
  user_id?: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  specialty_id: string
  specialty_name: string
  specialty_description: string | null
  avatar_url?: string | null
  headline?: string | null
  bio?: string | null
  education?: string | null
  experience_years?: number | null
  consultorio_address?: string | null
  rating?: number | null
  rating_count?: number
}

const specialtyIcons: Record<string, React.ReactNode> = {
  Cardiología: <Heart className="h-5 w-5" />,
  Endocrinología: <Activity className="h-5 w-5" />,
  "Medicina Interna": <Stethoscope className="h-5 w-5" />,
}

const specialtyColors: Record<string, { bg: string; text: string; border: string }> = {
  Cardiología: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
  Endocrinología: { bg: "bg-zuli-veronica/10", text: "text-zuli-veronica", border: "border-zuli-veronica/20" },
  "Medicina Interna": { bg: "bg-zuli-indigo/10", text: "text-zuli-indigo", border: "border-zuli-indigo/20" },
}

export default function DoctorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const doctorId = params.doctorId as string

  const [doctor, setDoctor] = useState<DoctorDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDoctor()
  }, [doctorId])

  const loadDoctor = async () => {
    if (!doctorId) return

    setLoading(true)
    setError(null)

    try {
      // Cargar datos básicos del doctor
      const { data: doctorData, error: doctorError } = await supabase
        .from("doctors")
        .select("id, user_id, first_name, last_name, email, phone")
        .eq("id", doctorId)
        .maybeSingle()

      if (doctorError) throw doctorError
      if (!doctorData) {
        setError("Especialista no encontrado")
        setLoading(false)
        return
      }

      // Cargar especialidad del doctor
      const { data: specData } = await supabase
        .from("doctor_specialties")
        .select("specialty_id, specialties(id, name, description)")
        .eq("doctor_id", doctorId)
        .maybeSingle()

      // Cargar perfil extendido desde app_users
      let metadata: Record<string, unknown> = {}
      if (doctorData.user_id) {
        const { data: appUser } = await supabase
          .from("app_users")
          .select("metadata")
          .eq("id", doctorData.user_id)
          .maybeSingle()

        if (appUser?.metadata) {
          metadata = appUser.metadata as Record<string, unknown>
        }
      }

      // Cargar rating
      const { data: ratingData } = await supabase
        .from("doctor_rating_summary")
        .select("average_rating, total_ratings")
        .eq("doctor_id", doctorId)
        .maybeSingle()

      // Cargar consultorio
      const { data: consultorioData } = await supabase
        .from("consultorios")
        .select("name, address, city, state")
        .eq("doctor_id", doctorId)
        .limit(1)
        .maybeSingle()

      const specialty = specData?.specialties as { id: string; name: string; description: string | null } | null

      setDoctor({
        id: doctorData.id,
        user_id: doctorData.user_id ?? undefined,
        first_name: doctorData.first_name,
        last_name: doctorData.last_name,
        email: doctorData.email,
        phone: doctorData.phone ?? undefined,
        specialty_id: specData?.specialty_id ?? "",
        specialty_name: specialty?.name ?? "General",
        specialty_description: specialty?.description ?? null,
        avatar_url: (metadata.avatar_url as string) ?? null,
        headline: (metadata.headline as string) ?? null,
        bio: (metadata.bio as string) ?? null,
        education: (metadata.education as string) ?? null,
        experience_years: (metadata.experience_years as number) ?? null,
        consultorio_address: consultorioData
          ? `${consultorioData.name}, ${consultorioData.address}, ${consultorioData.city}, ${consultorioData.state}`
          : null,
        rating: ratingData?.average_rating ?? null,
        rating_count: ratingData?.total_ratings ?? 0,
      })
    } catch (err) {
      console.error("Error loading doctor:", err)
      setError("Error al cargar la información del especialista")
    } finally {
      setLoading(false)
    }
  }

  const handleSolicitarCita = () => {
    if (!doctor) return
    router.push(`/user/cuestionario?doctor=${doctor.id}&specialty=${doctor.specialty_id}`)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Back button skeleton */}
        <div className="h-10 w-32 rounded-lg animate-shimmer" />

        {/* Header skeleton */}
        <div className="h-48 rounded-2xl animate-shimmer" />

        {/* Content skeleton */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="h-40 rounded-xl animate-shimmer" />
          <div className="h-40 rounded-xl animate-shimmer" style={{ animationDelay: "0.1s" }} />
        </div>
      </div>
    )
  }

  if (error || !doctor) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>

        <Card className="border-2 border-dashed border-gray-200">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {error || "Especialista no encontrado"}
            </h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              No pudimos encontrar la información del especialista. Intenta de nuevo.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => router.push("/user/especialistas")}>
              Ver todos los especialistas
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const colors = specialtyColors[doctor.specialty_name] ?? {
    bg: "bg-gray-50",
    text: "text-gray-600",
    border: "border-gray-200",
  }
  const hasRating = doctor.rating !== null && doctor.rating_count! > 0
  const rating = hasRating ? doctor.rating!.toFixed(1) : null
  const fullStars = hasRating ? Math.floor(doctor.rating!) : 0
  const hasHalfStar = hasRating ? (doctor.rating! % 1) >= 0.5 : false

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.back()} className="gap-2 hover:bg-gray-100">
        <ArrowLeft className="h-4 w-4" />
        Volver al Hub Médico
      </Button>

      {/* Header Card with Doctor Info */}
      <Card className="overflow-hidden border-0 shadow-xl">
        <div className="bg-gradient-to-r from-zuli-veronica to-zuli-indigo p-6 text-white relative">
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/20 -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/20 translate-y-1/2 -translate-x-1/2" />
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            {doctor.avatar_url ? (
              <img
                src={doctor.avatar_url}
                alt={`Dr. ${doctor.first_name}`}
                className="h-28 w-28 rounded-full object-cover ring-4 ring-white/30 shadow-xl"
              />
            ) : (
              <div className="h-28 w-28 rounded-full bg-white/20 flex items-center justify-center text-4xl font-bold ring-4 ring-white/30 shadow-xl">
                {doctor.first_name?.[0]}
              </div>
            )}

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold">
                  Dr. {doctor.first_name} {doctor.last_name}
                </h1>
                <Badge className={`${colors.bg} ${colors.text} text-sm`}>
                  {specialtyIcons[doctor.specialty_name] ?? <Stethoscope className="h-4 w-4" />}
                  <span className="ml-1">{doctor.specialty_name}</span>
                </Badge>
              </div>

              {doctor.headline && (
                <p className="text-white/90 text-lg mb-3">{doctor.headline}</p>
              )}

              {/* Rating */}
              <div className="flex items-center gap-2">
                {hasRating ? (
                  <>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < fullStars
                              ? "text-amber-400 fill-amber-400"
                              : i === fullStars && hasHalfStar
                                ? "text-amber-400 fill-amber-400/50"
                                : "text-white/30 fill-white/30"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-semibold">{rating}</span>
                    <span className="text-white/70">({doctor.rating_count} opiniones)</span>
                  </>
                ) : (
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                    Nuevo especialista
                  </span>
                )}
              </div>
            </div>

            {/* CTA Button */}
            <Button
              size="lg"
              onClick={handleSolicitarCita}
              className="bg-white text-zuli-veronica hover:bg-gray-100 shadow-lg w-full md:w-auto"
            >
              <Calendar className="h-5 w-5 mr-2" />
              Solicitar Cita
            </Button>
          </div>
        </div>
      </Card>

      {/* Info Cards Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* About */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-zuli-veronica/10 rounded-lg">
                <User className="h-5 w-5 text-zuli-veronica" />
              </div>
              <CardTitle className="text-base">Acerca del Doctor</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {doctor.bio ? (
              <p className="text-gray-600 leading-relaxed">{doctor.bio}</p>
            ) : (
              <p className="text-gray-400 italic">Sin información adicional disponible.</p>
            )}

            {doctor.specialty_description && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700">Especialidad:</span>{" "}
                  {doctor.specialty_description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Education & Experience */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <GraduationCap className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle className="text-base">Formación y Experiencia</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {doctor.education ? (
              <div className="flex items-start gap-3">
                <Award className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Educación</p>
                  <p className="text-gray-600 text-sm">{doctor.education}</p>
                </div>
              </div>
            ) : null}

            {doctor.experience_years ? (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Experiencia</p>
                  <p className="text-gray-600 text-sm">{doctor.experience_years} años de experiencia</p>
                </div>
              </div>
            ) : null}

            {!doctor.education && !doctor.experience_years && (
              <p className="text-gray-400 italic">Sin información de formación disponible.</p>
            )}
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Mail className="h-5 w-5 text-green-600" />
              </div>
              <CardTitle className="text-base">Información de Contacto</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{doctor.email}</span>
            </div>
            {doctor.phone && (
              <div className="flex items-center gap-3">
                <span className="text-gray-400">Tel:</span>
                <span className="text-gray-600">{doctor.phone}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <MapPin className="h-5 w-5 text-orange-600" />
              </div>
              <CardTitle className="text-base">Consultorio</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {doctor.consultorio_address ? (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                <p className="text-gray-600">{doctor.consultorio_address}</p>
              </div>
            ) : (
              <p className="text-gray-400 italic">Ubicación no disponible.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom CTA */}
      <Card className="bg-gradient-to-r from-zuli-veronica/5 via-zuli-indigo/5 to-zuli-cyan/5 border-zuli-veronica/20">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-zuli-veronica to-zuli-indigo shadow-lg">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  ¿Listo para agendar tu cita?
                </p>
                <p className="text-sm text-gray-500">
                  Completa un breve cuestionario para que el doctor se prepare mejor
                </p>
              </div>
            </div>
            <Button size="lg" onClick={handleSolicitarCita} className="btn-zuli-gradient w-full md:w-auto">
              <Calendar className="h-5 w-5 mr-2" />
              Solicitar Cita
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
