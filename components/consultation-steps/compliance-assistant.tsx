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
    // Solo generar si hay transcript Y NO hay reporte previo Y NO hay datos de compliance
    if (transcript && !report && !complianceData && !consultationData.reportData?.aiGeneratedReport) {
      performInitialAnalysis()
    }
  }, [consultationData.transcript, consultationData.recordingData?.processedTranscript, consultationData.reportData?.aiGeneratedReport])

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
        if (suggestionsResult.suggestions && Array.isArray(suggestionsResult.suggestions)) {
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
      
      // Marcar paso como completado automáticamente
      onComplete(reportData)

    } catch (error) {
      console.error('Error during initial analysis:', error)
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
        if (suggestionsResult.suggestions && Array.isArray(suggestionsResult.suggestions)) {
          setSuggestions(suggestionsResult.suggestions.filter(s => typeof s === 'string'))
        }
      }

      // Clear doctor responses after validation
      setDoctorResponses({})

    } catch (error) {
      console.error('Error during revalidation:', error)
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
            {isCompliant && (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Cumple Normativa
              </Badge>
            )}
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
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Estado de Cumplimiento
            </h4>
          </div>
          
          {complianceData && complianceData.missingInformation.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Faltan {complianceData.missingInformation.length} campos requeridos
                </p>
              </div>
              
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {complianceData.questionsForDoctor.map((question, index) => (
                    <div key={index} className="space-y-2">
                      <p className="text-sm font-medium">{question}</p>
                      <Textarea
                        placeholder="Respuesta del médico..."
                        value={doctorResponses[question] || ''}
                        onChange={(e) => setDoctorResponses({
                          ...doctorResponses,
                          [question]: e.target.value
                        })}
                        className="min-h-[60px]"
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <Button
                onClick={handleRevalidate}
                disabled={validating}
                className="w-full"
                variant="default"
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
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-sm font-medium">
                Todos los campos requeridos están completos
              </p>
            </div>
          )}
        </Card>

        {/* Clinical Suggestions */}
        {suggestions.length > 0 && (
          <Card className="p-4">
            <h4 className="font-semibold flex items-center gap-2 mb-3">
              <Stethoscope className="h-4 w-4" />
              Sugerencias Clínicas
            </h4>
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                    <p className="text-sm text-muted-foreground">{suggestion}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            onClick={handleNext}
            className="w-full"
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
            className="w-full"
          >
            Regresar
          </Button>
        </div>
      </div>
    </div>
  )
}