"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DiagnosisPreview } from "@/components/diagnoses"
import { supabase } from "@/lib/supabase"
import { Printer, Download, Sparkles, Stethoscope, FileText, ChevronDown } from "lucide-react"
import type { StructuredDiagnosis } from "@/types/icd"

type MedicalReport = {
  id: string
  title: string | null
  report_type: string | null
  compliance_status: string | null
  created_at: string
  content: string | null
  ai_suggestions: string[] | null
  original_transcript: string | null
  appointment_id: string | null
}

type ReportDetailModalProps = {
  report: MedicalReport | null
  open: boolean
  onClose: () => void
}

export function ReportDetailModal({ report, open, onClose }: ReportDetailModalProps) {
  const [diagnoses, setDiagnoses] = useState<StructuredDiagnosis[]>([])
  const [loadingDiagnoses, setLoadingDiagnoses] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)

  // Cargar diagnósticos cuando se abre el modal
  useEffect(() => {
    console.log("Modal opened, report:", {
      id: report?.id,
      appointment_id: report?.appointment_id,
      has_ai_suggestions: !!report?.ai_suggestions?.length
    })
    if (open && report?.appointment_id) {
      loadDiagnoses(report.appointment_id)
    } else {
      console.log("No appointment_id found, skipping diagnosis load")
      setDiagnoses([])
    }
  }, [open, report?.appointment_id])

  const loadDiagnoses = async (appointmentId: string) => {
    setLoadingDiagnoses(true)
    console.log("Loading diagnoses for appointment:", appointmentId)
    try {
      const { data, error } = await supabase
        .from("clinical_extractions")
        .select("structured_diagnoses")
        .eq("appointment_id", appointmentId)
        .order("extracted_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      console.log("Clinical extractions result:", { data, error })
      setDiagnoses((data?.structured_diagnoses as StructuredDiagnosis[]) || [])
    } catch (error) {
      console.error("Error loading diagnoses:", error)
      setDiagnoses([])
    } finally {
      setLoadingDiagnoses(false)
    }
  }

  // Renderizar markdown básico a HTML
  const renderContent = (content: string) => {
    return content
      .replace(/^### (.+)$/gm, '<h3 class="font-semibold text-base mt-4 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="font-semibold text-lg mt-4 mb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="font-bold text-xl mt-4 mb-2">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^\* (.+)$/gm, '<li class="ml-4">• $1</li>')
      .replace(/\n/g, '<br />')
  }

  const handlePrint = () => {
    window.print()
  }

  if (!report) return null

  const formattedDate = new Date(report.created_at).toLocaleString("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-xl font-bold">Reporte Médico</DialogTitle>
            <Badge variant={report.report_type === "FINAL" ? "default" : "secondary"}>
              {report.report_type || "BORRADOR"}
            </Badge>
          </div>
          <DialogDescription className="text-sm text-gray-500">
            {formattedDate}
            {report.compliance_status && (
              <span className="ml-2">
                · Cumplimiento: <span className={report.compliance_status === "compliant" ? "text-green-600" : "text-amber-600"}>{report.compliance_status}</span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Diagnósticos CIE-11 - ARRIBA */}
          <section>
            <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
              <Stethoscope className="h-5 w-5 text-orange-500" />
              Diagnósticos Codificados (CIE-11)
            </h3>
            {loadingDiagnoses ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500" />
                Cargando diagnósticos...
              </div>
            ) : diagnoses.length > 0 ? (
              <div className="border rounded-lg p-3 bg-gray-50">
                <DiagnosisPreview diagnoses={diagnoses} format="table" />
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Sin diagnósticos codificados</p>
            )}
          </section>

          {/* Contenido del Reporte */}
          {report.content && (
            <section>
              <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                <FileText className="h-5 w-5 text-orange-500" />
                Contenido del Reporte
              </h3>
              <div
                className="border rounded-lg p-4 bg-white text-sm text-gray-800 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderContent(report.content) }}
              />
            </section>
          )}

          {/* Sugerencias IA */}
          {report.ai_suggestions && report.ai_suggestions.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                <Sparkles className="h-5 w-5 text-blue-500" />
                Sugerencias Clínicas de IA
              </h3>
              <div className="border rounded-lg p-4 bg-blue-50 space-y-2">
                {report.ai_suggestions.map((suggestion, idx) => (
                  <p key={idx} className="text-sm text-gray-700">
                    • {suggestion}
                  </p>
                ))}
              </div>
            </section>
          )}

          {/* Transcripción Original (colapsable) */}
          {report.original_transcript && (
            <section>
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="flex items-center gap-2 font-semibold text-gray-900 hover:text-gray-700 transition-colors"
              >
                <FileText className="h-5 w-5 text-gray-500" />
                Transcripción Original
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showTranscript ? "rotate-180" : ""}`}
                />
              </button>
              {showTranscript && (
                <div className="mt-3 border rounded-lg p-4 bg-gray-50 text-sm text-gray-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {report.original_transcript}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button variant="outline" disabled>
            <Download className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
