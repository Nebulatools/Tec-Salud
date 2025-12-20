"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Check, AlertCircle, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StructuredDiagnosis } from "@/types/icd"

interface DiagnosisBadgeProps {
  diagnosis: StructuredDiagnosis | string
  showConfidence?: boolean
  showVerified?: boolean
  onEdit?: () => void
  className?: string
}

/**
 * DiagnosisBadge - Displays a diagnosis with optional ICD code
 * Handles both structured diagnoses (with ICD codes) and legacy string diagnoses
 */
export function DiagnosisBadge({
  diagnosis,
  showConfidence = true,
  showVerified = true,
  onEdit,
  className,
}: DiagnosisBadgeProps) {
  // Handle legacy string diagnosis
  if (typeof diagnosis === "string") {
    return (
      <Badge variant="secondary" className={cn("gap-1", className)}>
        <span>{diagnosis}</span>
        {onEdit && (
          <button
            onClick={onEdit}
            className="ml-1 hover:text-primary"
            aria-label="Editar diagnóstico"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </Badge>
    )
  }

  // Structured diagnosis
  const {
    original_text,
    icd11_code,
    icd11_title,
    confidence,
    verified_by_doctor,
  } = diagnosis

  const hasCode = Boolean(icd11_code)
  const confidencePercent = Math.round(confidence * 100)

  // Determine badge variant based on state
  const getVariant = () => {
    if (verified_by_doctor) return "success"
    if (hasCode && confidence >= 0.8) return "zuliSecondary"
    if (hasCode && confidence >= 0.5) return "zuliAccent"
    if (hasCode) return "outline"
    return "secondary"
  }

  // Determine confidence color
  const getConfidenceColor = () => {
    if (confidence >= 0.9) return "text-green-600"
    if (confidence >= 0.7) return "text-yellow-600"
    if (confidence >= 0.5) return "text-orange-500"
    return "text-red-500"
  }

  const tooltipContent = (
    <div className="space-y-1 text-sm">
      <p>
        <strong>Diagnóstico:</strong> {original_text}
      </p>
      {hasCode && (
        <>
          <p>
            <strong>Código CIE-11:</strong> {icd11_code}
          </p>
          <p>
            <strong>Título:</strong> {icd11_title}
          </p>
          <p>
            <strong>Confianza:</strong>{" "}
            <span className={getConfidenceColor()}>{confidencePercent}%</span>
          </p>
        </>
      )}
      {!hasCode && (
        <p className="text-amber-600">Sin código ICD asignado</p>
      )}
      <p>
        <strong>Estado:</strong>{" "}
        {verified_by_doctor ? (
          <span className="text-green-600">Verificado por doctor</span>
        ) : (
          <span className="text-amber-600">Pendiente de verificación</span>
        )}
      </p>
    </div>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={getVariant()}
            className={cn(
              "gap-1 cursor-default",
              !hasCode && "border-dashed",
              className
            )}
          >
            {/* ICD Code */}
            {hasCode && (
              <span className="font-mono text-[10px] bg-white/20 px-1 rounded">
                {icd11_code}
              </span>
            )}

            {/* Diagnosis text (truncated) */}
            <span className="max-w-[150px] truncate">
              {icd11_title || original_text}
            </span>

            {/* Confidence indicator */}
            {showConfidence && hasCode && !verified_by_doctor && (
              <span className={cn("text-[10px] font-medium", getConfidenceColor())}>
                {confidencePercent}%
              </span>
            )}

            {/* Verified check */}
            {showVerified && verified_by_doctor && (
              <Check className="h-3 w-3 text-white" />
            )}

            {/* No code warning */}
            {!hasCode && (
              <AlertCircle className="h-3 w-3 text-amber-500" />
            )}

            {/* Edit button */}
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
                className="ml-1 hover:text-primary"
                aria-label="Editar diagnóstico"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * DiagnosisBadgeList - Renders a list of diagnosis badges
 */
interface DiagnosisBadgeListProps {
  diagnoses: (StructuredDiagnosis | string)[]
  onEditDiagnosis?: (index: number) => void
  className?: string
}

export function DiagnosisBadgeList({
  diagnoses,
  onEditDiagnosis,
  className,
}: DiagnosisBadgeListProps) {
  if (!diagnoses || diagnoses.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">
        Sin diagnósticos registrados
      </span>
    )
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {diagnoses.map((diagnosis, index) => (
        <DiagnosisBadge
          key={index}
          diagnosis={diagnosis}
          onEdit={onEditDiagnosis ? () => onEditDiagnosis(index) : undefined}
        />
      ))}
    </div>
  )
}
