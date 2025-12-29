"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Camera,
  CameraOff,
  Loader2,
  AlertCircle,
  QrCode,
  Link as LinkIcon,
  X,
} from "lucide-react"

// Type for Html5Qrcode class
interface Html5QrcodeScanner {
  start: (
    cameraId: { facingMode: string },
    config: { fps: number; qrbox: { width: number; height: number } },
    onSuccess: (decodedText: string) => void,
    onFailure: () => void
  ) => Promise<void>
  stop: () => Promise<void>
}

interface Html5QrcodeClass {
  new (elementId: string): Html5QrcodeScanner
}

interface QrScannerProps {
  onScan?: (url: string) => void
  onClose?: () => void
}

export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const router = useRouter()
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrcodeClassRef = useRef<Html5QrcodeClass | null>(null)
  const scannerInstanceRef = useRef<Html5QrcodeScanner | null>(null)

  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualUrl, setManualUrl] = useState("")
  const [showManualInput, setShowManualInput] = useState(false)
  const [libraryLoaded, setLibraryLoaded] = useState(false)

  // Load the html5-qrcode library dynamically
  useEffect(() => {
    const loadLibrary = async () => {
      try {
        // Dynamic import of html5-qrcode
        const module = await import("html5-qrcode")
        html5QrcodeClassRef.current = module.Html5Qrcode as unknown as Html5QrcodeClass
        setLibraryLoaded(true)
      } catch (err) {
        console.error("Error loading QR scanner library:", err)
        setError("No se pudo cargar el escáner. Usa la opción manual.")
        setShowManualInput(true)
      }
    }

    loadLibrary()

    return () => {
      // Cleanup on unmount
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.stop().catch(() => {})
      }
    }
  }, [])

  const stopScanner = useCallback(async () => {
    if (scannerInstanceRef.current && isScanning) {
      try {
        await scannerInstanceRef.current.stop()
      } catch (err) {
        console.error("Error stopping scanner:", err)
      }
    }
    setIsScanning(false)
  }, [isScanning])

  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      // Validate URL
      try {
        const url = new URL(decodedText)

        // Check if it's our domain
        const allowedHosts = [
          window.location.host,
          "localhost",
          "zuli.health",
          "app.zuli.health",
        ]

        if (!allowedHosts.some((host) => url.host.includes(host))) {
          setError("Este código QR no es válido para esta aplicación.")
          return
        }

        // Stop scanner
        stopScanner()

        // Navigate or callback
        if (onScan) {
          onScan(decodedText)
        } else {
          // Extract path and navigate
          router.push(url.pathname + url.search)
        }
      } catch {
        setError("Código QR inválido. No contiene una URL válida.")
      }
    },
    [onScan, router, stopScanner]
  )

  const startScanner = useCallback(async () => {
    if (!libraryLoaded || !scannerRef.current || !html5QrcodeClassRef.current) {
      setError("El escáner no está listo. Espera un momento...")
      return
    }

    setError(null)
    setIsScanning(true)

    try {
      const Html5QrcodeClass = html5QrcodeClassRef.current
      const scanner = new Html5QrcodeClass("qr-scanner-region")
      scannerInstanceRef.current = scanner

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        handleScanSuccess,
        () => {
          // Ignore scan failures (no QR in frame)
        }
      )
    } catch (err) {
      console.error("Error starting scanner:", err)
      setError(
        "No se pudo acceder a la cámara. Verifica los permisos o usa la opción manual."
      )
      setIsScanning(false)
      setShowManualInput(true)
    }
  }, [libraryLoaded, handleScanSuccess])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualUrl.trim()) return

    try {
      const url = new URL(manualUrl.trim())
      handleScanSuccess(url.toString())
    } catch {
      setError("Por favor ingresa una URL válida.")
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-zuli-indigo" />
            <h3 className="font-semibold">Escanear Código QR</h3>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Scanner Area */}
        <div className="relative aspect-square max-h-80 bg-black">
          {/* Scanner viewport */}
          <div
            id="qr-scanner-region"
            ref={scannerRef}
            className="w-full h-full"
          />

          {/* Overlay when not scanning */}
          {!isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-white">
              {libraryLoaded ? (
                <>
                  <Camera className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm text-center px-6 mb-4">
                    Presiona el botón para iniciar la cámara y escanear un
                    código QR
                  </p>
                  <Button onClick={startScanner} className="btn-zuli-gradient">
                    <Camera className="h-4 w-4 mr-2" />
                    Iniciar Cámara
                  </Button>
                </>
              ) : (
                <>
                  <Loader2 className="h-8 w-8 animate-spin mb-4" />
                  <p className="text-sm">Cargando escáner...</p>
                </>
              )}
            </div>
          )}

          {/* Scanning indicator */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-white/50 rounded-lg">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-zuli-cyan rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-zuli-cyan rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-zuli-cyan rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-zuli-cyan rounded-br-lg" />
              </div>
              {/* Scanning line animation */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60">
                <div className="h-0.5 bg-zuli-cyan animate-pulse" />
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="p-4 space-y-3">
          {isScanning && (
            <Button
              variant="outline"
              onClick={stopScanner}
              className="w-full"
            >
              <CameraOff className="h-4 w-4 mr-2" />
              Detener Cámara
            </Button>
          )}

          {/* Manual URL Input Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowManualInput(!showManualInput)}
            className="w-full text-gray-500"
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            {showManualInput ? "Ocultar" : "Ingresar enlace manualmente"}
          </Button>

          {/* Manual URL Input */}
          {showManualInput && (
            <form onSubmit={handleManualSubmit} className="space-y-2">
              <Input
                type="url"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://app.zuli.health/link/qr/..."
                className="text-sm"
              />
              <Button
                type="submit"
                disabled={!manualUrl.trim()}
                className="w-full btn-zuli-gradient"
              >
                Ir al enlace
              </Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
