// Perfil del especialista (admin)
"use client"

import { useEffect, useState, useRef } from "react"
import { useAppUser } from "@/hooks/use-app-user"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DoctorSpecialtySetup } from "@/components/doctor/doctor-specialty-setup"
import { Loader2, Upload, User, GraduationCap, Link2, FileText, CheckCircle2, Camera, X } from "lucide-react"

type ProfileFormState = {
  full_name: string
  avatar_url: string
  headline: string
  degrees: string
  papers: string
  links: string
  bio: string
}

export default function PerfilAdminPage() {
  const { appUser, doctorId, loading } = useAppUser()
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<ProfileFormState>({
    full_name: "",
    avatar_url: "",
    headline: "",
    degrees: "",
    papers: "",
    links: "",
    bio: "",
  })

  useEffect(() => {
    if (!appUser) return
    const metadata = appUser.metadata || {}
    setForm((prev) => ({
      ...prev,
      full_name: appUser.full_name ?? "",
      avatar_url: (metadata.avatar_url as string) || "",
      headline: (metadata.headline as string) || "",
      degrees: Array.isArray(metadata.degrees) ? (metadata.degrees as string[]).join("\n") : (metadata.degrees as string) || "",
      papers: Array.isArray(metadata.papers) ? (metadata.papers as string[]).join("\n") : (metadata.papers as string) || "",
      links: Array.isArray(metadata.links) ? (metadata.links as string[]).join("\n") : (metadata.links as string) || "",
      bio: (metadata.bio as string) || "",
    }))
  }, [appUser])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!appUser) return
    setSaving(true)
    setError(null)
    setStatus(null)

    const degreesArr = form.degrees
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
    const papersArr = form.papers
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
    const linksArr = form.links
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)

    const metadata = {
      ...(appUser.metadata || {}),
      avatar_url: form.avatar_url,
      headline: form.headline,
      degrees: degreesArr,
      papers: papersArr,
      links: linksArr,
      bio: form.bio,
      updated_at: new Date().toISOString(),
    }

    const { error: userError } = await supabase
      .from("app_users")
      .update({ full_name: form.full_name, metadata })
      .eq("id", appUser.id)

    if (userError) {
      setError(userError.message)
      setSaving(false)
      return
    }

    if (doctorId) {
      const [first = "", ...rest] = form.full_name.trim().split(" ")
      const last = rest.join(" ").trim()
      await supabase
        .from("doctors")
        .update({ first_name: first || "Doctor", last_name: last })
        .eq("id", doctorId)
    }

    setStatus("Perfil actualizado. Se mostrará en las tarjetas de especialistas.")
    setSaving(false)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !appUser) return

    // Validate file
    if (!file.type.startsWith("image/")) {
      setError("Por favor selecciona una imagen válida")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("La imagen debe ser menor a 2MB")
      return
    }

    setUploadingPhoto(true)
    setError(null)

    try {
      // Upload to Supabase Storage (unified avatars bucket)
      const fileExt = file.name.split(".").pop()
      const fileName = `doctors/${appUser.id}/avatar-${Date.now()}.${fileExt}`

      // Delete old avatar if exists in new bucket
      if (form.avatar_url?.includes("/avatars/")) {
        const oldPath = form.avatar_url.split("/avatars/")[1]
        if (oldPath) {
          await supabase.storage.from("avatars").remove([oldPath])
        }
      }

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName)

      // Update form state
      setForm((prev) => ({ ...prev, avatar_url: publicUrl }))
      setStatus("Foto subida. No olvides guardar el perfil.")
    } catch (err: unknown) {
      const error = err as { message?: string }
      console.error("Error uploading photo:", error.message || err)
      setError("Error al subir la foto")
    } finally {
      setUploadingPhoto(false)
    }
  }

  const removePhoto = () => {
    setForm((prev) => ({ ...prev, avatar_url: "" }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded animate-shimmer" />
          <div className="h-4 w-96 rounded animate-shimmer" style={{ animationDelay: '0.1s' }} />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="h-20 rounded animate-shimmer" />
                <div className="h-20 rounded animate-shimmer" style={{ animationDelay: '0.1s' }} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="h-32 rounded animate-shimmer" style={{ animationDelay: '0.15s' }} />
                <div className="h-32 rounded animate-shimmer" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!doctorId) {
    return (
      <div className="text-center py-16 animate-fadeIn">
        <div className="empty-state-icon">
          <User className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Acceso restringido
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          Solo los administradores y doctores pueden editar este perfil.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tu perfil de especialista</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Esta información se usará en las tarjetas que ven los pacientes y en tus expedientes.
        </p>
      </div>

      {/* Basic Info Section */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-zuli-veronica to-zuli-indigo" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-zuli-veronica" />
            Información básica
          </CardTitle>
          <CardDescription>Tu nombre, foto y encabezado profesional.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Avatar preview and name */}
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Avatar preview with upload */}
              <div className="relative group shrink-0">
                {form.avatar_url ? (
                  <div className="relative">
                    <img
                      src={form.avatar_url}
                      alt="Avatar"
                      className="w-24 h-24 rounded-full object-cover ring-4 ring-zuli-veronica/20 group-hover:ring-zuli-veronica/40 transition-all"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-zuli-veronica to-zuli-indigo flex items-center justify-center text-white text-3xl font-bold ring-4 ring-zuli-veronica/20">
                    {form.full_name?.[0] || "D"}
                  </div>
                )}
                {/* Upload button overlay */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="avatar-upload"
                />
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-2 bg-zuli-veronica text-white rounded-full cursor-pointer hover:bg-zuli-indigo transition-colors shadow-lg"
                >
                  {uploadingPhoto ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </label>
              </div>

              <div className="flex-1 space-y-4 w-full">
                <div className="space-y-2">
                  <Label>Nombre completo</Label>
                  <Input
                    value={form.full_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Dra. Ana López"
                    required
                    className="focus:ring-2 focus:ring-zuli-veronica/30 focus:border-zuli-veronica transition-all"
                  />
                  <p className="text-xs text-gray-500">Haz clic en el ícono de cámara para subir tu foto</p>
                </div>

                <div className="space-y-2">
                  <Label>Encabezado corto</Label>
                  <Input
                    value={form.headline}
                    onChange={(e) => setForm((prev) => ({ ...prev, headline: e.target.value }))}
                    placeholder="Cardióloga · 10 años de experiencia"
                    className="focus:ring-2 focus:ring-zuli-veronica/30 focus:border-zuli-veronica transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Credentials Section */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="h-5 w-5 text-zuli-indigo" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Formación y credenciales</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grados de estudio (uno por línea)</Label>
                  <Textarea
                    value={form.degrees}
                    onChange={(e) => setForm((prev) => ({ ...prev, degrees: e.target.value }))}
                    placeholder="Cardióloga, UNAM&#10;Residencia en Hospital ABC..."
                    rows={4}
                    className="focus:ring-2 focus:ring-zuli-veronica/30 focus:border-zuli-veronica transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Papers / publicaciones (uno por línea)
                  </Label>
                  <Textarea
                    value={form.papers}
                    onChange={(e) => setForm((prev) => ({ ...prev, papers: e.target.value }))}
                    placeholder="Título y link"
                    rows={4}
                    className="focus:ring-2 focus:ring-zuli-veronica/30 focus:border-zuli-veronica transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Links and Bio Section */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <Link2 className="h-5 w-5 text-zuli-cyan-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Links y biografía</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Links (LinkedIn, web, ORCID)</Label>
                  <Textarea
                    value={form.links}
                    onChange={(e) => setForm((prev) => ({ ...prev, links: e.target.value }))}
                    placeholder="https://linkedin.com/in/..."
                    rows={3}
                    className="focus:ring-2 focus:ring-zuli-veronica/30 focus:border-zuli-veronica transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Resumen / bio</Label>
                  <Textarea
                    value={form.bio}
                    onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                    placeholder="Cuéntale al paciente sobre tu experiencia."
                    rows={3}
                    className="focus:ring-2 focus:ring-zuli-veronica/30 focus:border-zuli-veronica transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Feedback messages */}
            {status && (
              <Alert className="bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 animate-fadeInUp">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{status}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive" className="animate-fadeInUp">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit button */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="submit" disabled={saving} className="btn-zuli-gradient">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Guardar perfil
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Specialty Section */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-zuli-cyan to-zuli-indigo" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-zuli-cyan-600" />
            Especialidad principal
          </CardTitle>
          <CardDescription>Configura la especialidad visible para los pacientes.</CardDescription>
        </CardHeader>
        <CardContent>
          <DoctorSpecialtySetup doctorId={doctorId} />
        </CardContent>
      </Card>
    </div>
  )
}
