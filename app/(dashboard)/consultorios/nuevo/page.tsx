"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAppUser } from "@/hooks/use-app-user"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Building2, Loader2 } from "lucide-react"

export default function NuevoConsultorioPage() {
  const router = useRouter()
  const { doctorId, loading: userLoading } = useAppUser()

  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!doctorId || !name.trim()) return

    setCreating(true)
    setError(null)

    try {
      // Create medical unit
      const { data: unit, error: unitError } = await supabase
        .from("medical_units")
        .insert({
          name: name.trim(),
          address_line: address.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
        })
        .select()
        .single()

      if (unitError) throw unitError

      // Link doctor as owner
      const { error: linkError } = await supabase
        .from("doctor_units")
        .insert({
          doctor_id: doctorId,
          unit_id: unit.id,
          role: "owner",
          is_primary: true,
        })

      if (linkError) throw linkError

      router.push("/consultorios")
    } catch (err) {
      console.error("Error creating unit:", err)
      setError("Error al crear el consultorio")
    } finally {
      setCreating(false)
    }
  }

  if (userLoading) {
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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/consultorios">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Nuevo Consultorio
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Registra un nuevo consultorio o clínica
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <form onSubmit={handleCreate}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-zuli-veronica" />
              Información del Consultorio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Consultorio Centro Médico"
                required
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
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Link href="/consultorios">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={!name.trim() || creating}
            className="btn-zuli-gradient"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4 mr-2" />
                Crear Consultorio
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
