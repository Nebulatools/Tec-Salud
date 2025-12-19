"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check, Circle, Loader2, AlertCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export type AIProgressStep = {
  id: string
  label: string
  activeLabel?: string // Label to show when this step is in progress
}

export type AIProgressStatus = "idle" | "processing" | "complete" | "error"

interface AIProgressIndicatorProps {
  steps: AIProgressStep[]
  currentStep: number // 0-indexed, -1 means not started
  status: AIProgressStatus
  errorMessage?: string
  className?: string
  showElapsedTime?: boolean
  startTime?: Date
}

export function AIProgressIndicator({
  steps,
  currentStep,
  status,
  errorMessage,
  className,
  showElapsedTime = false,
  startTime,
}: AIProgressIndicatorProps) {
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0)

  // Track elapsed time
  React.useEffect(() => {
    if (!showElapsedTime || !startTime || status !== "processing") {
      return
    }

    const interval = setInterval(() => {
      const now = new Date()
      const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000)
      setElapsedSeconds(diff)
    }, 1000)

    return () => clearInterval(interval)
  }, [showElapsedTime, startTime, status])

  // Calculate progress percentage
  const progressPercentage = React.useMemo(() => {
    if (status === "complete") return 100
    if (status === "error") return ((currentStep) / steps.length) * 100
    if (currentStep < 0) return 0
    // Add partial progress within current step
    const baseProgress = (currentStep / steps.length) * 100
    const stepIncrement = (1 / steps.length) * 100
    // Animate within step (simulate progress)
    const withinStepProgress = status === "processing" ? stepIncrement * 0.5 : 0
    return Math.min(baseProgress + withinStepProgress, 99)
  }, [currentStep, steps.length, status])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className={cn("rounded-xl border bg-card p-6 shadow-sm", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {status === "processing" && (
            <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
          )}
          {status === "complete" && (
            <Check className="h-5 w-5 text-green-500" />
          )}
          {status === "error" && (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          <span className="font-semibold text-gray-900">
            {status === "processing" && "Procesando consulta..."}
            {status === "complete" && "Procesamiento completo"}
            {status === "error" && "Error en el procesamiento"}
            {status === "idle" && "Listo para procesar"}
          </span>
        </div>
        {showElapsedTime && status === "processing" && (
          <span className="text-sm text-gray-500 font-mono">
            {formatTime(elapsedSeconds)}
          </span>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-3 mb-4">
        {steps.map((step, index) => {
          const isComplete = index < currentStep || status === "complete"
          const isCurrent = index === currentStep && status === "processing"
          const isPending = index > currentStep && status !== "complete"
          const hasError = index === currentStep && status === "error"

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 text-sm transition-all duration-300",
                isComplete && "text-green-700",
                isCurrent && "text-orange-700 font-medium",
                isPending && "text-gray-400",
                hasError && "text-red-700"
              )}
            >
              {/* Step icon */}
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {isComplete && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
                {isCurrent && (
                  <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />
                )}
                {isPending && (
                  <Circle className="h-3 w-3 text-gray-300" />
                )}
                {hasError && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
              </div>

              {/* Step label */}
              <span>
                {isCurrent && step.activeLabel ? step.activeLabel : step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <Progress
        value={progressPercentage}
        className={cn(
          "h-2",
          status === "error" && "[&>div]:bg-red-500",
          status === "complete" && "[&>div]:bg-green-500",
          status === "processing" && "[&>div]:bg-orange-500"
        )}
      />

      {/* Percentage */}
      <div className="flex justify-end mt-2">
        <span className="text-xs text-gray-500">
          {Math.round(progressPercentage)}%
        </span>
      </div>

      {/* Error message */}
      {status === "error" && errorMessage && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}
    </div>
  )
}

// Preset configurations for common flows
export const TRANSCRIPTION_STEPS: AIProgressStep[] = [
  { id: "upload", label: "Grabación recibida", activeLabel: "Recibiendo grabación..." },
  { id: "convert", label: "Audio convertido", activeLabel: "Convirtiendo audio..." },
  { id: "transcribe", label: "Audio transcrito", activeLabel: "Transcribiendo con IA..." },
  { id: "extract", label: "Términos médicos extraídos", activeLabel: "Extrayendo términos médicos..." },
]

export const COMPLIANCE_STEPS: AIProgressStep[] = [
  { id: "analyze", label: "Transcripción analizada", activeLabel: "Analizando transcripción..." },
  { id: "generate", label: "Reporte generado", activeLabel: "Generando reporte médico..." },
  { id: "validate", label: "Cumplimiento verificado", activeLabel: "Verificando cumplimiento..." },
  { id: "suggest", label: "Sugerencias generadas", activeLabel: "Generando sugerencias clínicas..." },
]
