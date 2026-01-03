// Página de perfil básico del usuario (nombre, correo, teléfono, foto)
"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import {
  User,
  Mail,
  Phone,
  Camera,
  Save,
  Loader2,
  CheckCircle2,
  Upload,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

type ProfileState = {
  first_name: string
  last_name: string
  email: string
  phone: string
  avatar_url: string | null
}

export default function MiPerfilPage() {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<ProfileState>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    avatar_url: null,
  })

  useEffect(() => {
    const load = async () => {
      if (!user) return

      // Get app_users data
      const { data } = await supabase
        .from("app_users")
        .select("full_name, email, phone, metadata")
        .eq("id", user.id)
        .maybeSingle()

      if (data) {
        const metadata = data.metadata as Record<string, unknown> | null
        // Parse full_name into first_name and last_name
        const nameParts = (data.full_name || "").trim().split(" ")
        const firstName = nameParts[0] || ""
        const lastName = nameParts.slice(1).join(" ") || ""

        setForm({
          first_name: firstName,
          last_name: lastName,
          email: data.email || user.email || "",
          phone: data.phone || "",
          avatar_url: (metadata?.avatar_url as string) || null,
        })
      } else {
        // Initialize with auth user email
        setForm((prev) => ({
          ...prev,
          email: user.email || "",
        }))
      }
      setLoading(false)
    }
    load()
  }, [user])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes")
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no puede superar 5MB")
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Create unique filename (unified avatars bucket)
      const ext = file.name.split(".").pop()
      const filename = `users/${user.id}/avatar-${Date.now()}.${ext}`

      // Delete old avatar if exists in unified bucket
      if (form.avatar_url?.includes("/avatars/")) {
        const oldPath = form.avatar_url.split("/avatars/")[1]
        if (oldPath) {
          await supabase.storage.from("avatars").remove([oldPath])
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filename, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filename)

      setForm((prev) => ({ ...prev, avatar_url: urlData.publicUrl }))
      setStatus("Foto actualizada")
      setTimeout(() => setStatus(null), 2000)
    } catch (err) {
      console.error("Upload error:", err)
      setError("Error al subir la imagen")
    } finally {
      setUploading(false)
    }
  }

  const removeAvatar = async () => {
    if (!form.avatar_url || !user) return

    setUploading(true)
    try {
      // Handle both old and new bucket paths
      if (form.avatar_url.includes("/avatars/")) {
        const oldPath = form.avatar_url.split("/avatars/")[1]
        if (oldPath) {
          await supabase.storage.from("avatars").remove([oldPath])
        }
      } else if (form.avatar_url.includes("/user-avatars/")) {
        const oldPath = form.avatar_url.split("/user-avatars/")[1]
        if (oldPath) {
          await supabase.storage.from("user-avatars").remove([oldPath])
        }
      }
      setForm((prev) => ({ ...prev, avatar_url: null }))
      setStatus("Foto eliminada")
      setTimeout(() => setStatus(null), 2000)
    } catch (err) {
      console.error("Remove error:", err)
      setError("Error al eliminar la imagen")
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setStatus(null)
    setError(null)

    try {
      // Combine first_name and last_name for app_users.full_name
      const fullName = `${form.first_name} ${form.last_name}`.trim()

      // Update app_users
      const { error: upsertError } = await supabase.from("app_users").upsert(
        {
          id: user.id,
          full_name: fullName,
          email: form.email,
          phone: form.phone,
          metadata: {
            avatar_url: form.avatar_url,
          },
        },
        { onConflict: "id" }
      )

      if (upsertError) throw upsertError

      // Also sync to patients table if linked
      const firstName = form.first_name
      const lastName = form.last_name

      // Build update object with only non-empty values
      const patientUpdate: Record<string, string> = {}
      if (firstName) patientUpdate.first_name = firstName
      if (lastName) patientUpdate.last_name = lastName
      if (form.phone) patientUpdate.phone = form.phone
      if (form.email) patientUpdate.email = form.email

      // Only update patients if there are fields to update
      if (Object.keys(patientUpdate).length > 0) {
        const { error: patientError } = await supabase
          .from("patients")
          .update(patientUpdate)
          .eq("user_id", user.id)

        // Log but don't throw - patient record might not exist yet
        if (patientError) {
          console.warn("Patient sync warning:", patientError.message)
        }
      }

      setStatus("¡Perfil guardado correctamente!")
      setTimeout(() => setStatus(null), 3000)
    } catch (err) {
      console.error("Save error:", err)
      setError("Error al guardar el perfil")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-zuli-veronica/20 border-t-zuli-veronica mx-auto" />
          <p className="text-gray-500 mt-3">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-zuli-veronica to-zuli-indigo text-white border-0">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/20">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Mi Perfil</h1>
              <p className="text-white/80 text-sm">
                Tu información básica de contacto
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Avatar Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-zuli-veronica/10 rounded-lg">
                <Camera className="h-5 w-5 text-zuli-veronica" />
              </div>
              <div>
                <CardTitle className="text-base">Foto de Perfil</CardTitle>
                <p className="text-sm text-gray-500">Tu foto visible para los doctores</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {/* Avatar preview */}
            <div className="relative group">
              {form.avatar_url ? (
                <img
                  src={form.avatar_url}
                  alt="Avatar"
                  className="w-32 h-32 rounded-full object-cover ring-4 ring-gray-100"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-zuli-veronica/20 to-zuli-indigo/20 flex items-center justify-center ring-4 ring-gray-100">
                  <User className="h-16 w-16 text-gray-400" />
                </div>
              )}

              {/* Upload overlay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={cn(
                  "absolute inset-0 rounded-full bg-black/50 flex items-center justify-center",
                  "opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                )}
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : (
                  <Camera className="h-8 w-8 text-white" />
                )}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {form.avatar_url ? "Cambiar foto" : "Subir foto"}
              </Button>
              {form.avatar_url && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removeAvatar}
                  disabled={uploading}
                  className="text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  <X className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Información de Contacto</CardTitle>
                <p className="text-sm text-gray-500">Datos básicos para comunicación</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre(s)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="first_name"
                    value={form.first_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                    placeholder="Tu nombre"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellido(s)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="last_name"
                    value={form.last_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Tu apellido"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="tu@email.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+52 123 456 7890"
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
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

        {/* Submit button */}
        <Button type="submit" className="w-full btn-zuli-gradient" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar perfil
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
