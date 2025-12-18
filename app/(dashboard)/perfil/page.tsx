// Perfil del especialista (admin)
"use client"

import { useEffect, useState } from "react"
import { useAppUser } from "@/hooks/use-app-user"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DoctorSpecialtySetup } from "@/components/doctor/doctor-specialty-setup"
import { Loader2, Upload } from "lucide-react"

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
      const [first = "", ...rest] = form.full_name.split(" ")
      const last = rest.join(" ").trim() || " "
      await supabase
        .from("doctors")
        .update({ first_name: first || "Doctor", last_name: last || "Admin" })
        .eq("id", doctorId)
    }

    setStatus("Perfil actualizado. Se mostrará en las tarjetas de especialistas.")
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!doctorId) {
    return <p className="text-sm text-gray-600">Solo los administradores/doctores pueden editar este perfil.</p>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tu perfil de especialista</h1>
      <p className="text-sm text-gray-500">
        Esta información se usará en las tarjetas que ven los pacientes y en tus expedientes.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Perfil visible al paciente</CardTitle>
          <CardDescription>Foto, grados, papers, links y breve resumen.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre completo</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Dra. Ana López"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>URL de foto</Label>
                <Input
                  value={form.avatar_url}
                  onChange={(e) => setForm((prev) => ({ ...prev, avatar_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grados de estudio (uno por línea)</Label>
                <Textarea
                  value={form.degrees}
                  onChange={(e) => setForm((prev) => ({ ...prev, degrees: e.target.value }))}
                  placeholder="Cardióloga, UNAM\nResidencia..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Papers / publicaciones (uno por línea)</Label>
                <Textarea
                  value={form.papers}
                  onChange={(e) => setForm((prev) => ({ ...prev, papers: e.target.value }))}
                  placeholder="Título y link"
                  rows={4}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Links (LinkedIn, web, ORCID)</Label>
                <Textarea
                  value={form.links}
                  onChange={(e) => setForm((prev) => ({ ...prev, links: e.target.value }))}
                  placeholder="https://linkedin.com/in/..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Resumen / bio</Label>
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="Cuéntale al paciente sobre tu experiencia."
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Encabezado corto</Label>
              <Input
                value={form.headline}
                onChange={(e) => setForm((prev) => ({ ...prev, headline: e.target.value }))}
                placeholder="Cardióloga · 10 años de experiencia"
              />
            </div>

            {status && (
              <Alert className="bg-green-50 border-green-200 text-green-700">
                <AlertDescription>{status}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-3">
              <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600">
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

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Especialidad principal</h2>
        <p className="text-sm text-gray-500">Configura la especialidad visible para los pacientes.</p>
        <DoctorSpecialtySetup doctorId={doctorId} />
      </div>
    </div>
  )
}
