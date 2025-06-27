"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Check, FileText, Mic, Shield, Download, Bot } from "lucide-react"
import { cn } from "@/lib/utils"

import PatientSummary from "./consultation-steps/patient-summary"
import ConsultationRecording from "./consultation-steps/consultation-recording"
import ComplianceAssistant from "../consultation-steps/compliance-assistant"
import ReportVerification from "./consultation-steps/report-verification"
import FinalReport from "./consultation-steps/final-report"
import RecordingIndicator from "./recording-indicator"
import { ConsultationData } from "@/types/consultation"

interface ConsultationFlowProps {
  appointmentId: string
  patientName: string
  patientId?: string
  onClose: () => void
}

interface StepConfig {
  id: number
  title: string
  icon: any
  component: React.ComponentType<any>
}

const steps: StepConfig[] = [
  {
    id: 1,
    title: "Resumen del Paciente",
    icon: FileText,
    component: PatientSummary,
  },
  {
    id: 2,
    title: "Grabación de Consulta",
    icon: Mic,
    component: ConsultationRecording,
  },
  {
    id: 3,
    title: "Asistente de Cumplimiento IA",
    icon: Bot,
    component: ComplianceAssistant,
  },
  {
    id: 4,
    title: "Verificación de Reporte",
    icon: Shield,
    component: ReportVerification,
  },
  {
    id: 5,
    title: "Reporte Final",
    icon: Download,
    component: FinalReport,
  },
]

export default function ConsultationFlow({ appointmentId, patientName, patientId, onClose }: ConsultationFlowProps) {
  console.log('=== CONSULTATION FLOW STARTED ===')
  console.log('appointmentId:', appointmentId)
  console.log('patientName:', patientName)
  console.log('patientId:', patientId)
  
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [consultationData, setConsultationData] = useState<ConsultationData>({
    patientInfo: { id: patientId },
    recordingData: null,
    transcript: undefined,
    reportData: null,
    finalReport: null,
  })

  const handleStepComplete = (stepId: number, data?: any) => {
    console.log('Step completed:', stepId, 'with data:', data)
    
    // Solo añadir a completedSteps si no está ya ahí
    setCompletedSteps(prev => prev.includes(stepId) ? prev : [...prev, stepId])
    
    // Update consultation data - preservar datos existentes
    if (stepId === 1) {
      setConsultationData(prev => ({ 
        ...prev, 
        patientInfo: { 
          ...prev.patientInfo, 
          ...data.patientInfo,
          id: prev.patientInfo?.id || patientId // Preservar el ID original
        },
        appointmentDetails: data.appointmentDetails
      }))
    } else if (stepId === 2) {
      setConsultationData(prev => ({ ...prev, recordingData: data, transcript: data?.transcript }))
    } else if (stepId === 3) {
      // Paso 3: Compliance Assistant - preservar datos de IA
      console.log('Updating step 3 data:', data)
      setConsultationData(prev => {
        const updated = { 
          ...prev, 
          reportData: {
            ...prev.reportData,
            ...data
          }
        }
        console.log('Updated consultation data after step 3:', updated)
        return updated
      })
    } else if (stepId === 4) {
      // Paso 4: Verificación - hacer merge para preservar datos de IA del paso 3
      setConsultationData(prev => ({ 
        ...prev, 
        reportData: {
          ...prev.reportData,
          ...data
        }
      }))
    } else if (stepId === 5) {
      setConsultationData(prev => ({ ...prev, finalReport: data }))
    }

    // Move to next step automatically except for step 2 (recording)
    if (stepId !== 2 && stepId < 5) {
      setCurrentStep(stepId + 1)
    }
  }

  const handleStepNavigation = (stepId: number) => {
    // Permitir navegar a cualquier paso que ya haya sido completado o al actual
    const maxAllowedStep = Math.max(...completedSteps, currentStep)
    if (stepId <= maxAllowedStep || stepId === currentStep + 1) {
      setCurrentStep(stepId)
    }
  }

  const getCurrentStepComponent = () => {
    const currentStepConfig = steps.find(step => step.id === currentStep)
    if (!currentStepConfig) return null

    const Component = currentStepConfig.component
    return (
      <Component
        appointmentId={appointmentId}
        consultationData={consultationData}
        onComplete={(data?: any) => handleStepComplete(currentStep, data)}
        onDataUpdate={setConsultationData}
        onNext={() => setCurrentStep(currentStep + 1)}
        onBack={() => setCurrentStep(currentStep - 1)}
        onRecordingStateChange={setIsRecording}
        onNavigateToStep={handleStepNavigation}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Recording Indicator - Independent floating component */}
      {isRecording && <RecordingIndicator />}

      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{patientName}</h1>
            <p className="text-gray-600">Consulta médica</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id)
              const isCurrent = currentStep === step.id
              const isClickable = step.id <= Math.max(...completedSteps, currentStep)

              return (
                <div key={step.id} className="flex items-center">
                  {/* Step Circle */}
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200",
                      isCompleted
                        ? "bg-primary-400 border-primary-400 text-white"
                        : isCurrent
                        ? "bg-primary-400 border-primary-400 text-white"
                        : "bg-white border-gray-300 text-gray-500",
                      isClickable && "cursor-pointer hover:border-primary-300"
                    )}
                    onClick={() => isClickable && handleStepNavigation(step.id)}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-semibold">{step.id}</span>
                    )}
                  </div>

                  {/* Step Label */}
                  <div className="ml-3 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isCurrent ? "text-primary-600" : "text-gray-500"
                      )}
                    >
                      {step.title}
                    </p>
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-px bg-gray-300 mx-6" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Current Step Content */}
        <div className="mb-6">
          {getCurrentStepComponent()}
        </div>
      </div>
    </div>
  )
} 