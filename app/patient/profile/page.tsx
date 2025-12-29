"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Phone,
  Mail,
  Calendar,
  Loader2,
  CheckCircle,
  AlertCircle,
  Stethoscope,
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
  doctor?: DoctorInfo
}

export default function PatientProfilePage() {
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

  // Form state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [birthDate, setBirthDate] = useState("")

  useEffect(() => {
    async function fetchQrData() {
      if (!qrId && !doctorIdParam) {
        setError("Enlace inválido. Por favor escanea un código QR válido.")
        setLoading(false)
        return
      }

      try {
        let doctorId = doctorIdParam

        // If we have a QR ID, fetch the QR link data
        if (qrId) {
          const { data: qrData, error: qrError } = await supabase
            .from("qr_links")
            .select("id, doctor_id, campaign_type")
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

        // Fetch doctor info
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!doctor) return

    setSubmitting(true)
    setError(null)

    try {
      // Create patient record linked to doctor
      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          date_of_birth: birthDate || null,
          doctor_id: doctor.id,
          // user_id is NULL - patient doesn't have an account yet
        })
        .select()
        .single()

      if (patientError) {
        throw patientError
      }

      // Record QR conversion if we have a QR link
      if (qrLink) {
        // Fire and forget - don't block on conversion tracking
        supabase
          .from("qr_conversions")
          .insert({
            qr_link_id: qrLink.id,
            patient_id: patient.id,
            conversion_type: "profile_created",
          })
          .then(() => {})
      }

      setSuccess(true)
    } catch (err) {
      console.error("Error creating patient:", err)
      setError("Error al registrar tus datos. Intenta de nuevo.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fadeIn">
        <Loader2 className="h-8 w-8 animate-spin text-zuli-indigo mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Cargando...</p>
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
            ¡Registro Exitoso!
          </h2>
          <p className="text-green-600 dark:text-green-300 mb-4">
            Tus datos han sido registrados con el Dr. {doctor?.first_name} {doctor?.last_name}
          </p>
          <p className="text-sm text-green-600/80 dark:text-green-400/80 mb-6">
            El doctor podrá contactarte para agendar tu cita.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => router.push("/login")}
              className="w-full btn-zuli-gradient"
            >
              Crear cuenta para ver mis citas
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

  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      {/* Doctor Info */}
      {doctor && (
        <Card className="bg-gradient-to-r from-zuli-indigo/10 to-zuli-veronica/10 border-zuli-indigo/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-zuli-tricolor flex items-center justify-center shadow-md">
                <Stethoscope className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Te registrarás con
                </p>
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  Dr. {doctor.first_name} {doctor.last_name}
                </h2>
                {doctor.specialty && (
                  <Badge variant="secondary" className="mt-1">
                    {doctor.specialty}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-zuli-veronica" />
              Datos de Paciente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Juan"
                  required
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="García"
                  required
                  className="h-12 text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Teléfono
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="55 1234 5678"
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@ejemplo.com"
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de nacimiento
              </Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            <Button
              type="submit"
              disabled={!firstName.trim() || !lastName.trim() || submitting}
              className="w-full h-12 text-base btn-zuli-gradient mt-4"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Registrarme
                </>
              )}
            </Button>

            <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-3">
              Al registrarte, aceptas que el doctor pueda contactarte para
              agendar citas y enviar información médica relevante.
            </p>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
