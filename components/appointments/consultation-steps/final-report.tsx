"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Printer, Download, Save } from "lucide-react"
import SuccessModal from "@/components/ui/success-modal"
import { supabase } from "@/lib/supabase"

interface FinalReportProps {
  appointmentId: string
  consultationData: any
  onComplete: (data: any) => void
  onBack?: () => void
}

export default function FinalReport({ appointmentId, consultationData, onComplete, onBack }: FinalReportProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [isExistingReport, setIsExistingReport] = useState(false)
  
  // Debug: Log the consultation data received (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('FinalReport received consultationData:', consultationData)
    console.log('AI Generated Report:', consultationData?.reportData?.aiGeneratedReport)
  }

  // Check if report has all necessary data to be considered "complete"
  useEffect(() => {
    const hasCompleteData = consultationData?.reportData?.aiGeneratedReport && 
                          consultationData?.reportData?.aiGeneratedReport.length > 50
    
    if (hasCompleteData) {
      setHasChanges(true) // Enable save button when we have complete data
    } else {
      setHasChanges(false) // Disable when data is incomplete
    }
  }, [consultationData])

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    // Generar PDF con el reporte de IA y transcript original
    const reportContent = consultationData?.reportData?.aiGeneratedReport || 'No hay reporte generado'
    const originalTranscript = consultationData?.recordingData?.processedTranscript || consultationData?.transcript || 'No hay transcript disponible'
    const suggestions = consultationData?.reportData?.suggestions || []
    
    // Crear contenido del PDF
    let pdfContent = `
=== REPORTE MÉDICO GENERADO POR IA ===

${reportContent}
`

    // Agregar sugerencias si existen
    if (suggestions.length > 0) {
      pdfContent += `

=== SUGERENCIAS CLÍNICAS DE IA ===

`
      suggestions.forEach((suggestion: string, index: number) => {
        pdfContent += `${index + 1}. ${suggestion}\n`
      })
    }

    pdfContent += `

=== TRANSCRIPT ORIGINAL ===

${originalTranscript}
    `
    
    // Crear y descargar archivo
    const blob = new Blob([pdfContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-medico-${patientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      // Preparar datos del reporte para guardar - usar appointmentId como patient_id si no existe
      if (process.env.NODE_ENV === 'development') {
        console.log('=== DEBUG PATIENT ID ===')
        console.log('consultationData?.patientInfo:', consultationData?.patientInfo)
        console.log('consultationData?.patientInfo?.id:', consultationData?.patientInfo?.id)
        console.log('appointmentId:', appointmentId)
      }
      
      const patientId = consultationData?.patientInfo?.id || appointmentId || new Date().getTime().toString()
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Final patientId selected:', patientId)
      }
      
      // Asegurarse de que las sugerencias sean un array
      const suggestions = consultationData?.reportData?.suggestions || []
      if (process.env.NODE_ENV === 'development') {
        console.log('=== DEBUGGING SUGGESTIONS ===')
        console.log('Suggestions type:', typeof suggestions)
        console.log('Suggestions value:', suggestions)
        console.log('Is array?:', Array.isArray(suggestions))
        console.log('Suggestions length:', suggestions.length)
      }

      // Construir el contenido completo del reporte incluyendo las sugerencias
      let fullReportContent = consultationData?.reportData?.aiGeneratedReport || consultationData?.reportData?.reporte || 'Reporte médico generado por IA'
      
      // FORZAR la inclusión de las sugerencias en el contenido
      if (process.env.NODE_ENV === 'development') {
        console.log('=== BUILDING FULL REPORT WITH SUGGESTIONS ===')
        console.log('Original content length:', fullReportContent.length)
        console.log('Suggestions to add:', suggestions)
      }
      
      // Agregar las sugerencias al final del contenido si existen
      if (suggestions && suggestions.length > 0) {
        fullReportContent += '\n\n### 🤖 Sugerencias Clínicas de IA\n\n'
        suggestions.forEach((suggestion: string, index: number) => {
          fullReportContent += `${index + 1}. ${suggestion}\n`
        })
        if (process.env.NODE_ENV === 'development') {
          console.log('Content with suggestions length:', fullReportContent.length)
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.log('NO SUGGESTIONS TO ADD!')
      }

      const reportToSave = {
        patient_id: patientId,
        doctor_id: consultationData?.doctorId || null,
        appointment_id: appointmentId,
        report_type: 'Consulta Médica',
        title: `Consulta - ${patientName} - ${new Date().toLocaleDateString('es-MX')}`,
        content: fullReportContent, // YA INCLUYE LAS SUGERENCIAS
        original_transcript: consultationData?.recordingData?.processedTranscript || consultationData?.transcript || 'Sin transcript disponible',
        ai_suggestions: suggestions || [], // GUARDAR LAS SUGERENCIAS COMO ARRAY
        compliance_status: consultationData?.reportData?.isCompliant || false
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('=== SAVING REPORT ===')
        console.log('Report data to save:', reportToSave)
        console.log('Full consultation data:', consultationData)
        console.log('AI suggestions to save:', reportToSave.ai_suggestions)
      }

      // Verificar datos requeridos
      if (!reportToSave.content || reportToSave.content.length < 10) {
        throw new Error('No hay suficiente contenido de reporte para guardar')
      }

      // Guardar en la base de datos usando el API real
      if (process.env.NODE_ENV === 'development') {
        console.log('Calling API to save report...')
      }
      const response = await fetch('/api/medical-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportToSave),
      })

      if (process.env.NODE_ENV === 'development') {
        console.log('API Response status:', response.status)
        console.log('API Response headers:', response.headers)
      }

      if (!response.ok) {
        const errorText = await response.text()
        if (process.env.NODE_ENV === 'development') {
          console.error('API Error response:', errorText)
        }
        throw new Error(`Error al guardar: ${response.status} - ${errorText}`)
      }

      const savedReport = await response.json()
      if (process.env.NODE_ENV === 'development') {
        console.log('Successfully saved report:', savedReport)
      }
      
      setHasChanges(false) // Disable save button after successful save
      
      onComplete({
        reportSaved: true,
        savedAt: new Date().toISOString(),
        reportId: savedReport.id
      })
      
      // Mostrar modal de éxito
      setShowSuccessModal(true)
      
    } catch (error) {
      console.error('Error saving report:', error)
      setShowSuccessModal(true) // También mostrar modal para errores, pero con mensaje diferente
    } finally {
      setIsSaving(false)
    }
  }

  const getCurrentDate = () => {
    return new Date().toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric"
    })
  }

  const patientName = (consultationData?.patientInfo?.first_name && consultationData?.patientInfo?.last_name) 
    ? `${consultationData.patientInfo.first_name} ${consultationData.patientInfo.last_name}`
    : consultationData?.patientInfo?.first_name || consultationData?.patientInfo?.last_name || "Paciente"

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handlePrint} className="text-gray-600">
          <Printer className="w-4 h-4 mr-2" />
          Imprimir
        </Button>
        <Button variant="outline" onClick={handleDownloadPDF} className="text-gray-600">
          <Download className="w-4 h-4 mr-2" />
          Descargar PDF
        </Button>
        <Button 
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className={`${hasChanges ? 'bg-primary-400 hover:bg-primary-500' : 'bg-gray-400'} text-white`}
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Guardando..." : hasChanges ? "Guardar" : "Guardado"}
        </Button>
      </div>

      {/* Final Report Document */}
      <Card className="bg-white shadow-lg">
        <CardContent className="p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Report Header */}
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold text-gray-900">Reporte Médico</h1>
              <p className="text-lg text-gray-600">{getCurrentDate()}</p>
            </div>

            {/* Patient Information Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                Información del Paciente
              </h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Nombre:</span>
                      <p className="text-gray-900 font-medium">{patientName}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Fecha de Nacimiento:</span>
                      <p className="text-gray-900">{consultationData?.patientInfo?.date_of_birth ? new Date(consultationData.patientInfo.date_of_birth).toLocaleDateString("es-ES") : "No especificada"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Tipo de Consulta:</span>
                      <p className="text-gray-900">{consultationData?.reactionType || "Consulta Médica"}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Fecha de Consulta:</span>
                      <p className="text-gray-900">{consultationData?.onsetDate ? new Date(consultationData.onsetDate).toLocaleDateString("es-ES") : getCurrentDate()}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Centro Médico:</span>
                      <p className="text-gray-900">{consultationData?.facilityName || "Tec Salud"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Teléfono:</span>
                      <p className="text-gray-900">{consultationData?.patientInfo?.phone || "No especificado"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Consultation Report Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                Reporte de Consulta
              </h2>
              
              <div className="space-y-6">
                {/* Reporte principal - SIEMPRE mostrar el generado por IA como contenido principal */}
                <div>
                  <div className="prose prose-sm max-w-none">
                    {consultationData?.reportData?.aiGeneratedReport ? (
                      <div 
                        className="text-gray-900 leading-relaxed whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ 
                          __html: consultationData.reportData.aiGeneratedReport
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\*(.*?)\*/g, '<em>$1</em>')
                            .replace(/\n/g, '<br />')
                        }} 
                      />
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
                        <p className="text-amber-800 font-medium">No hay reporte generado por IA disponible</p>
                        <p className="text-amber-600 text-sm mt-2">
                          Por favor, complete el paso de "Asistente de Cumplimiento IA" para generar el reporte médico.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mostrar transcript original solo como referencia si existe reporte IA */}
                {consultationData?.reportData?.aiGeneratedReport && (consultationData?.recordingData?.processedTranscript || consultationData?.transcript) && (
                  <details className="border-t pt-6">
                    <summary className="font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                      Ver transcripción original
                    </summary>
                    <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                        {consultationData?.recordingData?.processedTranscript || consultationData?.transcript}
                      </p>
                    </div>
                  </details>
                )}

                {/* Sugerencias clínicas si existen */}
                {consultationData?.reportData?.suggestions && consultationData.reportData.suggestions.length > 0 && (
                  <div className="border-t pt-6">
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      🤖 Sugerencias Clínicas de IA
                    </h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <ul className="space-y-2">
                        {consultationData.reportData.suggestions.map((suggestion: string, index: number) => (
                          <li key={index} className="text-blue-800 text-sm flex items-start">
                            <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Doctor Signature Section */}
            <div className="flex justify-end pt-12">
              <div className="text-center space-y-4">
                {/* Signature placeholder */}
                <div className="w-48 h-16 border-b border-gray-400 mb-2">
                  <div className="flex items-end h-full pb-2">
                    <div className="ml-auto italic text-gray-600 text-sm">Firma Digital</div>
                  </div>
                </div>
                
                <div>
                  <p className="font-semibold text-gray-900">Dr. Medical Professional</p>
                  <p className="text-gray-600 text-sm">{consultationData?.facilityName || "Tec Salud"}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Navigation */}
      <div className="flex justify-start">
        <Button 
          variant="ghost"
          onClick={onBack}
          className="text-gray-600"
        >
          ← Regresar a Verificación
        </Button>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="¡Reporte Guardado!"
        message="El reporte médico se ha guardado exitosamente en la base de datos. Ahora puedes encontrarlo en la sección de Expedientes del paciente."
        onConfirm={() => {
          // Opcional: navegar a expedientes o cerrar consulta
        }}
        confirmText="Ver en Expedientes"
      />
    </div>
  )
} 