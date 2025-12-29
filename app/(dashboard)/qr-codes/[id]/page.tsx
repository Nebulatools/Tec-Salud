"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useAppUser } from "@/hooks/use-app-user"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  QrCode,
  Download,
  Copy,
  Check,
  Eye,
  Calendar,
  Clock,
  FileQuestion,
  Users,
  AlertCircle,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import QRCodeLib from "qrcode"

interface QRLinkDetail {
  id: string
  campaign_type: "specialty_survey" | "quick_profile" | "appointment"
  scans_count: number
  expires_at: string | null
  created_at: string
  qr_url: string
  redirect_url: string
  metadata: Record<string, unknown>
  short_code: string | null
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

export default function QRDetailPage() {
  const params = useParams()
  const qrId = params.id as string
  const { doctorId, loading: userLoading } = useAppUser()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [qrLink, setQrLink] = useState<QRLinkDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function fetchQRLink() {
      if (!doctorId || !qrId) return

      try {
        const response = await fetch("/api/qr?include_expired=true")
        if (!response.ok) throw new Error("Error al cargar")

        const links = await response.json()
        const found = links.find((l: QRLinkDetail) => l.id === qrId)

        if (!found) {
          setError("Código QR no encontrado")
        } else {
          setQrLink(found)
        }
      } catch (err) {
        console.error("Error:", err)
        setError("No se pudo cargar el código QR")
      } finally {
        setLoading(false)
      }
    }

    if (doctorId) {
      fetchQRLink()
    } else if (!userLoading) {
      setLoading(false)
    }
  }, [doctorId, qrId, userLoading])

  // Generate QR code on canvas
  useEffect(() => {
    if (qrLink && canvasRef.current) {
      QRCodeLib.toCanvas(canvasRef.current, qrLink.qr_url, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })
    }
  }, [qrLink])

  const copyToClipboard = async () => {
    if (!qrLink) return
    try {
      await navigator.clipboard.writeText(qrLink.qr_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Error copying:", err)
    }
  }

  const downloadQR = () => {
    if (!canvasRef.current || !qrLink) return

    const link = document.createElement("a")
    link.download = `qr-${qrLink.campaign_type}-${qrLink.id.slice(0, 8)}.png`
    link.href = canvasRef.current.toDataURL("image/png")
    link.click()
  }

  const isExpired = qrLink?.expires_at && new Date(qrLink.expires_at) < new Date()

  if (userLoading || loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded animate-shimmer" />
          <div className="h-8 w-48 rounded animate-shimmer" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="h-80 rounded animate-shimmer" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="h-48 rounded animate-shimmer" />
            </CardContent>
          </Card>
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

  if (error) {
    return (
      <div className="text-center py-16 animate-fadeIn">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Error
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
          {error}
        </p>
        <Link href="/qr-codes">
          <Button variant="outline">Volver a QR Codes</Button>
        </Link>
      </div>
    )
  }

  if (!qrLink) return null

  const config = campaignConfig[qrLink.campaign_type]
  const CampaignIcon = config.icon

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/qr-codes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {config.label}
              </h1>
              {isExpired && (
                <Badge variant="secondary">Expirado</Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Creado {formatDistanceToNow(new Date(qrLink.created_at), {
                addSuffix: true,
                locale: es,
              })}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={copyToClipboard}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copiar Link
              </>
            )}
          </Button>
          <Button onClick={downloadQR} className="btn-zuli-gradient">
            <Download className="h-4 w-4 mr-2" />
            Descargar QR
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-zuli-veronica" />
              Código QR
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="p-4 bg-white rounded-xl shadow-sm border">
              <canvas ref={canvasRef} />
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center max-w-xs">
              Escanea este código o comparte el link para captar nuevos pacientes
            </p>
          </CardContent>
        </Card>

        {/* Details */}
        <div className="space-y-4">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estadísticas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm">Escaneos</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {qrLink.scans_count}
                  </p>
                </div>
                <div className={`p-4 rounded-xl ${config.bgColor}`}>
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <CampaignIcon className="h-4 w-4" />
                    <span className="text-sm">Tipo</span>
                  </div>
                  <p className={`text-lg font-semibold ${config.color}`}>
                    {config.label}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Creado</span>
                <span>{format(new Date(qrLink.created_at), "dd/MM/yyyy HH:mm")}</span>
              </div>
              {qrLink.expires_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {isExpired ? "Expiró" : "Expira"}
                  </span>
                  <span>{format(new Date(qrLink.expires_at), "dd/MM/yyyy")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Redirección</span>
                <span className="text-right truncate max-w-[180px]">
                  {qrLink.redirect_url}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Short Code for manual linking */}
          {qrLink.short_code && (
            <Card className="border-2 border-dashed border-zuli-indigo/30 bg-gradient-to-r from-zuli-indigo/5 to-zuli-veronica/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-lg">🔗</span>
                  Código de Vinculación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-3">
                  Los pacientes pueden vincularse contigo ingresando este código en su app:
                </p>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <code className="text-3xl font-mono font-bold tracking-[0.3em] px-6 py-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-gray-200 dark:border-gray-700">
                    {qrLink.short_code}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      await navigator.clipboard.writeText(qrLink.short_code!)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    className="h-12 w-12"
                  >
                    {copied ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-center text-gray-400">
                  Alternativa al escaneo de QR para pacientes sin cámara
                </p>
              </CardContent>
            </Card>
          )}

          {/* URL */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Link</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded overflow-x-auto">
                  {qrLink.qr_url}
                </code>
                <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
