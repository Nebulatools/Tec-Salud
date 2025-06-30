"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, FileText, Calendar, User, Download, CheckCircle } from "lucide-react"
import ReactMarkdown from "react-markdown"

interface MedicalReport {
  id: string
  title: string
  report_type: string
  content: string
  original_transcript?: string
  ai_suggestions?: string[]
  compliance_status: boolean
  created_at: string
  doctors: {
    first_name: string
    last_name: string
  }
}

interface ReportViewerModalProps {
  isOpen: boolean
  onClose: () => void
  report: MedicalReport | null
}

export default function ReportViewerModal({
  isOpen,
  onClose,
  report
}: ReportViewerModalProps) {
  if (!report) return null

  const handleDownload = () => {
    // Acceder a las sugerencias usando la misma lógica
    const suggestions = (report.ai_suggestions as any)?.consultationData?.reportData?.suggestions || report.ai_suggestions;
    const validSuggestions = Array.isArray(suggestions) ? suggestions : [];
    
    const content = `
${report.title}

Fecha: ${new Date(report.created_at).toLocaleDateString("es-ES", {
  year: "numeric",
  month: "long", 
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
})}

Médico: Dr. ${report.doctor?.first_name} ${report.doctor?.last_name}

Tipo: ${report.report_type}

${report.content}

${validSuggestions.length > 0 ? `
SUGERENCIAS CLÍNICAS:
${validSuggestions.map((suggestion, index) => `${index + 1}. ${suggestion}`).join('\n')}
` : ''}

${report.original_transcript ? `
TRANSCRIPCIÓN ORIGINAL:
${report.original_transcript}
` : ''}
    `.trim()

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900">
                <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                  {report.title}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {report.report_type}
                  </Badge>
                  {report.compliance_status && (
                    <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      ✓ Cumple Normativa
                    </Badge>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Dr. {report.doctor?.first_name} {report.doctor?.last_name}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Descargar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="flex items-center gap-2"
              >
                Imprimir
              </Button>

            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 pt-3 border-t">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(report.created_at).toLocaleDateString("es-ES", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </div>
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              Dr. {report.doctor?.first_name} {report.doctor?.last_name}
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-600" />
                Reporte Médico Completo
              </h3>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{report.content}</ReactMarkdown>
              </div>
            </div>

            {(() => {
              // Acceder a las sugerencias en la ruta correcta - igual que en medical-reports.tsx
              const suggestions = (report.ai_suggestions as any)?.consultationData?.reportData?.suggestions || report.ai_suggestions;
              const isValidArray = Array.isArray(suggestions) && suggestions.length > 0;
              
              console.log('🔍 MODAL - Procesando sugerencias:', {
                reportId: report.id,
                rawAiSuggestions: report.ai_suggestions,
                processedSuggestions: suggestions,
                isValidArray,
                suggestionsCount: suggestions?.length || 0
              });
              
              return isValidArray ? (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-4 flex items-center gap-2">
                    🤖 Sugerencias Clínicas de IA ({suggestions.length})
                  </h3>
                  <div className="space-y-3">
                    {suggestions.map((suggestion: string, index: number) => (
                      <div
                        key={index}
                        className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-amber-200 dark:border-amber-800"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                            {index + 1}
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {suggestion}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {report.original_transcript && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">
                  📝 Transcripción Original de la Consulta
                </h3>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono">
                    {report.original_transcript}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}