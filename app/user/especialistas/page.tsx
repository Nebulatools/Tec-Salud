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
  first_name: string
  last_name: string
  email: string
  specialty_id: string
  specialty_name: string
  specialty_description: string | null
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
      .select("doctor_id, specialty_id, doctors(id, first_name, last_name, email), specialties(id, name, description)")

    const mapped: Doctor[] =
      doctorSpecs?.map((ds: any) => ({
        id: ds.doctors?.id ?? ds.doctor_id,
        first_name: ds.doctors?.first_name ?? "",
        last_name: ds.doctors?.last_name ?? "",
        email: ds.doctors?.email ?? "",
        specialty_id: ds.specialty_id,
        specialty_name: ds.specialties?.name ?? "",
        specialty_description: ds.specialties?.description ?? null,
      })) ?? []

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
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-zuli-veronica/20 border-t-zuli-veronica mx-auto" />
          <p className="text-gray-500 mt-3">Cargando especialistas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-zuli-veronica to-zuli-indigo rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Encuentra tu Especialista</h1>
        <p className="text-white/80 mt-1">
          Busca por nombre, especialidad o usa los filtros para encontrar al médico ideal
        </p>
      </div>

      {/* Barra de búsqueda */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre o especialidad..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">Filtrar:</span>
        </div>
      </div>

      {/* Filtros de especialidad */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedSpecialty === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedSpecialty(null)}
          className={selectedSpecialty === null ? "bg-zuli-veronica hover:bg-zuli-veronica-600" : ""}
        >
          Todas
        </Button>
        {specialties.map((spec) => {
          const colors = specialtyColors[spec.name] ?? {
            bg: "bg-gray-50",
            text: "text-gray-600",
            border: "border-gray-200",
          }
          const isSelected = selectedSpecialty === spec.id

          return (
            <Button
              key={spec.id}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSpecialty(isSelected ? null : spec.id)}
              className={
                isSelected
                  ? "bg-zuli-veronica hover:bg-zuli-veronica-600"
                  : `${colors.bg} ${colors.text} ${colors.border} hover:${colors.bg}`
              }
            >
              {specialtyIcons[spec.name] ?? <Stethoscope className="h-4 w-4 mr-1" />}
              <span className="ml-1">{spec.name}</span>
            </Button>
          )
        })}
      </div>

      {/* Grid de especialistas */}
      {filteredDoctors.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {searchQuery || selectedSpecialty
                ? "No se encontraron especialistas con esos criterios"
                : "No hay especialistas disponibles aún"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDoctors.map((doctor) => {
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
                className="hover:shadow-lg transition-shadow cursor-pointer group overflow-hidden"
                onClick={() => handleSelectDoctor(doctor)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="h-12 w-12 rounded-full bg-zuli-tricolor text-white flex items-center justify-center text-lg font-bold shrink-0">
                      {doctor.first_name?.[0] ?? "D"}
                    </div>

                    <div className="flex-1 min-w-0 overflow-hidden">
                      {/* Nombre */}
                      <h3 className="font-semibold text-gray-900 truncate text-sm">
                        Dr. {doctor.first_name} {doctor.last_name}
                      </h3>

                      {/* Email */}
                      <p className="text-xs text-gray-500 truncate">{doctor.email}</p>

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
                      Llenar cuestionario
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
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white">
              <User className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">
                Al seleccionar un especialista, completarás un cuestionario específico
              </p>
              <p className="text-xs text-slate-500">
                Esto ayudará al médico a prepararse mejor para tu consulta
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
