// Marketplace de especialistas - página separada
"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Filter,
  Heart,
  Stethoscope,
  Activity,
  Star,
  ArrowRight,
  User,
  Building2,
} from "lucide-react"

type Specialty = {
  id: string
  name: string
  description: string | null
  icon?: string
}

type Doctor = {
  id: string
  user_id?: string
  first_name: string
  last_name: string
  email: string
  specialty_id: string
  specialty_name: string
  specialty_description: string | null
  avatar_url?: string | null
  headline?: string | null
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

export default function EspecialistasMarketplacePage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(
    searchParams.get("specialty")
  )

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)

    // Cargar especialidades
    const { data: specs } = await supabase
      .from("specialties")
      .select("id, name, description")
      .order("name")

    // Si no hay especialidades, crear las predeterminadas
    if (!specs || specs.length === 0) {
      await supabase.from("specialties").upsert(
        [
          { name: "Cardiología", description: "Corazón y sistema circulatorio" },
          { name: "Endocrinología", description: "Especialistas hormonales" },
          { name: "Medicina Interna", description: "Atención integral de adultos" },
        ],
        { onConflict: "name" }
      )
      const { data: refreshed } = await supabase
        .from("specialties")
        .select("id, name, description")
        .order("name")
      setSpecialties(refreshed ?? [])
    } else {
      setSpecialties(specs)
    }

    // Cargar doctores con sus especialidades
    const { data: doctorSpecs } = await supabase
      .from("doctor_specialties")
      .select("doctor_id, specialty_id, doctors(id, user_id, first_name, last_name, email), specialties(id, name, description)")

    let mapped: Doctor[] =
      doctorSpecs?.map((ds: any) => ({
        id: ds.doctors?.id ?? ds.doctor_id,
        user_id: ds.doctors?.user_id ?? null,
        first_name: ds.doctors?.first_name ?? "",
        last_name: ds.doctors?.last_name ?? "",
        email: ds.doctors?.email ?? "",
        specialty_id: ds.specialty_id,
        specialty_name: ds.specialties?.name ?? "",
        specialty_description: ds.specialties?.description ?? null,
      })) ?? []

    const userIds = mapped.map((d) => d.user_id).filter(Boolean) as string[]
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("app_users")
        .select("id, metadata")
        .in("id", userIds)

      const metaMap = new Map<string, any>()
      profiles?.forEach((p: any) => metaMap.set(p.id, p.metadata))

      mapped = mapped.map((d) => {
        const meta = d.user_id ? metaMap.get(d.user_id) : null
        return {
          ...d,
          avatar_url: meta?.avatar_url ?? null,
          headline: meta?.headline ?? null,
        }
      })
    }

    setDoctors(mapped)
    setLoading(false)
  }

  const filteredDoctors = useMemo(() => {
    let result = doctors

    // Filtrar por especialidad
    if (selectedSpecialty) {
      result = result.filter((d) => d.specialty_id === selectedSpecialty)
    }

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (d) =>
          d.first_name.toLowerCase().includes(query) ||
          d.last_name.toLowerCase().includes(query) ||
          d.email.toLowerCase().includes(query) ||
          d.specialty_name.toLowerCase().includes(query)
      )
    }

    return result
  }, [doctors, selectedSpecialty, searchQuery])

  const handleSelectDoctor = (doctor: Doctor) => {
    router.push(`/user/cuestionario?doctor=${doctor.id}&specialty=${doctor.specialty_id}`)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Header skeleton */}
        <div className="h-32 rounded-2xl animate-shimmer" />

        {/* Search skeleton */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="h-10 flex-1 rounded-xl animate-shimmer" />
          <div className="h-10 w-32 rounded-xl animate-shimmer" style={{ animationDelay: '0.1s' }} />
        </div>

        {/* Filter skeleton */}
        <div className="flex flex-wrap gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-9 w-28 rounded-full animate-shimmer" style={{ animationDelay: `${i * 0.05}s` }} />
          ))}
        </div>

        {/* Grid skeleton */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full animate-shimmer" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded animate-shimmer" />
                    <div className="h-3 w-24 rounded animate-shimmer" style={{ animationDelay: '0.1s' }} />
                    <div className="h-6 w-20 rounded animate-shimmer" style={{ animationDelay: '0.15s' }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header with decorative elements */}
      <div className="bg-gradient-to-r from-zuli-veronica to-zuli-indigo rounded-2xl p-6 text-white relative overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/20 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/20 translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative">
          <h1 className="text-2xl font-bold">Encuentra tu Especialista</h1>
          <p className="text-white/80 mt-1">
            Busca por nombre, especialidad o usa los filtros para encontrar al médico ideal
          </p>
        </div>
      </div>

      {/* Enhanced Search Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <div className="absolute inset-0 bg-gradient-to-r from-zuli-veronica/5 to-zuli-indigo/5 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-zuli-veronica transition-colors" />
          <Input
            placeholder="Buscar por nombre o especialidad..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 py-3 h-12 rounded-xl border-gray-200 focus:border-zuli-veronica focus:ring-zuli-veronica/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filtrar:</span>
        </div>
      </div>

      {/* Enhanced Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button
          variant={selectedSpecialty === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedSpecialty(null)}
          className={`filter-pill whitespace-nowrap touch-target ${
            selectedSpecialty === null
              ? "filter-pill-active"
              : "filter-pill-inactive"
          }`}
        >
          Todas las especialidades
        </Button>
        {specialties.map((spec) => {
          const isSelected = selectedSpecialty === spec.id

          return (
            <Button
              key={spec.id}
              variant="outline"
              size="sm"
              onClick={() => setSelectedSpecialty(isSelected ? null : spec.id)}
              className={`filter-pill whitespace-nowrap touch-target border-2 transition-all ${
                isSelected
                  ? "border-zuli-veronica bg-zuli-veronica/10 text-zuli-veronica"
                  : "hover:border-gray-300"
              }`}
            >
              {specialtyIcons[spec.name] ?? <Stethoscope className="h-4 w-4" />}
              <span className="ml-1.5">{spec.name}</span>
            </Button>
          )
        })}
      </div>

      {/* Grid de especialistas */}
      {filteredDoctors.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-200 dark:border-gray-700 animate-fadeIn">
          <CardContent className="py-16 text-center">
            <div className="empty-state-icon-colored">
              <Building2 className="h-10 w-10 text-zuli-veronica" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery || selectedSpecialty
                ? "Sin resultados"
                : "Sin especialistas"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              {searchQuery || selectedSpecialty
                ? "No se encontraron especialistas con esos criterios. Intenta ajustar los filtros."
                : "No hay especialistas disponibles aún. Vuelve pronto."}
            </p>
            {(searchQuery || selectedSpecialty) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedSpecialty(null)
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDoctors.map((doctor, index) => {
            const colors = specialtyColors[doctor.specialty_name] ?? {
              bg: "bg-gray-50",
              text: "text-gray-600",
              border: "border-gray-200",
            }
            // Rating simulado (entre 4.0 y 5.0 para demostración)
            const rating = (4 + Math.random()).toFixed(1)
            const fullStars = Math.floor(Number(rating))
            const hasHalfStar = Number(rating) % 1 >= 0.5

            return (
              <Card
                key={`${doctor.id}-${doctor.specialty_id}`}
                className="cursor-pointer group overflow-hidden border-2 border-transparent hover:border-zuli-veronica/20 hover:shadow-xl transition-all duration-300 animate-fadeInUp"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => handleSelectDoctor(doctor)}
              >
                {/* Top accent bar */}
                <div className="h-1 bg-gradient-to-r from-zuli-veronica to-zuli-indigo opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    {doctor.avatar_url ? (
                      <img
                        src={doctor.avatar_url}
                        alt={doctor.first_name}
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-zuli-veronica/30 transition-all duration-300"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-zuli-veronica to-zuli-indigo text-white flex items-center justify-center text-lg font-bold shrink-0 ring-2 ring-transparent group-hover:ring-zuli-veronica/30 transition-all duration-300">
                        {doctor.first_name?.[0] ?? "D"}
                      </div>
                    )}

                    <div className="flex-1 min-w-0 overflow-hidden">
                      {/* Nombre */}
                      <h3 className="font-semibold text-gray-900 truncate text-sm">
                        Dr. {doctor.first_name} {doctor.last_name}
                      </h3>

                      {/* Email / headline */}
                      <p className="text-xs text-gray-500 truncate">{doctor.headline || doctor.email}</p>

                      {/* Especialidad Badge */}
                      <div className="mt-2">
                        <Badge className={`${colors.bg} ${colors.text} ${colors.border} text-xs px-2 py-0.5`}>
                          {specialtyIcons[doctor.specialty_name]}
                          <span className="ml-1 truncate max-w-[100px]">{doctor.specialty_name}</span>
                        </Badge>
                      </div>

                      {/* Descripción */}
                      {doctor.specialty_description && (
                        <p className="text-xs text-gray-400 mt-1.5 line-clamp-1">
                          {doctor.specialty_description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Rating y CTA */}
                  <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Estrellas */}
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < fullStars
                                ? "text-amber-400 fill-amber-400"
                                : i === fullStars && hasHalfStar
                                  ? "text-amber-400 fill-amber-400/50"
                                  : "text-gray-200 fill-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-medium text-gray-600">{rating}</span>
                    </div>
                    <span className="text-xs text-zuli-veronica font-medium group-hover:underline flex items-center gap-0.5 shrink-0">
                      Solicitar cita
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Info adicional */}
      <Card className="bg-gradient-to-r from-zuli-veronica/5 via-zuli-indigo/5 to-zuli-cyan/5 border-zuli-veronica/10 dark:from-zuli-veronica/10 dark:via-zuli-indigo/10 dark:to-zuli-cyan/10 animate-fadeIn">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-zuli-veronica to-zuli-indigo shadow-lg shadow-zuli-veronica/20">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Al seleccionar un especialista, completarás un cuestionario específico
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Esto ayudará al médico a prepararse mejor para tu consulta
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
