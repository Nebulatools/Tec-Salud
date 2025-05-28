"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Edit, Send, Mic, Plus } from "lucide-react"

interface ReportVerificationProps {
  appointmentId: string
  consultationData: any
  onComplete: (data: any) => void
}

export default function ReportVerification({ appointmentId, consultationData, onComplete }: ReportVerificationProps) {
  const [reportData, setReportData] = useState({
    patientName: consultationData?.patientInfo?.first_name + " " + consultationData?.patientInfo?.last_name || "Paciente",
    reportType: "Reporte Médico",
    onsetDate: consultationData?.onsetDate || new Date().toISOString().split("T")[0],
    recordedDate: consultationData?.recordedDate || new Date().toISOString().split("T")[0],
    reactionType: consultationData?.reactionType || "Consulta Médica",
    facilityName: consultationData?.facilityName || "Tec Salud",
    notes: consultationData?.patientInfo?.medical_history || `No hay reportes previos para ${consultationData?.patientInfo?.first_name || "este paciente"}. Este será el primer reporte generado.`,
  })

  const [isEditing, setIsEditing] = useState(false)
  const [question, setQuestion] = useState("")

  const handleSave = () => {
    onComplete(reportData)
  }

  const handleGenerateFinalReport = () => {
    onComplete(reportData)
  }

  const handleQuestionSubmit = () => {
    if (question.trim()) {
      // Here you would process the question
      console.log("Question submitted:", question)
      setQuestion("")
    }
  }

  return (
    <Card>
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Verificación de Reporte Generado
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsEditing(!isEditing)}
            className="text-primary-600 hover:text-primary-700"
          >
            <Edit className="w-4 h-4 mr-1" />
            Editar
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
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

        {/* Notes Section */}
        <div>
          <label className="text-sm font-medium text-gray-600 block mb-2">Notas:</label>
          {isEditing ? (
            <Textarea
              value={reportData.notes}
              onChange={(e) => setReportData(prev => ({ ...prev, notes: e.target.value }))}
              className="min-h-[100px]"
            />
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700 text-sm leading-relaxed">
                {reportData.notes}
              </p>
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
            Generar Reporte Final
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
        <div className="flex justify-start pt-4 border-t">
          <Button 
            variant="ghost"
            className="text-gray-600"
          >
            Anterior
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 