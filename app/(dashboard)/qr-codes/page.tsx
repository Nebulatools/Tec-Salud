"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAppUser } from "@/hooks/use-app-user"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  QrCode,
  Plus,
  Eye,
  Calendar,
  Users,
  FileQuestion,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { es } from "date-fns/locale"

interface QRLink {
  id: string
  campaign_type: "specialty_survey" | "quick_profile" | "appointment"
  scans_count: number
  expires_at: string | null
  created_at: string
  qr_url: string
  metadata: Record<string, unknown>
}

const campaignConfig = {
  specialty_survey: {
    label: "Encuesta Especialidad",
    icon: FileQuestion,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
  },
  quick_profile: {
    label: "Perfil Rápido",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
  appointment: {
    label: "Agendar Cita",
    icon: Calendar,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
  },
}

export default function QRCodesPage() {
  const { doctorId, loading: userLoading } = useAppUser()
  const [qrLinks, setQrLinks] = useState<QRLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchQRLinks() {
      if (!doctorId) return

      try {
        const response = await fetch("/api/qr?include_expired=true")
        if (!response.ok) {
          throw new Error("Error al cargar QR codes")
        }
        const data = await response.json()
        setQrLinks(data)
      } catch (err) {
        console.error("Error fetching QR links:", err)
        setError("No se pudieron cargar los códigos QR")
      } finally {
        setLoading(false)
      }
    }

    if (doctorId) {
      fetchQRLinks()
    } else if (!userLoading) {
      setLoading(false)
    }
  }, [doctorId, userLoading])

  const copyToClipboard = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error("Error copying:", err)
    }
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  if (userLoading || loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-40 rounded animate-shimmer" />
            <div className="h-4 w-64 rounded animate-shimmer" style={{ animationDelay: "0.1s" }} />
          </div>
          <div className="h-10 w-40 rounded animate-shimmer" style={{ animationDelay: "0.15s" }} />
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-24 rounded animate-shimmer" style={{ animationDelay: `${i * 0.05}s` }} />
              </CardContent>
            </Card>
          ))}
        </div>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Códigos QR</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Genera códigos QR para captar pacientes
          </p>
        </div>
        <Link href="/qr-codes/nuevo">
          <Button className="btn-zuli-gradient group">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo QR
          </Button>
        </Link>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!error && qrLinks.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-zuli-veronica/10 to-zuli-indigo/10 flex items-center justify-center">
              <QrCode className="h-8 w-8 text-zuli-veronica" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No hay códigos QR
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
              Crea tu primer código QR para captar nuevos pacientes.
            </p>
            <Link href="/qr-codes/nuevo">
              <Button className="btn-zuli-gradient">
                <Plus className="h-4 w-4 mr-2" />
                Crear primer QR
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* QR Links List */}
      {qrLinks.length > 0 && (
        <div className="grid gap-4">
          {qrLinks.map((qr) => {
            const config = campaignConfig[qr.campaign_type]
            const CampaignIcon = config.icon
            const expired = isExpired(qr.expires_at)

            return (
              <Card
                key={qr.id}
                className={`transition-shadow ${expired ? "opacity-60" : "hover:shadow-md"}`}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Icon */}
                      <div className={`p-3 rounded-xl ${config.bgColor} shrink-0`}>
                        <CampaignIcon className={`h-6 w-6 ${config.color}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Campaign Type */}
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {config.label}
                          </h3>
                          {expired && (
                            <Badge variant="secondary" className="text-xs">
                              Expirado
                            </Badge>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mb-3">
                          <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            {qr.scans_count} escaneos
                          </span>
                          <span>
                            Creado {formatDistanceToNow(new Date(qr.created_at), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </span>
                          {qr.expires_at && (
                            <span>
                              {expired ? "Expiró" : "Expira"}{" "}
                              {format(new Date(qr.expires_at), "dd/MM/yyyy")}
                            </span>
                          )}
                        </div>

                        {/* URL & Copy */}
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded truncate max-w-xs">
                            {qr.qr_url}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(qr.qr_url, qr.id)}
                            className="shrink-0"
                          >
                            {copiedId === qr.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Link href={`/qr-codes/${qr.id}`}>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="h-5 w-5 text-gray-400 hover:text-zuli-veronica transition-colors" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
