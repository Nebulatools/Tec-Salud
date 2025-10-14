"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { 
  AlertCircle, 
  CheckCircle, 
  Sparkles, 
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  X,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

interface ComplianceResponse {
  improvedReport: string
  missingInformation: string[]
  questionsForDoctor: string[]
}

interface MissingField {
  id: string
  question: string
  answer?: string
  status: 'pending' | 'answered' | 'validated'
}

interface ComplianceAssistantProps {
  consultationData: any
  onComplete: (data: any) => void
  onSkip: () => void
}

export default function ComplianceAssistantV2({ consultationData, onComplete, onSkip }: ComplianceAssistantProps) {
  const { user } = useAuth()
  const [report, setReport] = useState('')
  const [missingFields, setMissingFields] = useState<MissingField[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRevalidating, setIsRevalidating] = useState(false)
  const [expandedField, setExpandedField] = useState<string | null>(null)
  const [compliancePercentage, setCompliancePercentage] = useState(0)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [doctorName, setDoctorName] = useState('')

  useEffect(() => {
    const loadDoctor = async () => {
      try {
        if (!user?.id) return
        const { data } = await supabase.from('doctors').select('first_name, last_name').eq('user_id', user.id).maybeSingle()
        if (data) setDoctorName(`${data.first_name} ${data.last_name}`.trim())
      } catch {}
    }
    loadDoctor()
  }, [user?.id])

  // Analizar compliance inicial
  const analyzeCompliance = useCallback(async () => {
    try {
      setIsLoading(true)
      const transcript = consultationData.transcript || consultationData.recordingData?.processedTranscript
      
      const response = await fetch('/api/enrich-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript,
          additionalInfo: [
            ...(consultationData?.appointmentDetails?.appointment_date && consultationData?.appointmentDetails?.start_time
              ? [{ question: '¿Cuál fue la fecha y hora exacta de esta consulta?', answer: `${consultationData.appointmentDetails.appointment_date} ${consultationData.appointmentDetails.start_time}` }] 
              : []),
            ...(doctorName ? [{ question: '¿Cuál es el nombre completo del médico tratante?', answer: doctorName }] : [])
          ]
        }),
      })

      if (!response.ok) throw new Error('Failed to analyze compliance')

      const result: ComplianceResponse = await response.json()
      setReport(result.improvedReport)
      
      // Convertir campos faltantes a objetos MissingField
      const fields: MissingField[] = result.missingInformation.map((field, index) => ({
        id: `field-${index}`,
        question: field,
        status: 'pending'
      }))
      setMissingFields(fields)
      
      // Calcular porcentaje de cumplimiento
      const totalFields = 15 // Asumiendo 15 campos totales requeridos
      const completedFields = totalFields - fields.length
      setCompliancePercentage((completedFields / totalFields) * 100)

      // Obtener sugerencias clínicas
      if (result.improvedReport) {
        const suggestionsResponse = await fetch('/api/get-clinical-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportText: result.improvedReport }),
        })
        
        if (suggestionsResponse.ok) {
          const suggestionsData = await suggestionsResponse.json()
          setSuggestions(suggestionsData.suggestions?.filter((s: any) => typeof s === 'string') || [])
        }
      }
    } catch (error) {
      // Silently handle error
    } finally {
      setIsLoading(false)
    }
  }, [consultationData])

  useEffect(() => {
    analyzeCompliance()
  }, [analyzeCompliance])

  // Manejar respuesta a un campo
  const handleFieldAnswer = (fieldId: string, answer: string) => {
    setMissingFields(prev => 
      prev.map(field => 
        field.id === fieldId 
          ? { ...field, answer, status: 'answered' }
          : field
      )
    )
  }

  // Revalidar con las respuestas proporcionadas
  const handleRevalidate = async () => {
    setIsRevalidating(true)
    
    try {
      // Construir las respuestas para enviar
      const answeredFields = missingFields.filter(field => field.answer)
      const responses = answeredFields.map(field => ({
        question: field.question,
        answer: field.answer
      }))

      const response = await fetch('/api/enrich-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: consultationData.transcript || consultationData.recordingData?.processedTranscript,
          additionalInfo: responses
        }),
      })

      if (!response.ok) throw new Error('Failed to revalidate')

      const result: ComplianceResponse = await response.json()
      setReport(result.improvedReport)

      // Actualizar campos - marcar como validados los que se respondieron
      const updatedFields = missingFields.map(field => {
        if (field.answer && !result.missingInformation.includes(field.question)) {
          return { ...field, status: 'validated' as const }
        }
        return field
      })

      // Agregar nuevos campos si aparecieron
      result.missingInformation.forEach(newField => {
        if (!updatedFields.find(f => f.question === newField)) {
          updatedFields.push({
            id: `field-${Date.now()}-${Math.random()}`,
            question: newField,
            status: 'pending'
          })
        }
      })

      setMissingFields(updatedFields)
      
      // Recalcular porcentaje
      const pendingFields = updatedFields.filter(f => f.status === 'pending').length
      const totalFields = 15
      const completedFields = totalFields - pendingFields
      setCompliancePercentage((completedFields / totalFields) * 100)

    } catch (error) {
      // Silently handle error
    } finally {
      setIsRevalidating(false)
    }
  }

  // Completar el paso
  const handleComplete = () => {
    const reportData = {
      ...consultationData.reportData,
      reporte: report,
      aiGeneratedReport: report,
      complianceData: {
        improvedReport: report,
        missingInformation: missingFields.filter(f => f.status === 'pending').map(f => f.question),
        questionsForDoctor: []
      },
      suggestions,
      isCompliant: missingFields.filter(f => f.status === 'pending').length === 0,
      fecha: new Date().toISOString().split('T')[0],
    }
    
    onComplete(reportData)
  }

  const pendingFields = missingFields.filter(f => f.status === 'pending')
  const answeredFields = missingFields.filter(f => f.status === 'answered')
  const validatedFields = missingFields.filter(f => f.status === 'validated')

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
                              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              <span className="ml-2 text-gray-600">Analizando cumplimiento...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Estado de Cumplimiento */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Estado de Cumplimiento
            </CardTitle>
            <div className="text-sm text-gray-600">
              {Math.round(compliancePercentage)}% completado
            </div>
          </div>
          <Progress value={compliancePercentage} className="mt-2" />
        </CardHeader>
        <CardContent>
          {pendingFields.length === 0 ? (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ¡Excelente! El reporte cumple con todos los requisitos.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Faltan {pendingFields.length} campos requeridos
              </AlertDescription>
            </Alert>
          )}

          {/* Campos Pendientes */}
          {pendingFields.length > 0 && (
            <div className="mt-4 space-y-3">
              <h4 className="font-medium text-gray-700">Información Faltante:</h4>
              {pendingFields.map((field) => (
                <Card key={field.id} className="border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium text-gray-700">{field.question}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedField(expandedField === field.id ? null : field.id)}
                        >
                          {expandedField === field.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                      
                      {expandedField === field.id && (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Escriba la respuesta del médico..."
                            value={field.answer || ''}
                            onChange={(e) => handleFieldAnswer(field.id, e.target.value)}
                            className="min-h-[80px] bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Campos Respondidos */}
          {answeredFields.length > 0 && (
            <div className="mt-4 space-y-3">
              <h4 className="font-medium text-gray-700">Respuestas Pendientes de Validar:</h4>
              {answeredFields.map((field) => (
                <Card key={field.id} className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">{field.question}</p>
                    <p className="text-sm text-gray-600">{field.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Campos Validados */}
          {validatedFields.length > 0 && (
            <div className="mt-4 space-y-3">
              <h4 className="font-medium text-gray-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Campos Completados:
              </h4>
              {validatedFields.map((field) => (
                <Card key={field.id} className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-gray-700 mb-1 line-through">{field.question}</p>
                    <p className="text-sm text-gray-600">{field.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Botón Revalidar */}
          {answeredFields.length > 0 && (
            <div className="mt-6">
              <Button
                onClick={handleRevalidate}
                disabled={isRevalidating}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                {isRevalidating ? (
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
          )}
        </CardContent>
      </Card>

      {/* Sugerencias Clínicas */}
      {suggestions.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-orange-600" />
                Sugerencias Clínicas
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSuggestions(!showSuggestions)}
              >
                {showSuggestions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          {showSuggestions && (
            <CardContent>
              <ul className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5">•</span>
                    <span className="text-sm text-gray-600">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      )}

      {/* Botones de Acción */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onSkip}
          className="flex-1"
        >
          Omitir
        </Button>
        <Button
          onClick={handleComplete}
          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
        >
          Continuar
        </Button>
      </div>
    </div>
  )
}
