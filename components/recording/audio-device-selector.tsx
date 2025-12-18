"use client"

import { Mic, AlertCircle, RefreshCw } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { useRecording } from "@/hooks/use-recording"

interface AudioDeviceSelectorProps {
  className?: string
  disabled?: boolean
  showLabel?: boolean
  compact?: boolean
}

export function AudioDeviceSelector({
  className,
  disabled = false,
  showLabel = true,
  compact = false,
}: AudioDeviceSelectorProps) {
  const {
    audioDevices,
    deviceActions,
    isRecordingActive,
  } = useRecording()

  const {
    devices,
    selectedDeviceId,
    permissionStatus,
    isEnumerating,
    error,
  } = audioDevices

  const {
    selectDevice,
    requestPermission,
    enumerateDevices,
    clearDeviceError,
  } = deviceActions

  // Don't allow changes while recording
  const isDisabled = disabled || isRecordingActive || isEnumerating

  // Permission denied state
  if (permissionStatus === 'denied') {
    return (
      <Alert variant="destructive" className={cn("py-3", className)}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Permiso de micrófono denegado. Habilítalo en la configuración del navegador.
        </AlertDescription>
      </Alert>
    )
  }

  // Need permission - show request button
  if (permissionStatus === 'prompt' || permissionStatus === 'unknown') {
    return (
      <div className={cn("space-y-2", className)}>
        {showLabel && (
          <p className="text-sm font-medium text-gray-700">Micrófono</p>
        )}
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          onClick={requestPermission}
          disabled={isDisabled}
          className="w-full justify-start gap-2"
        >
          <Mic className="h-4 w-4" />
          Permitir acceso al micrófono
        </Button>
        <p className="text-xs text-gray-500">
          Necesitamos acceso para mostrar los dispositivos disponibles
        </p>
      </div>
    )
  }

  // No devices found
  if (devices.length === 0 && !isEnumerating) {
    return (
      <div className={cn("space-y-2", className)}>
        {showLabel && (
          <p className="text-sm font-medium text-gray-700">Micrófono</p>
        )}
        <Alert className="py-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm flex items-center justify-between">
            <span>No se encontraron micrófonos</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={enumerateDevices}
              className="h-6 px-2"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Main selector UI
  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">Micrófono</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={enumerateDevices}
            disabled={isEnumerating}
            className="h-6 px-2 text-gray-500 hover:text-gray-700"
            title="Actualizar lista de dispositivos"
          >
            <RefreshCw className={cn("h-3 w-3", isEnumerating && "animate-spin")} />
          </Button>
        </div>
      )}

      <Select
        value={selectedDeviceId || undefined}
        onValueChange={selectDevice}
        disabled={isDisabled}
      >
        <SelectTrigger className={cn(compact && "h-8 text-sm")}>
          <div className="flex items-center gap-2 truncate">
            <Mic className="h-4 w-4 shrink-0 text-gray-500" />
            <SelectValue placeholder="Seleccionar micrófono" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {devices.map((device) => (
            <SelectItem key={device.deviceId} value={device.deviceId}>
              {device.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm flex items-center justify-between gap-2">
            <span className="flex-1">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearDeviceError}
              className="h-6 px-2 shrink-0"
            >
              Cerrar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isRecordingActive && (
        <p className="text-xs text-amber-600">
          No puedes cambiar el micrófono mientras grabas
        </p>
      )}
    </div>
  )
}
