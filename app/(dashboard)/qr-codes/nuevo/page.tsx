"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAppUser } from "@/hooks/use-app-user"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  QrCode,
  FileQuestion,
  Users,
  Calendar,
  Loader2,
  Check,
} from "lucide-react"

type CampaignType = "specialty_survey" | "quick_profile" | "appointment"

const campaignOptions: {
  type: CampaignType
  label: string
  description: string
  icon: typeof FileQuestion
  color: string
  bgColor: string
}[] = [
  {
    type: "specialty_survey",
    label: "Encuesta de Especialidad",
    description: "Recopila información sobre las necesidades de salud del paciente",
    icon: FileQuestion,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
  },
  {
    type: "quick_profile",
    label: "Perfil Rápido",
    description: "El paciente registra sus datos básicos y contacto",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  },
  {
    type: "appointment",
    label: "Agendar Cita",
    description: "Link directo para que el paciente agende una consulta",
    icon: Calendar,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  },
]

export default function NuevoQRPage() {
  const router = useRouter()
  const { doctorId, loading: userLoading } = useAppUser()

  const [selectedType, setSelectedType] = useState<CampaignType | null>(null)
  const [expiresInDays, setExpiresInDays] = useState<string>("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!selectedType) return

    setCreating(true)
    setError(null)

    try {
      const body: Record<string, unknown> = {
        campaign_type: selectedType,
      }

      if (expiresInDays && parseInt(expiresInDays) > 0) {
        body.expires_in_days = parseInt(expiresInDays)
      }

      const response = await fetch("/api/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al crear QR")
      }

      const qrLink = await response.json()
      router.push(`/qr-codes/${qrLink.id}`)
    } catch (err) {
      console.error("Error creating QR:", err)
      setError(err instanceof Error ? err.message : "Error al crear código QR")
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
            <div className="h-96 rounded animate-shimmer" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!doctorId) {
    return (
      <div className="text-center py-16 animate-fadeIn">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <QrCode className="h-8 w-8 text-gray-400" />
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
        <Link href="/qr-codes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Nuevo Código QR
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Crea un código QR para captar pacientes
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

      {/* Campaign Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-zuli-veronica" />
            Tipo de Campaña
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {campaignOptions.map((option) => {
              const Icon = option.icon
              const isSelected = selectedType === option.type

              return (
                <button
                  key={option.type}
                  onClick={() => setSelectedType(option.type)}
                  className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? `${option.bgColor} border-current ${option.color}`
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isSelected ? option.bgColor : "bg-gray-100 dark:bg-gray-800"}`}>
                    <Icon className={`h-5 w-5 ${isSelected ? option.color : "text-gray-500"}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-medium ${isSelected ? option.color : "text-gray-900 dark:text-white"}`}>
                        {option.label}
                      </h3>
                      {isSelected && <Check className={`h-4 w-4 ${option.color}`} />}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {option.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardHeader>
          <CardTitle>Opciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expires">Expiración (opcional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="expires"
                type="number"
                min="1"
                max="365"
                placeholder="30"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                className="w-24"
              />
              <span className="text-sm text-gray-500">días</span>
            </div>
            <p className="text-xs text-gray-500">
              Deja vacío para que el QR no expire
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href="/qr-codes">
          <Button variant="outline">Cancelar</Button>
        </Link>
        <Button
          onClick={handleCreate}
          disabled={!selectedType || creating}
          className="btn-zuli-gradient"
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creando...
            </>
          ) : (
            <>
              <QrCode className="h-4 w-4 mr-2" />
              Crear Código QR
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
