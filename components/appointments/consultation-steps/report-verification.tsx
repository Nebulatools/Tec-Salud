"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Edit, Send, Mic, Plus, CheckCircle2 } from "lucide-react"

interface ReportVerificationProps {
  appointmentId: string
  consultationData: any
  onComplete: (data: any) => void
  onDataUpdate?: (data: any) => void
  onNext?: () => void
  onBack?: () => void
}

export default function ReportVerification({ appointmentId, consultationData, onComplete, onDataUpdate, onNext, onBack }: ReportVerificationProps) {
  const [reportData, setReportData] = useState({
    patientName: consultationData?.patientInfo?.first_name + " " + consultationData?.patientInfo?.last_name || "Paciente",
    reportType: "Reporte Médico",
    onsetDate: consultationData?.onsetDate || new Date().toISOString().split("T")[0],
    recordedDate: consultationData?.recordedDate || new Date().toISOString().split("T")[0],
    reactionType: consultationData?.reactionType || "Consulta Médica",
    facilityName: consultationData?.facilityName || "Tec Salud",
    notes: consultationData?.reportData?.aiGeneratedReport || consultationData?.patientInfo?.medical_history || `No hay reportes previos para ${consultationData?.patientInfo?.first_name || "este paciente"}. Este será el primer reporte generado.`,
  })

  // Actualizar con el reporte generado por IA y otros datos
  useEffect(() => {
    if (consultationData?.reportData?.aiGeneratedReport) {
      setReportData(prev => ({
        ...prev,
        notes: consultationData.reportData.aiGeneratedReport,
        patientName: consultationData?.patientInfo?.first_name && consultationData?.patientInfo?.last_name 
          ? `${consultationData.patientInfo.first_name} ${consultationData.patientInfo.last_name}`
          : prev.patientName,
        onsetDate: consultationData?.onsetDate || prev.onsetDate,
        recordedDate: consultationData?.recordedDate || prev.recordedDate,
        reactionType: consultationData?.reactionType || prev.reactionType,
        facilityName: consultationData?.facilityName || prev.facilityName
      }))
    }
  }, [
    consultationData?.reportData?.aiGeneratedReport, 
    consultationData?.patientInfo,
    consultationData?.onsetDate,
    consultationData?.recordedDate,
    consultationData?.reactionType,
    consultationData?.facilityName
  ])

  const [isEditing, setIsEditing] = useState(false)
  const [question, setQuestion] = useState("")
  const [changesSaved, setChangesSaved] = useState(false)

  // Función para aplicar cambios automáticamente cuando se sale del modo edición
  const handleToggleEdit = () => {
    if (isEditing) {
      // Si estamos saliendo del modo edición, aplicar los cambios SIN AVANZAR
      const updatedConsultationData = {
        ...consultationData,
        reportData: {
          ...consultationData.reportData,
          aiGeneratedReport: reportData.notes,
          reporte: reportData.notes
        },
        patientInfo: {
          ...consultationData.patientInfo,
          first_name: reportData.patientName.split(' ')[0] || consultationData.patientInfo?.first_name,
          last_name: reportData.patientName.split(' ').slice(1).join(' ') || consultationData.patientInfo?.last_name
        },
        onsetDate: reportData.onsetDate,
        recordedDate: reportData.recordedDate,
        reactionType: reportData.reactionType,
        facilityName: reportData.facilityName
      }
      
      // Usar onDataUpdate para guardar SIN avanzar de paso
      if (onDataUpdate) {
        onDataUpdate(updatedConsultationData)
        setChangesSaved(true)
        // Ocultar mensaje después de 3 segundos
        setTimeout(() => setChangesSaved(false), 3000)
      }
    }
    setIsEditing(!isEditing)
  }

  const handleSave = () => {
    // Actualizar los datos cuando se hace clic en Guardar SIN AVANZAR
    const updatedConsultationData = {
      ...consultationData,
      reportData: {
        ...consultationData.reportData,
        aiGeneratedReport: reportData.notes,
        reporte: reportData.notes
      },
      patientInfo: {
        ...consultationData.patientInfo,
        first_name: reportData.patientName.split(' ')[0] || consultationData.patientInfo?.first_name,
        last_name: reportData.patientName.split(' ').slice(1).join(' ') || consultationData.patientInfo?.last_name
      },
      onsetDate: reportData.onsetDate,
      recordedDate: reportData.recordedDate,
      reactionType: reportData.reactionType,
      facilityName: reportData.facilityName
    }
    
    // Usar onDataUpdate para guardar SIN avanzar
    if (onDataUpdate) {
      onDataUpdate(updatedConsultationData)
      setChangesSaved(true)
      // Ocultar mensaje después de 3 segundos
      setTimeout(() => setChangesSaved(false), 3000)
    } else {
      onComplete(updatedConsultationData)
    }
  }

  const handleGenerateFinalReport = () => {
    // Aplicar cambios antes de continuar al siguiente paso
    const updatedConsultationData = {
      ...consultationData,
      reportData: {
        ...consultationData.reportData,
        aiGeneratedReport: reportData.notes,
        reporte: reportData.notes
      },
      patientInfo: {
        ...consultationData.patientInfo,
        first_name: reportData.patientName.split(' ')[0] || consultationData.patientInfo?.first_name,
        last_name: reportData.patientName.split(' ').slice(1).join(' ') || consultationData.patientInfo?.last_name
      },
      onsetDate: reportData.onsetDate,
      recordedDate: reportData.recordedDate,
      reactionType: reportData.reactionType,
      facilityName: reportData.facilityName
    }
    onComplete(updatedConsultationData)
  }

  const handleQuestionSubmit = () => {
    if (question.trim()) {
      // Here you would process the question
      console.log("Question submitted:", question)
      setQuestion("")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with action button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Verificación de Reporte Generado</h1>
        <div className="flex items-center gap-3">
          {changesSaved && (
            <div className="flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Cambios guardados
            </div>
          )}
          <Button 
            variant="outline"
            size="sm" 
            onClick={handleToggleEdit}
            className="text-primary-600 hover:text-primary-700 border-primary-200"
          >
            <Edit className="w-4 h-4 mr-1" />
            {isEditing ? "Aplicar Cambios" : "Editar"}
          </Button>
        </div>
      </div>

      <Card className="bg-white shadow-lg">
        <CardContent className="p-8 space-y-8">
        {/* Report Header */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Paciente:</label>
              {isEditing ? (
                <Input
                  value={reportData.patientName}
                  onChange={(e) => setReportData(prev => ({ ...prev, patientName: e.target.value }))}
                  className="mt-1"
                />
              ) : (
                <p className="text-gray-900 font-medium">{reportData.patientName}</p>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Tipo de Reporte:</label>
              {isEditing ? (
                <Input
                  value={reportData.reportType}
                  onChange={(e) => setReportData(prev => ({ ...prev, reportType: e.target.value }))}
                  className="mt-1"
                />
              ) : (
                <p className="text-gray-900 font-medium">{reportData.reportType}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Onset Date:</span>
                  {isEditing ? (
                    <Input
                      value={reportData.onsetDate}
                      onChange={(e) => setReportData(prev => ({ ...prev, onsetDate: e.target.value }))}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-gray-900">{reportData.onsetDate}</p>
                  )}
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Reaction Type:</span>
                  {isEditing ? (
                    <Input
                      value={reportData.reactionType}
                      onChange={(e) => setReportData(prev => ({ ...prev, reactionType: e.target.value }))}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-gray-900">{reportData.reactionType}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Recorded Date:</span>
                  {isEditing ? (
                    <Input
                      value={reportData.recordedDate}
                      onChange={(e) => setReportData(prev => ({ ...prev, recordedDate: e.target.value }))}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-gray-900">{reportData.recordedDate}</p>
                  )}
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Facility Name:</span>
                  {isEditing ? (
                    <Input
                      value={reportData.facilityName}
                      onChange={(e) => setReportData(prev => ({ ...prev, facilityName: e.target.value }))}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-gray-900">{reportData.facilityName}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section - Reporte con formato bonito */}
        <div>
          <label className="text-sm font-medium text-gray-600 block mb-4">Reporte de Consulta:</label>
          {isEditing ? (
            <Textarea
              value={reportData.notes}
              onChange={(e) => setReportData(prev => ({ ...prev, notes: e.target.value }))}
              className="min-h-[400px] text-sm"
            />
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="prose prose-sm max-w-none">
                {reportData.notes ? (
                  <div 
                    className="text-gray-900 leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ 
                      __html: reportData.notes
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/\n/g, '<br />')
                    }} 
                  />
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                    <p className="text-amber-800 font-medium">No hay reporte generado</p>
                    <p className="text-amber-600 text-sm mt-2">
                      Complete el paso anterior para generar el reporte médico.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4">
          <Button 
            variant="outline"
            onClick={handleSave}
            className="text-gray-600"
          >
            Guardar
          </Button>
          
          <Button 
            onClick={handleGenerateFinalReport}
            className="bg-primary-400 hover:bg-primary-500 text-white px-8"
          >
            Continuar a Reporte Final
          </Button>
        </div>

        {/* Questions Section */}
        <div className="border-t pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border border-gray-300 rounded"></div>
              <label className="text-sm font-medium text-gray-600">Preguntas sobre el reporte</label>
            </div>
            
            <p className="text-sm text-gray-500">
              Puede hacer preguntas sobre el reporte o solicitar modificaciones
            </p>
            
            <div className="flex gap-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Pregunta sobre el reporte..."
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleQuestionSubmit()}
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleQuestionSubmit}
                disabled={!question.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleQuestionSubmit}
                disabled={!question.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className="text-primary-600"
              >
                <Mic className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button 
            variant="ghost"
            onClick={onBack}
            className="text-gray-600"
          >
            ← Anterior
          </Button>
          <Button 
            variant="outline"
            onClick={onNext}
            className="text-primary-600"
          >
            Siguiente →
          </Button>
        </div>
        </CardContent>
      </Card>
    </div>
  )
} 