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
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Stethoscope,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "lucide-react"
import { format, addDays, startOfWeek, isSameDay, isAfter, setHours, setMinutes } from "date-fns"
import { es } from "date-fns/locale"

interface DoctorInfo {
  id: string
  first_name: string
  last_name: string
  specialty: string | null
}

interface MedicalUnit {
  id: string
  name: string
  address_line: string | null
}

interface QrLinkInfo {
  id: string
  doctor_id: string
  campaign_type: string
}

interface TimeSlot {
  time: string
  available: boolean
}

// Default available time slots (9 AM - 6 PM, 30-minute intervals)
const defaultTimeSlots: TimeSlot[] = [
  { time: "09:00", available: true },
  { time: "09:30", available: true },
  { time: "10:00", available: true },
  { time: "10:30", available: true },
  { time: "11:00", available: true },
  { time: "11:30", available: true },
  { time: "12:00", available: true },
  { time: "12:30", available: true },
  { time: "13:00", available: false }, // Lunch break
  { time: "13:30", available: false },
  { time: "14:00", available: true },
  { time: "14:30", available: true },
  { time: "15:00", available: true },
  { time: "15:30", available: true },
  { time: "16:00", available: true },
  { time: "16:30", available: true },
  { time: "17:00", available: true },
  { time: "17:30", available: true },
]

