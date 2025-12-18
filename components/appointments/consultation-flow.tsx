"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Check, FileText, Mic, Shield, Download, Bot } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"

import PatientSummary from "./consultation-steps/patient-summary"
import ConsultationRecording from "./consultation-steps/consultation-recording"
import ComplianceAssistant from "../consultation-steps/compliance-assistant"
import ReportVerification from "./consultation-steps/report-verification"
import FinalReport from "./consultation-steps/final-report"
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

  const { toast } = useToast()
  const searchParams = useSearchParams()
  const stepParam = searchParams.get('step')

  // Initialize step from URL param if present (e.g., ?step=2 from recording pill navigation)
  const [currentStep, setCurrentStep] = useState(() => {
    const urlStep = stepParam ? parseInt(stepParam, 10) : 1
    return urlStep >= 1 && urlStep <= 5 ? urlStep : 1
  })
  // If starting from a step > 1 (via URL param), mark previous steps as completed
  const [completedSteps, setCompletedSteps] = useState<number[]>(() => {
    const urlStep = stepParam ? parseInt(stepParam, 10) : 1
    if (urlStep > 1 && urlStep <= 5) {
      // Mark all steps before the current one as completed
      return Array.from({ length: urlStep - 1 }, (_, i) => i + 1)
    }
    return []
  })
  const [isRecording, setIsRecording] = useState(false)
  const [consultationData, setConsultationData] = useState<ConsultationData>({
    patientInfo: { id: patientId },
    recordingData: null,
    transcript: undefined,
    reportData: null,
    finalReport: null,
  })
  const [draftId, setDraftId] = useState<string | null>(null) // Para tracking del borrador único

  // Handle URL step param changes (e.g., when navigating from recording pill)
  useEffect(() => {
    if (stepParam) {
      const urlStep = parseInt(stepParam, 10)
      if (urlStep >= 1 && urlStep <= 5 && urlStep !== currentStep) {
        setCurrentStep(urlStep)
        // Mark previous steps as completed if navigating forward
        if (urlStep > 1) {
          setCompletedSteps(prev => {
            const stepsToComplete = Array.from({ length: urlStep - 1 }, (_, i) => i + 1)
            const merged = [...new Set([...prev, ...stepsToComplete])]
            return merged.sort((a, b) => a - b)
          })
        }
      }
    }
  }, [stepParam]) // Only run when stepParam changes

  // Cargar datos guardados desde Supabase
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        console.log('=== CARGANDO DATOS DESDE SUPABASE ===')
        console.log('AppointmentId:', appointmentId)
        
        const { data: report, error: reportError } = await supabase
          .from('medical_reports')
          .select('*')
          .eq('appointment_id', appointmentId)
          .eq('patient_id', patientId)
          .maybeSingle() // Filtrar también por paciente para evitar mezclas

        console.log('Error en búsqueda:', reportError)
        console.log('Reporte encontrado:', report)

        if (report) {
          console.log('=== CARGANDO PROGRESO GUARDADO ===')

          setDraftId(report.id) // Guardar ID del reporte existente

          // Reconstruir consultationData base
          const restoredData: ConsultationData = {
            patientInfo: { id: patientId },
            recordingData: null,
            transcript: report.original_transcript || undefined,
            reportData: {
              reporte: report.content || '',
              aiGeneratedReport: report.content || '',
              complianceData: null,
              suggestions: Array.isArray(report.ai_suggestions) ? report.ai_suggestions : [],
              isCompliant: String(report.compliance_status || '').includes('compliant'),
              fecha: (report as any).report_date || new Date().toISOString().split('T')[0]
            },
            finalReport: null
          }

          // Decidir a qué paso regresar
          let stepToResume = 1
          let completed: number[] = []

          // Si se guardó estado explícito dentro de ai_suggestions como objeto (caso legacy)
          if (report.ai_suggestions && typeof report.ai_suggestions === 'object' && (report.ai_suggestions as any).currentStep) {
            stepToResume = (report.ai_suggestions as any).currentStep || 1
            completed = (report.ai_suggestions as any).completedSteps || []
            setConsultationData((report.ai_suggestions as any).consultationData || restoredData)
          } else {
            // Inferencia por contenido/estatus
            const hasTranscript = !!report.original_transcript
            const hasContent = !!report.content
            const isFinal = String(report.report_type || '').includes('FINAL')
            const isCompliant = String(report.compliance_status || '').includes('compliant')

            if (isFinal && isCompliant && hasContent) {
              stepToResume = 5
              completed = [1, 2, 3, 4]
              setConsultationData(restoredData)
            } else if (hasContent) {
              // Hay reporte IA pero no marcado como final/compliant: continuar en Asistente IA
              stepToResume = 3
              completed = [1, 2]
              setConsultationData(restoredData)
            } else if (hasTranscript) {
              // Solo transcript: volver al paso de transcripción para continuar
              stepToResume = 2
              completed = [1]
              setConsultationData(restoredData)
            } else {
              stepToResume = 1
              completed = []
              setConsultationData(restoredData)
            }
          }

          // Solo cambiar el step si NO hay un URL param explícito
          // (si hay ?step=2 desde "Continuar consulta", respetar eso)
          if (!stepParam) {
            setCurrentStep(stepToResume)
            setCompletedSteps(completed)

            toast({
              title: "Progreso cargado",
              description: `Reanudando en el paso ${stepToResume}`,
            })
          } else {
            console.log('URL step param presente, no sobreescribir step:', stepParam)
          }
        } else {
          console.log('No se encontró reporte, empezando desde el inicio')
        }
      } catch (error) {
        console.error('Error cargando datos guardados:', error)
      }
    }

    loadSavedData()
  }, [appointmentId, toast])

  // Guardar progreso automáticamente en Supabase
  useEffect(() => {
    const saveProgress = async () => {
      if (!appointmentId || !patientId) return

      try {
        // Obtener doctor_id de la cita
        const { data: appointment } = await supabase
          .from('appointments')
          .select('doctor_id')
          .eq('id', appointmentId)
          .single()

        if (!appointment) {
          console.error('No se encontró la cita')
          return
        }

        console.log('=== GUARDANDO EN SUPABASE ===')
        console.log('Paso actual:', currentStep)
        console.log('¿Tiene reporte IA?:', consultationData?.reportData?.aiGeneratedReport ? 'SÍ' : 'NO')

        const isFinalStep = currentStep >= 5
        let reportType: 'BORRADOR' | 'FINAL' = isFinalStep ? 'FINAL' : 'BORRADOR'

        const dataToSave = {
          appointment_id: appointmentId,
          patient_id: patientId,
          doctor_id: appointment.doctor_id,
          report_type: reportType,
          title: `Consulta - ${patientName} - ${new Date().toLocaleDateString()}`,
          // Solo guardar contenido si existe un reporte IA generado
          content: consultationData?.reportData?.aiGeneratedReport ?? null,
          original_transcript: consultationData?.recordingData?.processedTranscript || consultationData?.transcript || '',
          ai_suggestions: consultationData?.reportData?.suggestions || [],
          compliance_status: consultationData?.reportData?.isCompliant ? 'compliant' : 'non-compliant'
        }

        let result
        if (draftId) {
          // Actualizar reporte existente usando el ID guardado
          console.log('Actualizando reporte existente con ID:', draftId)
          try {
            const { data: existing } = await supabase
              .from('medical_reports')
              .select('report_type')
              .eq('id', draftId)
              .single()
            if (existing?.report_type === 'FINAL') {
              (dataToSave as any).report_type = 'FINAL'
            }
          } catch {}
          result = await supabase
            .from('medical_reports')
            .update(dataToSave)
            .eq('id', draftId)
        } else {
          // Verificar si ya existe un reporte para esta cita antes de crear uno nuevo
          const { data: existingReport } = await supabase
            .from('medical_reports')
            .select('id, report_type')
            .eq('appointment_id', appointmentId)
            .maybeSingle()

          if (existingReport) {
            // Ya existe, actualizar
            console.log('Reporte encontrado, actualizando:', existingReport.id)
            setDraftId(existingReport.id)
            if (existingReport.report_type === 'FINAL') {
              (dataToSave as any).report_type = 'FINAL'
            }
            result = await supabase
              .from('medical_reports')
              .update(dataToSave)
              .eq('id', existingReport.id)
          } else {
            // Crear nuevo reporte
            console.log('Creando nuevo reporte')
            result = await supabase
              .from('medical_reports')
              .insert(dataToSave)
              .select('id')
              .single()
            
            if (result.data) {
              setDraftId(result.data.id)
            }
          }
        }
        
        // Silenciosamente manejar el resultado sin mostrar logs
      } catch (error) {
        // Silenciosamente manejar errores
      }
    }

    // Guardar después de 2 segundos de cambios
    const timeoutId = setTimeout(saveProgress, 2000)
    return () => clearTimeout(timeoutId)
  }, [appointmentId, patientId, patientName, currentStep, completedSteps, consultationData])

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
                        ? "bg-orange-500 border-orange-500 text-white"
                        : isCurrent
                        ? "bg-orange-500 border-orange-500 text-white"
                        : "bg-white border-gray-300 text-gray-500",
                      isClickable && "cursor-pointer hover:border-orange-300"
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
                        isCurrent ? "text-orange-600" : "text-gray-500"
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
