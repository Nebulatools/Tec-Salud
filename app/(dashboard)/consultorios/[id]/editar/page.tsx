"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useAppUser } from "@/hooks/use-app-user"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Building2,
  ArrowLeft,
  Loader2,
  Clock,
  Upload,
  X,
  CheckCircle,
  Image,
} from "lucide-react"

interface OperatingHours {
  [key: string]: { open: string; close: string } | undefined
}

interface MedicalUnit {
  id: string
  name: string
  address_line: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  operating_hours: OperatingHours | null
  role: "owner" | "admin" | "staff"
}

const dayNames: Record<string, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
}

const defaultHours = { open: "09:00", close: "18:00" }

export default function EditarConsultorioPage() {
  const params = useParams()
  const router = useRouter()
  const { doctorId, loading: userLoading } = useAppUser()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [unit, setUnit] = useState<MedicalUnit | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [operatingHours, setOperatingHours] = useState<OperatingHours>({})
  const [enabledDays, setEnabledDays] = useState<Record<string, boolean>>({})

  const unitId = params.id as string

  useEffect(() => {
    async function fetchUnit() {
      if (!doctorId || !unitId) return

      try {
        const { data, error } = await supabase
          .from("doctor_units")
          .select(`
            role,
            unit:medical_units(
              id,
              name,
              address_line,
              phone,
              email,
              logo_url,
              operating_hours
            )
          `)
          .eq("doctor_id", doctorId)
          .eq("unit_id", unitId)
          .single()

        if (error) throw error

        const unitData = data?.unit as unknown as {
          id: string
          name: string
          address_line: string | null
          phone: string | null
          email: string | null
          logo_url: string | null
          operating_hours: OperatingHours | null
        } | null

        if (!unitData) {
          setError("Consultorio no encontrado")
          return
        }

        const role = data.role as "owner" | "admin" | "staff"

        // Check permissions
        if (role !== "owner" && role !== "admin") {
          setError("No tienes permisos para editar este consultorio")
          return
        }

        setUnit({ ...unitData, role })

        // Populate form
        setName(unitData.name)
        setAddress(unitData.address_line || "")
        setPhone(unitData.phone || "")
        setEmail(unitData.email || "")
        setLogoUrl(unitData.logo_url)
        setLogoPreview(unitData.logo_url)

        // Populate operating hours
        const hours = unitData.operating_hours || {}
        setOperatingHours(hours)

        // Set enabled days
        const enabled: Record<string, boolean> = {}
        Object.keys(dayNames).forEach((day) => {
          enabled[day] = !!hours[day]
        })
        setEnabledDays(enabled)
      } catch (err: unknown) {
        const error = err as { message?: string }
        console.error("Error fetching unit:", error.message || err)
        setError("No se pudo cargar el consultorio")
      } finally {
        setLoading(false)
      }
    }

    if (doctorId) {
      fetchUnit()
    } else if (!userLoading) {
      setLoading(false)
    }
  }, [doctorId, unitId, userLoading])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Por favor selecciona una imagen válida")
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("La imagen no debe superar 2MB")
      return
    }

    setUploadingLogo(true)
    setError(null)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop()
      const fileName = `${unitId}-${Date.now()}.${fileExt}`
      const filePath = `clinic-logos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("clinic-assets")
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("clinic-assets")
        .getPublicUrl(filePath)

      setLogoUrl(publicUrl)
    } catch (err: unknown) {
      const error = err as { message?: string }
      console.error("Error uploading logo:", error.message || err)
      setError("Error al subir el logo")
      setLogoPreview(unit?.logo_url || null)
    } finally {
      setUploadingLogo(false)
    }
  }

  const removeLogo = () => {
    setLogoUrl(null)
    setLogoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const toggleDay = (day: string) => {
    setEnabledDays((prev) => {
      const newEnabled = { ...prev, [day]: !prev[day] }

      // Update operating hours accordingly
      if (!newEnabled[day]) {
        setOperatingHours((prevHours) => {
          const newHours = { ...prevHours }
          delete newHours[day]
          return newHours
        })
      } else {
        setOperatingHours((prevHours) => ({
          ...prevHours,
          [day]: defaultHours,
        }))
      }

      return newEnabled
    })
  }

  const updateHours = (day: string, field: "open" | "close", value: string) => {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: {
        ...((prev[day] as { open: string; close: string }) || defaultHours),
        [field]: value,
      },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Filter out disabled days from operating hours
      const filteredHours: OperatingHours = {}
      Object.entries(operatingHours).forEach(([day, hours]) => {
        if (enabledDays[day] && hours) {
          filteredHours[day] = hours
        }
      })

      const { error: updateError } = await supabase
        .from("medical_units")
        .update({
          name: name.trim(),
          address_line: address.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          logo_url: logoUrl,
          operating_hours: filteredHours,
          updated_at: new Date().toISOString(),
        })
        .eq("id", unitId)

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => {
        router.push(`/consultorios/${unitId}`)
      }, 1500)
    } catch (err: unknown) {
      const error = err as { message?: string }
      console.error("Error updating unit:", error.message || err)
      setError("Error al guardar los cambios")
    } finally {
      setSaving(false)
    }
  }

  if (userLoading || loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded animate-shimmer" />
          <div className="h-8 w-48 rounded animate-shimmer" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-64 rounded animate-shimmer" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!doctorId) {
    return (
      <div className="text-center py-16 animate-fadeIn">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Building2 className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Acceso restringido
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          Esta vista es solo para doctores registrados.
        </p>
      </div>
    )
  }

  if (error && !unit) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center gap-4">
          <Link href="/consultorios">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Editar Consultorio
          </h1>
        </div>
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <Link href="/consultorios">
              <Button variant="outline" className="mt-4">
                Volver a consultorios
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/consultorios/${unitId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Editar Consultorio
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Actualiza la información de tu consultorio
          </p>
        </div>
      </div>

      {/* Success Alert */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Cambios guardados exitosamente. Redirigiendo...
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && unit && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-zuli-veronica" />
              Información General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Logo del Consultorio</Label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-200">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploadingLogo}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {logoPreview ? "Cambiar logo" : "Subir logo"}
                  </Button>
                  {logoPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeLogo}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500">PNG o JPG, máximo 2MB</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Consultorio Centro Médico"
                required
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ej: Av. Reforma 123, Col. Centro, CDMX"
                rows={2}
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: 55 1234 5678"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ej: consultorio@email.com"
                  disabled={saving}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-zuli-veronica" />
              Horario de Atención
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(dayNames).map(([key, name]) => (
                <div key={key} className="flex items-center gap-4 py-2 border-b last:border-0">
                  <div className="flex items-center gap-3 w-32">
                    <Switch
                      checked={enabledDays[key] || false}
                      onCheckedChange={() => toggleDay(key)}
                      disabled={saving}
                    />
                    <span className={`font-medium ${enabledDays[key] ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}`}>
                      {name}
                    </span>
                  </div>

                  {enabledDays[key] && (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={operatingHours[key]?.open || "09:00"}
                        onChange={(e) => updateHours(key, "open", e.target.value)}
                        className="w-32"
                        disabled={saving}
                      />
                      <span className="text-gray-500">a</span>
                      <Input
                        type="time"
                        value={operatingHours[key]?.close || "18:00"}
                        onChange={(e) => updateHours(key, "close", e.target.value)}
                        className="w-32"
                        disabled={saving}
                      />
                    </div>
                  )}

                  {!enabledDays[key] && (
                    <span className="text-gray-400 text-sm">Cerrado</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Link href={`/consultorios/${unitId}`}>
            <Button type="button" variant="outline" disabled={saving}>
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={!name.trim() || saving}
            className="btn-zuli-gradient"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Cambios"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