export default function NewAppointmentPage() {
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
  const [medicalUnit, setMedicalUnit] = useState<MedicalUnit | null>(null)

  // Booking flow step
  const [step, setStep] = useState(0) // 0 = date, 1 = time, 2 = patient info, 3 = confirm

  // Date selection
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Time selection
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(defaultTimeSlots)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  // Patient info
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [reason, setReason] = useState("")

  // Booked appointments (to mark as unavailable)
  const [bookedSlots, setBookedSlots] = useState<string[]>([])

  useEffect(() => {
    async function fetchData() {
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

        if (doctorId) {
          // Fetch doctor info
          const { data: doctorData } = await supabase
            .from("doctors")
            .select("id, first_name, last_name, specialty")
            .eq("id", doctorId)
            .single()

          if (doctorData) {
            setDoctor(doctorData)
          }

          // Fetch doctor's primary medical unit
          const { data: unitData } = await supabase
            .from("doctor_units")
            .select("medical_units(id, name, address_line)")
            .eq("doctor_id", doctorId)
            .eq("is_primary", true)
            .single()

          if (unitData?.medical_units) {
            setMedicalUnit(unitData.medical_units as unknown as MedicalUnit)
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Error al cargar la información. Intenta de nuevo.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [qrId, doctorIdParam])

  // Fetch booked appointments for selected date
  useEffect(() => {
    async function fetchBookedSlots() {
      if (!doctor || !selectedDate) return

      const dateStr = format(selectedDate, "yyyy-MM-dd")
      const { data } = await supabase
        .from("appointments")
        .select("scheduled_time")
        .eq("doctor_id", doctor.id)
        .gte("scheduled_time", `${dateStr}T00:00:00`)
        .lt("scheduled_time", `${dateStr}T23:59:59`)
        .in("status", ["scheduled", "confirmed"])

      if (data) {
        const booked = data.map((apt) => {
          const time = new Date(apt.scheduled_time)
          return format(time, "HH:mm")
        })
        setBookedSlots(booked)
      }
    }

    fetchBookedSlots()
  }, [doctor, selectedDate])

  // Update time slots availability
  useEffect(() => {
    setTimeSlots(
      defaultTimeSlots.map((slot) => ({
        ...slot,
        available: slot.available && !bookedSlots.includes(slot.time),
      }))
    )
  }, [bookedSlots])

  const handlePrevWeek = () => {
    setWeekStart((prev) => addDays(prev, -7))
  }

  const handleNextWeek = () => {
    setWeekStart((prev) => addDays(prev, 7))
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setSelectedTime(null)
    setStep(1)
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    setStep(2)
  }

  const handleSubmit = async () => {
    if (!doctor || !selectedDate || !selectedTime) return

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

      // Create appointment
      const [hours, minutes] = selectedTime.split(":").map(Number)
      const scheduledTime = setMinutes(setHours(selectedDate, hours), minutes)

      const { error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          patient_id: patient.id,
          doctor_id: doctor.id,
          unit_id: medicalUnit?.id || null,
          scheduled_time: scheduledTime.toISOString(),
          status: "scheduled",
          reason: reason.trim() || null,
        })

      if (appointmentError) throw appointmentError

      // Record QR conversion
      if (qrLink) {
        // Fire and forget
        supabase
          .from("qr_conversions")
          .insert({
            qr_link_id: qrLink.id,
            patient_id: patient.id,
            conversion_type: "appointment_booked",
          })
          .then(() => {})
      }

      setSuccess(true)
    } catch (err) {
      console.error("Error booking appointment:", err)
      setError("Error al agendar la cita. Intenta de nuevo.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fadeIn">
        <Loader2 className="h-8 w-8 animate-spin text-zuli-indigo mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Cargando disponibilidad...</p>
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
            ¡Cita Agendada!
          </h2>
          <p className="text-green-600 dark:text-green-300 mb-2">
            Tu cita con el Dr. {doctor?.first_name} {doctor?.last_name}
          </p>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 my-4">
            <div className="flex items-center justify-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <Calendar className="h-5 w-5 text-zuli-indigo" />
              {selectedDate && format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
            </div>
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-zuli-indigo mt-1">
              <Clock className="h-5 w-5" />
              {selectedTime}
            </div>
            {medicalUnit && (
              <div className="flex items-center justify-center gap-1 text-sm text-slate-500 mt-2">
                <MapPin className="h-4 w-4" />
                {medicalUnit.name}
              </div>
            )}
          </div>
          <p className="text-sm text-green-600/80 dark:text-green-400/80 mb-4">
            Recibirás confirmación por {phone ? "SMS" : "email"}.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => router.push("/login")}
              className="w-full btn-zuli-gradient"
            >
              Crear cuenta para gestionar mis citas
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

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = new Date()

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
                <p className="text-xs text-slate-500">Agendar cita con</p>
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
            {medicalUnit && (
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-2 ml-13">
                <MapPin className="h-3 w-3" />
                {medicalUnit.name}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Progress Indicator */}
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-colors ${
              i <= step ? "bg-zuli-indigo" : "bg-slate-200 dark:bg-slate-700"
            }`}
          />
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Step 0: Date Selection */}
      {step === 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-zuli-veronica" />
              Selecciona una fecha
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={handlePrevWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                {format(weekStart, "MMMM yyyy", { locale: es })}
              </span>
              <Button variant="ghost" size="sm" onClick={handleNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {["L", "M", "X", "J", "V", "S", "D"].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-slate-500 py-1">
                  {day}
                </div>
              ))}
              {weekDays.map((date) => {
                const isPast = !isAfter(date, addDays(today, -1))
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                const isDisabled = isPast || isWeekend

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => !isDisabled && handleDateSelect(date)}
                    disabled={isDisabled}
                    className={`aspect-square rounded-lg text-sm font-medium transition-all ${
                      selectedDate && isSameDay(date, selectedDate)
                        ? "bg-zuli-indigo text-white"
                        : isDisabled
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                        : isSameDay(date, today)
                        ? "bg-zuli-indigo/20 text-zuli-indigo border border-zuli-indigo"
                        : "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    {format(date, "d")}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Time Selection */}
      {step === 1 && selectedDate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5 text-zuli-veronica" />
              {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-3">Selecciona un horario disponible:</p>
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => slot.available && handleTimeSelect(slot.time)}
                  disabled={!slot.available}
                  className={`py-3 px-2 rounded-lg text-sm font-medium transition-all ${
                    selectedTime === slot.time
                      ? "bg-zuli-indigo text-white"
                      : slot.available
                      ? "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed line-through"
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => setStep(0)}
              className="w-full mt-4"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Cambiar fecha
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Patient Info */}
      {step === 2 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-5 w-5 text-zuli-veronica" />
              Tus Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-zuli-indigo" />
              <div>
                <p className="text-sm font-medium">
                  {selectedDate && format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                </p>
                <p className="text-lg font-bold text-zuli-indigo">{selectedTime}</p>
              </div>
            </div>

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
                <Phone className="h-3 w-3" /> Teléfono *
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11"
                required
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

            <div className="space-y-1">
              <Label htmlFor="reason" className="text-sm">Motivo de la consulta</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Describe brevemente el motivo..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1 h-11"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Atrás
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!firstName.trim() || !lastName.trim() || !phone.trim() || submitting}
                className="flex-1 h-11 btn-zuli-gradient"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Agendando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Agendar Cita
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
