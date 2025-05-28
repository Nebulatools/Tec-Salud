"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Printer, Download, Save } from "lucide-react"

interface FinalReportProps {
  appointmentId: string
  consultationData: any
  onComplete: (data: any) => void
}

export default function FinalReport({ appointmentId, consultationData, onComplete }: FinalReportProps) {
  const [isSaving, setIsSaving] = useState(false)

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    // Here you would generate and download PDF
    console.log("Downloading PDF...")
  }

  const handleSave = async () => {
    setIsSaving(true)
    
    // Simulate saving to database
    setTimeout(() => {
      setIsSaving(false)
      onComplete({
        reportSaved: true,
        savedAt: new Date().toISOString(),
      })
    }, 1000)
  }

  const getCurrentDate = () => {
    return new Date().toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric"
    })
  }

  const patientName = consultationData?.patientInfo?.first_name + " " + consultationData?.patientInfo?.last_name || "Paciente"

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
          disabled={isSaving}
          className="bg-primary-400 hover:bg-primary-500 text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Guardando..." : "Guardar"}
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
              
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  {consultationData?.patientInfo?.medical_history || `No hay reportes previos para ${patientName}. Este será el primer reporte generado.`}
                </p>
                
                {consultationData?.recordingData && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Resumen de la Consulta:</h3>
                    <p className="text-gray-700 text-sm">
                      {consultationData.recordingData.processedTranscript || "Grabación procesada automáticamente durante la consulta."}
                    </p>
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
    </div>
  )
} 