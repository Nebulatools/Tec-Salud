'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, AlertCircle, Sparkles, Stethoscope, FileText, Bot } from 'lucide-react'
import { ConsultationData } from '@/types/consultation'
import dynamic from 'next/dynamic'

const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then(mod => mod.default),
  { ssr: false }
)

interface ComplianceAssistantProps {
  consultationData: ConsultationData
  onDataUpdate: (data: ConsultationData) => void
  onComplete: (data: any) => void
  onNext: () => void
  onBack: () => void
}

interface ComplianceResponse {
  improvedReport: string
  missingInformation: string[]
  questionsForDoctor: string[]
}

interface SuggestionsResponse {
  suggestions: string[]
}

export default function ComplianceAssistant({
  consultationData,
  onDataUpdate,
  onComplete,
  onNext,
  onBack
}: ComplianceAssistantProps) {
  const [report, setReport] = useState(consultationData.reportData?.reporte || '')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [complianceData, setComplianceData] = useState<ComplianceResponse | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [doctorResponses, setDoctorResponses] = useState<Record<string, string>>({})
  const [isCompliant, setIsCompliant] = useState(false)
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState<string>('')

  useEffect(() => {
    // Si ya existe un reporte generado por IA, usar esos datos SIN regenerar
    if (consultationData.reportData?.aiGeneratedReport) {
      setReport(consultationData.reportData.aiGeneratedReport)
      setComplianceData(consultationData.reportData.complianceData || null)
      setSuggestions(consultationData.reportData.suggestions || [])
      setIsCompliant(consultationData.reportData.isCompliant || false)
      return; // Salir temprano para evitar regeneración
    }

    const transcript = consultationData.transcript || consultationData.recordingData?.processedTranscript
    
    // Detectar si la transcripción ha cambiado desde la última vez que se procesó
    const transcriptChanged = transcript && transcript !== lastProcessedTranscript
    
    // Generar reporte si:
    // 1. Hay transcript Y (NO hay reporte previo O la transcripción cambió)
    if (transcript && ((!report && !complianceData && !consultationData.reportData?.aiGeneratedReport) || transcriptChanged)) {
      console.log('🔄 Regenerando reporte de IA - Transcripción cambió:', transcriptChanged)
      performInitialAnalysis()
    }
  }, [consultationData.transcript, consultationData.recordingData?.processedTranscript, consultationData.reportData?.aiGeneratedReport, lastProcessedTranscript])

  const performInitialAnalysis = async () => {
    setLoading(true)
    try {
      // Call compliance API
      const transcript = consultationData.transcript || consultationData.recordingData?.processedTranscript
      const complianceResponse = await fetch('/api/enrich-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcript
        }),
      })

      if (!complianceResponse.ok) {
        throw new Error('Failed to analyze compliance')
      }

      const complianceResult: ComplianceResponse = await complianceResponse.json()
      setComplianceData(complianceResult)
      setReport(complianceResult.improvedReport)
      setIsCompliant(complianceResult.missingInformation.length === 0)

      // Call suggestions API
      let suggestionsResult: SuggestionsResponse | null = null
      const suggestionsResponse = await fetch('/api/get-clinical-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportText: complianceResult.improvedReport
        }),
      })

      if (suggestionsResponse.ok) {
        suggestionsResult = await suggestionsResponse.json()
        // Ensure suggestions is an array of strings
        if (suggestionsResult && suggestionsResult.suggestions && Array.isArray(suggestionsResult.suggestions)) {
          setSuggestions(suggestionsResult.suggestions.filter(s => typeof s === 'string'))
        }
      }

      // Auto-marcar como completado cuando se termine el análisis inicial
      const reportData = {
        ...consultationData.reportData,
        reporte: complianceResult.improvedReport,
        aiGeneratedReport: complianceResult.improvedReport,
        complianceData: complianceResult,
        suggestions: suggestionsResult?.suggestions?.filter(s => typeof s === 'string') || [],
        isCompliant: complianceResult.missingInformation.length === 0,
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString('es-MX', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
      }

      onDataUpdate({
        ...consultationData,
        reportData: reportData
      })
      
      // Marcar esta transcripción como procesada
      setLastProcessedTranscript(transcript || '')
      
      // NO auto-completar - que el usuario decida cuándo continuar
      // onComplete(reportData)

    } catch (error) {
      console.error('Error during initial analysis:', error)
      // Mostrar error al usuario
      alert(`Error al analizar la transcripción: ${error instanceof Error ? error.message : 'Error desconocido'}. Por favor, inténtalo de nuevo.`)
    } finally {
      setLoading(false)
    }
  }

  const handleRevalidate = async () => {
    setValidating(true)
    try {
      // Append doctor responses to the report
      let enrichedReport = report
      if (Object.keys(doctorResponses).length > 0) {
        enrichedReport += '\n\n## Información Adicional Proporcionada por el Médico\n\n'
        Object.entries(doctorResponses).forEach(([question, response]) => {
          if (response.trim()) {
            enrichedReport += `**${question}**\n${response}\n\n`
          }
        })
      }

      // Call compliance API again
      const complianceResponse = await fetch('/api/enrich-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: enrichedReport
        }),
      })

      if (!complianceResponse.ok) {
        throw new Error('Failed to revalidate compliance')
      }

      const complianceResult: ComplianceResponse = await complianceResponse.json()
      setComplianceData(complianceResult)
      setReport(complianceResult.improvedReport)
      setIsCompliant(complianceResult.missingInformation.length === 0)

      // Get new suggestions
      const suggestionsResponse = await fetch('/api/get-clinical-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportText: complianceResult.improvedReport
        }),
      })

      if (suggestionsResponse.ok) {
        const suggestionsResult: SuggestionsResponse = await suggestionsResponse.json()
        // Ensure suggestions is an array of strings
        if (suggestionsResult && suggestionsResult.suggestions && Array.isArray(suggestionsResult.suggestions)) {
          setSuggestions(suggestionsResult.suggestions.filter(s => typeof s === 'string'))
        }
      }

      // Clear doctor responses after validation
      setDoctorResponses({})

    } catch (error) {
      console.error('Error during revalidation:', error)
      // Mostrar error al usuario
      alert(`Error al revalidar el reporte: ${error instanceof Error ? error.message : 'Error desconocido'}. Por favor, inténtalo de nuevo.`)
    } finally {
      setValidating(false)
    }
  }

  const handleNext = () => {
    const reportData = {
      ...consultationData.reportData,
      reporte: report,
      aiGeneratedReport: report,
      complianceData: complianceData,
      suggestions: suggestions,
      isCompliant: isCompliant,
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('es-MX', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
    }

    onDataUpdate({
      ...consultationData,
      reportData: reportData
    })
    
    // Marcar como completado usando onComplete
    onComplete(reportData)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Analizando transcripción con IA...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Report Editor - 2/3 width */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Reporte Médico
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Forzar regeneración eliminando el último transcript procesado
                  setLastProcessedTranscript('')
                  performInitialAnalysis()
                }}
                disabled={loading}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                🔄 Regenerar con IA
              </Button>
              {isCompliant && (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Cumple Normativa
                </Badge>
              )}
            </div>
          </div>
          
          <div data-color-mode="light">
            <MDEditor
              value={report}
              onChange={(value) => setReport(value || '')}
              height={600}
              preview="edit"
            />
          </div>
        </Card>
      </div>

      {/* Sidebar - 1/3 width */}
      <div className="space-y-4">
        {/* Compliance Status */}
        <Card className="p-6 min-h-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Estado de Cumplimiento
            </h4>
          </div>
          
          {complianceData && complianceData.missingInformation.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertCircle className="h-6 w-6 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-base font-semibold text-amber-800">
                    Faltan {complianceData.missingInformation.length} campos requeridos
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Complete la información faltante para mejorar el cumplimiento
                  </p>
                </div>
              </div>
              
              <ScrollArea className="h-64">
                <div className="space-y-4 pr-2">
                  {complianceData.questionsForDoctor.map((question, index) => (
                    <div key={index} className="space-y-2 p-3 bg-gray-50 rounded-lg border">
                      <p className="text-sm font-semibold text-gray-800">{question}</p>
                      <Textarea
                        placeholder="Respuesta del médico..."
                        value={doctorResponses[question] || ''}
                        onChange={(e) => setDoctorResponses({
                          ...doctorResponses,
                          [question]: e.target.value
                        })}
                        className="min-h-[70px] bg-white"
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <Button
                onClick={handleRevalidate}
                disabled={validating}
                className="w-full bg-primary-400 hover:bg-primary-500 text-white"
                size="lg"
              >
                {validating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Revalidando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Revalidar con IA
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12 px-4">
              <div className="p-4 bg-green-100 rounded-full mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-green-800 mb-2">
                ¡Excelente!
              </p>
              <p className="text-base text-green-700">
                Todos los campos requeridos están completos
              </p>
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200 w-full">
                <p className="text-sm text-green-800 font-medium">
                  ✅ Cumple con los estándares de documentación médica
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleNext}
            size="lg"
            className="w-full bg-primary-400 hover:bg-primary-500 text-white"
          >
            Continuar a Verificación Final
          </Button>
          {!isCompliant && (
            <p className="text-xs text-amber-600 text-center px-2">
              Algunos campos pueden estar incompletos, pero puedes continuar
            </p>
          )}
          <Button
            onClick={onBack}
            variant="outline"
            size="lg"
            className="w-full text-gray-600"
          >
            ← Regresar
          </Button>
        </div>
      </div>
    </div>
  )
}