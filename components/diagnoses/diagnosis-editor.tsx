"use client"

import * as React from "react"
import { Plus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DiagnosisBadge } from "./diagnosis-badge"
import { DiagnosisSelector, InlineDiagnosisSelector } from "./diagnosis-selector"
import { cn } from "@/lib/utils"
import type { StructuredDiagnosis } from "@/types/icd"

interface DiagnosisEditorProps {
  /** Structured diagnoses with ICD codes */
  diagnoses: StructuredDiagnosis[]
  /** Legacy string diagnoses (for backward compatibility) */
  legacyDiagnoses?: string[]
  /** Callback when diagnoses are updated */
  onUpdate: (diagnoses: StructuredDiagnosis[]) => void
  /** Whether editing is allowed */
  editable?: boolean
  /** Show the "verify all" button */
  showVerifyAll?: boolean
  /** Custom class name */
  className?: string
}

/**
 * DiagnosisEditor - Inline editor for diagnoses with ICD codes
 * Displays diagnoses as badges with edit/add/remove functionality
 */
export function DiagnosisEditor({
  diagnoses,
  legacyDiagnoses,
  onUpdate,
  editable = true,
  showVerifyAll = true,
  className,
}: DiagnosisEditorProps) {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null)
  const [isAdding, setIsAdding] = React.useState(false)

  // Merge legacy diagnoses if no structured diagnoses exist
  const effectiveDiagnoses = React.useMemo(() => {
    if (diagnoses && diagnoses.length > 0) {
      return diagnoses
    }

    // Convert legacy to structured (without codes)
    if (legacyDiagnoses && legacyDiagnoses.length > 0) {
      return legacyDiagnoses.map((text): StructuredDiagnosis => ({
        original_text: text,
        icd11_code: null,
        icd11_title: null,
        icd11_uri: null,
        confidence: 0,
        verified_by_doctor: false,
        coded_at: null,
      }))
    }

    return []
  }, [diagnoses, legacyDiagnoses])

  const hasUnverifiedDiagnoses = effectiveDiagnoses.some(
    (d) => !d.verified_by_doctor
  )

  const handleUpdateDiagnosis = (
    index: number,
    updated: StructuredDiagnosis
  ) => {
    const newDiagnoses = [...effectiveDiagnoses]
    newDiagnoses[index] = updated
    onUpdate(newDiagnoses)
    setEditingIndex(null)
  }

  const handleRemoveDiagnosis = (index: number) => {
    const newDiagnoses = effectiveDiagnoses.filter((_, i) => i !== index)
    onUpdate(newDiagnoses)
  }

  const handleAddDiagnosis = (diagnosis: StructuredDiagnosis) => {
    onUpdate([...effectiveDiagnoses, diagnosis])
    setIsAdding(false)
  }

  const handleToggleVerified = (index: number) => {
    const newDiagnoses = [...effectiveDiagnoses]
    newDiagnoses[index] = {
      ...newDiagnoses[index],
      verified_by_doctor: !newDiagnoses[index].verified_by_doctor,
    }
    onUpdate(newDiagnoses)
  }

  const handleVerifyAll = () => {
    const newDiagnoses = effectiveDiagnoses.map((d) => ({
      ...d,
      verified_by_doctor: true,
    }))
    onUpdate(newDiagnoses)
  }

  if (effectiveDiagnoses.length === 0 && !editable) {
    return (
      <span className="text-sm text-muted-foreground">
        Sin diagnósticos registrados
      </span>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Diagnosis list */}
      <div className="space-y-2">
        {effectiveDiagnoses.map((diagnosis, index) => (
          <div
            key={index}
            className="flex items-center gap-2 group"
          >
            {/* Verification checkbox */}
            {editable && (
              <Checkbox
                checked={diagnosis.verified_by_doctor}
                onCheckedChange={() => handleToggleVerified(index)}
                aria-label={`Verificar diagnóstico: ${diagnosis.original_text}`}
              />
            )}

            {/* Diagnosis badge or editor */}
            {editingIndex === index ? (
              <div className="flex-1">
                <InlineDiagnosisSelector
                  initialValue={diagnosis.original_text}
                  onSelect={(updated) => handleUpdateDiagnosis(index, updated)}
                  onCancel={() => setEditingIndex(null)}
                />
              </div>
            ) : (
              <DiagnosisBadge
                diagnosis={diagnosis}
                onEdit={editable ? () => setEditingIndex(index) : undefined}
              />
            )}

            {/* Remove button (visible on hover) */}
            {editable && editingIndex !== index && (
              <button
                onClick={() => handleRemoveDiagnosis(index)}
                className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 text-sm transition-opacity"
                aria-label="Eliminar diagnóstico"
              >
                Eliminar
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add new diagnosis */}
      {editable && (
        <div>
          {isAdding ? (
            <div className="mt-2">
              <InlineDiagnosisSelector
                onSelect={handleAddDiagnosis}
                onCancel={() => setIsAdding(false)}
              />
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="text-muted-foreground"
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar diagnóstico
            </Button>
          )}
        </div>
      )}

      {/* Verify all button */}
      {editable && showVerifyAll && hasUnverifiedDiagnoses && (
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleVerifyAll}
            className="text-green-600 border-green-200 hover:bg-green-50"
          >
            <Check className="h-4 w-4 mr-1" />
            Verificar todos los códigos
          </Button>
          <span className="text-xs text-amber-600">
            {effectiveDiagnoses.filter((d) => !d.verified_by_doctor).length}{" "}
            diagnóstico(s) pendiente(s) de verificación
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * DiagnosisPreview - Read-only preview of diagnoses with ICD codes
 * Used in report summaries and final reports
 */
interface DiagnosisPreviewProps {
  diagnoses: StructuredDiagnosis[]
  format?: "inline" | "list" | "table"
  className?: string
}

export function DiagnosisPreview({
  diagnoses,
  format = "list",
  className,
}: DiagnosisPreviewProps) {
  if (!diagnoses || diagnoses.length === 0) {
    return (
      <span className="text-muted-foreground">Sin diagnósticos</span>
    )
  }

  if (format === "inline") {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {diagnoses.map((d, i) => (
          <DiagnosisBadge key={i} diagnosis={d} showConfidence={false} />
        ))}
      </div>
    )
  }

  if (format === "table") {
    return (
      <table className={cn("text-sm w-full", className)}>
        <thead>
          <tr className="border-b">
            <th className="text-left py-1 font-medium">Código</th>
            <th className="text-left py-1 font-medium">Diagnóstico</th>
            <th className="text-left py-1 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {diagnoses.map((d, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-1 font-mono text-xs">
                {d.icd11_code || "—"}
              </td>
              <td className="py-1">{d.icd11_title || d.original_text}</td>
              <td className="py-1">
                {d.verified_by_doctor ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Verificado
                  </span>
                ) : (
                  <span className="text-amber-600">Pendiente</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // Default: list format
  return (
    <ul className={cn("space-y-1", className)}>
      {diagnoses.map((d, i) => (
        <li key={i} className="flex items-center gap-2">
          {d.icd11_code && (
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
              {d.icd11_code}
            </span>
          )}
          <span>{d.icd11_title || d.original_text}</span>
          {d.verified_by_doctor && (
            <Check className="h-3 w-3 text-green-600" />
          )}
        </li>
      ))}
    </ul>
  )
}
