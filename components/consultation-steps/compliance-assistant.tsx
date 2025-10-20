'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, AlertCircle, Sparkles, Stethoscope, FileText, Bot, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { ConsultationData } from '@/types/consultation'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
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
  const { user } = useAuth()
  const [report, setReport] = useState(consultationData.reportData?.reporte || '')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [complianceData, setComplianceData] = useState<ComplianceResponse | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const suggestionsFetchingRef = useRef(false)
  const lastSuggestionsForRef = useRef<string>('')
  const [doctorResponses, setDoctorResponses] = useState<Record<string, string>>({})
  const [isCompliant, setIsCompliant] = useState(false)
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState<string>('')
  const [previousMissingCount, setPreviousMissingCount] = useState<number | null>(null)
  const [completedFields, setCompletedFields] = useState<Set<string>>(new Set())
  const [expandedField, setExpandedField] = useState<string | null>(null)
  const [allQuestions, setAllQuestions] = useState<string[]>([]) // Mantener todas las preguntas vistas
  const [doctorName, setDoctorName] = useState<string>('')
  const [patientProfile, setPatientProfile] = useState<any | null>(null)
  // Guards to avoid repeated analysis/suggestions
  const analysisInFlightRef = useRef(false)
  const lastAnalyzedForRef = useRef<string>('')

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

  // Cargar el perfil del paciente si no viene completo en consultationData
  useEffect(() => {
    const loadPatient = async () => {
      try {
        const pid = (consultationData as any)?.patientInfo?.id
        const p = (consultationData as any)?.patientInfo
        if (!pid) return
        // Si faltan campos clave, intentar traerlos de BD
        if (!p?.first_name || !p?.last_name || !p?.date_of_birth || !p?.gender) {
          const { data } = await supabase
            .from('patients')
            .select('first_name,last_name,date_of_birth,gender,phone,email,address,emergency_contact_name,emergency_contact_phone,medical_history,allergies,current_medications')
            .eq('id', pid)
            .maybeSingle()
          if (data) setPatientProfile(data)
        } else {
          setPatientProfile(p)
        }
      } catch {}
    }
    loadPatient()
  }, [consultationData?.patientInfo?.id])

  // Ruta de reutilización del reporte IA: normaliza una sola vez
  useEffect(() => {
    const baseReport = consultationData.reportData?.aiGeneratedReport
    if (!baseReport) return
    const p = (patientProfile || (consultationData as any)?.patientInfo) || {}
    const safeDoctor = (doctorName || '').trim()
    let fixed = baseReport
    if (p?.gender) {
      fixed = fixed.replace(/\*\s*\*\*Sexo:\*\*\s*\[Faltante\]/i, `*  **Sexo:** ${String(p.gender)}`)
      if (!/\*\s*\*\*Sexo:\*\*/i.test(fixed) && /\*\s*\*\*Edad:\*\*/i.test(fixed)) {
        fixed = fixed.replace(/(\*\s*\*\*Edad:\*\*.*\n)/i, `$1*  **Sexo:** ${String(p.gender)}\n`)
      }
    }
    if (safeDoctor) {
      if (/\*\s*\*\*Nombre del médico tratante:\*\*/i.test(fixed)) {
        fixed = fixed.replace(/(\*\s*\*\*Nombre del médico tratante:\*\*\s*).*/i, `$1${safeDoctor}`)
      } else if (/\*\s*\*\*Fecha y hora de consulta:\*\*/i.test(fixed)) {
        fixed = fixed.replace(/(\*\s*\*\*Fecha y hora de consulta:\*\*.*\n)/i, `$1*  **Nombre del médico tratante:** ${safeDoctor}\n`)
      }
    }
    setReport(fixed)
    setComplianceData(consultationData.reportData?.complianceData || null)
    setAllQuestions(consultationData.reportData?.complianceData?.questionsForDoctor || [])
    setIsCompliant(consultationData.reportData?.isCompliant || false)
    const currentSuggestions = consultationData.reportData?.suggestions || []
    setSuggestions(currentSuggestions)
    if (!currentSuggestions || currentSuggestions.length === 0) ensureSuggestions(fixed)
    // Persistir normalización solo si cambió
    if (fixed !== baseReport) {
      onDataUpdate({
        ...consultationData,
        reportData: { ...consultationData.reportData, aiGeneratedReport: fixed, reporte: fixed }
      })
    }
  }, [consultationData.reportData?.aiGeneratedReport, doctorName, patientProfile])

  // Ruta de análisis inicial con gating estricto.
  useEffect(() => {
    const transcript = consultationData.transcript || consultationData.recordingData?.processedTranscript
    const profile = (patientProfile || (consultationData as any)?.patientInfo) || {}
    const genderKnown = Boolean(profile?.gender)
    const doctorKnown = Boolean(doctorName)
    if (!transcript || !genderKnown || !doctorKnown) return
    if (consultationData.reportData?.aiGeneratedReport) return
    if (analysisInFlightRef.current) return
    if (lastAnalyzedForRef.current === transcript) return

    analysisInFlightRef.current = true
    performInitialAnalysis()
      .finally(() => {
        analysisInFlightRef.current = false
        lastAnalyzedForRef.current = transcript
      })
  }, [consultationData.transcript, consultationData.recordingData?.processedTranscript, patientProfile?.gender, doctorName])

  // Single flight suggestions fetcher with de-duplication
  const ensureSuggestions = useCallback(async (reportText: string) => {
    try {
      if (!reportText) return
      if (suggestionsFetchingRef.current) return
      // Avoid refetching for the same exact report
      if (lastSuggestionsForRef.current === reportText && (suggestions?.length ?? 0) > 0) return

      // fetch with timeout to avoid long hangs
      const fetchWithTimeout = async (input: RequestInfo, init: RequestInit = {}, timeoutMs = 20000) => {
        const ac = new AbortController()
        const id = setTimeout(() => ac.abort(), timeoutMs)
        try {
          return await fetch(input, { ...init, signal: ac.signal })
        } finally { clearTimeout(id) }
      }

      suggestionsFetchingRef.current = true
      setSuggestionsLoading(true)
      const resp = await fetchWithTimeout('/api/get-clinical-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportText })
      }, 20000)
      if (resp.ok) {
        const json: SuggestionsResponse = await resp.json()
        const list = Array.isArray(json?.suggestions) ? json.suggestions.filter(s => typeof s === 'string') : []
        setSuggestions(list)
        lastSuggestionsForRef.current = reportText
        // Persist in consultation data
        onDataUpdate({
          ...consultationData,
          reportData: {
            ...consultationData.reportData,
            aiGeneratedReport: reportText,
            reporte: reportText,
            suggestions: list,
          }
        })
      }
    } catch (e) {
      console.warn('Suggestions fetch failed:', e)
    } finally {
      suggestionsFetchingRef.current = false
      setSuggestionsLoading(false)
    }
  }, [consultationData, onDataUpdate, suggestions?.length])

  const performInitialAnalysis = useCallback(async () => {
    setLoading(true)
    try {
      const ensureIdentification = (
        reportMd: string,
        patient: any,
        appt?: any,
        doctorName?: string
      ): string => {
        let out = reportMd || ''
        const name = `${patient?.first_name ?? ''} ${patient?.last_name ?? ''}`.trim()
        const dob = patient?.date_of_birth
        const gender = patient?.gender
        const age = (() => {
          if (!dob) return ''
          const d = new Date(dob)
          if (Number.isNaN(d.getTime())) return ''
          const today = new Date()
          let a = today.getFullYear() - d.getFullYear()
          const m = today.getMonth() - d.getMonth()
          if (m < 0 || (m === 0 && today.getDate() < d.getDate())) a--
          return String(a)
        })()

        // Reemplazos directos de [Faltante]
        if (gender) {
          out = out.replace(/\*\s*\*\*Sexo:\*\*\s*\[Faltante\]/i, `*  **Sexo:** ${gender}`)
        }
        if (name) {
          out = out.replace(/\*\s*\*\*Nombre del paciente:\*\*\s*\[Faltante\]/i, `*  **Nombre del paciente:** ${name}`)
        }
        if (age) {
          out = out.replace(/\*\s*\*\*Edad:\*\*\s*\[Faltante\]/i, `*  **Edad:** ${age} años`)
        }

        // Si no existe línea de Sexo, intentar insertarla tras Edad
        if (gender && !/\*\s*\*\*Sexo:\*\*/i.test(out)) {
          out = out.replace(/(\*\s*\*\*Edad:\*\*.*\n)/i, `$1*  **Sexo:** ${gender}\n`)
        }

        // Normalizar nombre del médico tratante forzando el del usuario autenticado
        if (doctorName && doctorName.trim()) {
          const safeDoctor = doctorName.trim()
          if (/\*\s*\*\*Nombre del médico tratante:\*\*/i.test(out)) {
            // Reemplazar cualquier valor existente por el correcto
            out = out.replace(/(\*\s*\*\*Nombre del médico tratante:\*\*\s*).*/i, `$1${safeDoctor}`)
          } else {
            // Insertar tras la fecha y hora si no existe
            if (/\*\s*\*\*Fecha y hora de consulta:\*\*/i.test(out)) {
              out = out.replace(/(\*\s*\*\*Fecha y hora de consulta:\*\*.*\n)/i, `$1*  **Nombre del médico tratante:** ${safeDoctor}\n`)
            } else {
              // Insertar al final del bloque de identificación como fallback
              out += `\n*  **Nombre del médico tratante:** ${safeDoctor}`
            }
          }
        }
        return out
      }
      // Helper to compute age from DOB
      const ageFromDob = (dob?: string) => {
        if (!dob) return ''
        const d = new Date(dob)
        if (Number.isNaN(d.getTime())) return ''
        const today = new Date()
        let age = today.getFullYear() - d.getFullYear()
        const m = today.getMonth() - d.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--
        return String(age)
      }

      // Prefill known answers from DB/UI for compliance
      const answers: { question: string, answer: string }[] = []
      const appt = (consultationData as any)?.appointmentDetails
      const patient = (patientProfile || (consultationData as any)?.patientInfo) || {}

      if (appt?.appointment_date && appt?.start_time) {
        answers.push({
          question: '¿Cuál fue la fecha y hora exacta de esta consulta?',
          answer: `${appt.appointment_date} ${appt.start_time}`
        })
      }
      if (doctorName) {
        answers.push({
          question: '¿Cuál es el nombre completo del médico tratante?',
          answer: doctorName
        })
      }
      if (patient?.first_name || patient?.last_name) {
        const fullName = `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim()
        if (fullName) {
          answers.push({
            question: '¿Cuál es el nombre completo de la paciente?',
            answer: fullName
          })
        }
      }
      if (patient?.date_of_birth) {
        const age = ageFromDob(patient.date_of_birth)
        if (age) {
          answers.push({
            question: '¿Cuál es la edad de la paciente?',
            answer: `${age}`
          })
        }
      }
      if (patient?.gender) {
        answers.push({
          question: '¿Cuál es el sexo/ género del paciente?',
          answer: String(patient.gender)
        })
      }
      if (patient?.phone) {
        answers.push({ question: '¿Cuál es el teléfono del paciente?', answer: String(patient.phone) })
      }
      if (patient?.address) {
        answers.push({ question: '¿Cuál es la dirección del paciente?', answer: String(patient.address) })
      }
      if (patient?.allergies) {
        answers.push({ question: 'Alergias documentadas del paciente', answer: String(patient.allergies) })
      }
      if (patient?.current_medications) {
        answers.push({ question: 'Medicamentos actuales del paciente', answer: String(patient.current_medications) })
      }
      if (patient?.medical_history) {
        answers.push({ question: 'Antecedentes médicos relevantes del paciente', answer: String(patient.medical_history) })
      }

      // Call compliance API
      const transcript = consultationData.transcript || consultationData.recordingData?.processedTranscript
      const complianceResponse = await fetch('/api/enrich-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcript,
          additionalInfo: answers
        }),
      })

      if (!complianceResponse.ok) {
        throw new Error('Failed to analyze compliance')
      }

      const complianceResult: ComplianceResponse = await complianceResponse.json()
      const fixedReport = ensureIdentification(
        complianceResult.improvedReport,
        patient,
        appt,
        doctorName
      )
      // Filtrar preguntas/missing que ya conocemos por expediente
      const p = (patientProfile || (consultationData as any)?.patientInfo) || {}
      const hasName = Boolean((p.first_name || p.last_name))
      const hasAge = Boolean(p.date_of_birth)
      const hasGender = Boolean(p.gender)
      const filterKnown = (items?: string[]) => {
        if (!Array.isArray(items)) return []
        return items.filter((q) => {
          const s = (q || '').toLowerCase()
          if (hasName && (s.includes('nombre del paciente') || s.includes('nombre de la paciente'))) return false
          if (hasAge && s.includes('edad')) return false
          if (hasGender && (s.includes('sexo') || s.includes('género'))) return false
          return true
        })
      }
      const cleanedMissing = filterKnown(complianceResult.missingInformation)
      const cleanedQuestions = filterKnown(complianceResult.questionsForDoctor)
      setComplianceData({ ...complianceResult, missingInformation: cleanedMissing, questionsForDoctor: cleanedQuestions })
      setReport(fixedReport)
      setIsCompliant(cleanedMissing.length === 0)
      setPreviousMissingCount(cleanedMissing.length || 0)
      
      // Mantener un registro de todas las preguntas vistas
      const existingQuestions = allQuestions.length > 0 ? allQuestions : []
      const newQuestions = [...existingQuestions]
      cleanedQuestions?.forEach(q => {
        if (!newQuestions.includes(q)) {
          newQuestions.push(q)
        }
      })
      setAllQuestions(newQuestions)

      // Generar sugerencias en un solo lugar y una sola vez por texto
      await ensureSuggestions(fixedReport)

      // Auto-marcar como completado cuando se termine el análisis inicial
      const reportData = {
        ...consultationData.reportData,
        reporte: fixedReport,
        aiGeneratedReport: fixedReport,
        complianceData: complianceResult,
        suggestions: suggestions || [],
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
      // Silenciosamente manejar error
      // Mostrar error al usuario
      alert(`Error al analizar la transcripción: ${error instanceof Error ? error.message : 'Error desconocido'}. Por favor, inténtalo de nuevo.`)
    } finally {
      setLoading(false)
    }
  }, [consultationData, allQuestions])

  const handleRevalidate = async () => {
    setValidating(true)
    try {
      // Baseline known answers (patient, appt, doctor) again so the model no los considere faltantes
      const baseline: { question: string, answer: string }[] = []
      const appt = (consultationData as any)?.appointmentDetails
      const patient = (patientProfile || (consultationData as any)?.patientInfo) || {}
      const ageFromDob = (dob?: string) => {
        if (!dob) return ''
        const d = new Date(dob)
        if (Number.isNaN(d.getTime())) return ''
        const today = new Date()
        let age = today.getFullYear() - d.getFullYear()
        const m = today.getMonth() - d.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--
        return String(age)
      }
      if (appt?.appointment_date && appt?.start_time) baseline.push({ question: '¿Cuál fue la fecha y hora exacta de esta consulta?', answer: `${appt.appointment_date} ${appt.start_time}` })
      if (doctorName) baseline.push({ question: '¿Cuál es el nombre completo del médico tratante?', answer: doctorName })
      if (patient?.first_name || patient?.last_name) baseline.push({ question: '¿Cuál es el nombre completo de la paciente?', answer: `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim() })
      if (patient?.date_of_birth) {
        const age = ageFromDob(patient.date_of_birth)
        if (age) baseline.push({ question: '¿Cuál es la edad de la paciente?', answer: `${age}` })
      }
      if (patient?.gender) baseline.push({ question: '¿Cuál es el sexo/ género del paciente?', answer: String(patient.gender) })
      if (patient?.phone) baseline.push({ question: '¿Cuál es el teléfono del paciente?', answer: String(patient.phone) })
      if (patient?.address) baseline.push({ question: '¿Cuál es la dirección del paciente?', answer: String(patient.address) })
      if (patient?.allergies) baseline.push({ question: 'Alergias documentadas del paciente', answer: String(patient.allergies) })
      if (patient?.current_medications) baseline.push({ question: 'Medicamentos actuales del paciente', answer: String(patient.current_medications) })
      if (patient?.medical_history) baseline.push({ question: 'Antecedentes médicos relevantes del paciente', answer: String(patient.medical_history) })

      // Filtrar solo las respuestas con contenido
      const answeredQuestions = Object.entries(doctorResponses)
        .filter(([_, answer]) => answer?.trim())
        .map(([question, answer]) => ({ question, answer }))
      
      // Si no hay respuestas, salir temprano
      if (answeredQuestions.length === 0) {
        setValidating(false)
        return
      }

      // Llamar a la API con las respuestas adicionales usando el nuevo formato
      const complianceResponse = await fetch('/api/enrich-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: consultationData.transcript || consultationData.recordingData?.processedTranscript || '',
          additionalInfo: [...baseline, ...answeredQuestions]
        }),
      })

      if (!complianceResponse.ok) {
        throw new Error('Failed to revalidate compliance')
      }

      const complianceResult: ComplianceResponse = await complianceResponse.json()
      
      // Control de consistencia: NUNCA debe aumentar el número de campos faltantes
      let finalComplianceResult = complianceResult
      
      // Control silencioso de consistencia
      if (previousMissingCount !== null && complianceResult.missingInformation.length > previousMissingCount) {
        // FORZAR mantener los campos anteriores - no permitir aumento
        if (complianceData) {
          finalComplianceResult = {
            improvedReport: complianceResult.improvedReport, // Usar el nuevo reporte
            missingInformation: complianceData.missingInformation, // Mantener campos anteriores
            questionsForDoctor: complianceData.questionsForDoctor // Mantener preguntas anteriores
          }
        }
      }
      
      // Actualizar campos completados
      const newCompletedFields = new Set(completedFields)
      
      // Marcar como completadas las preguntas que ya no están en la lista de faltantes
      answeredQuestions.forEach(({ question }) => {
        if (!finalComplianceResult.questionsForDoctor.includes(question)) {
          newCompletedFields.add(question)
        }
      })
      
      // Mantener un registro de todas las preguntas vistas
      const newAllQuestions = [...allQuestions]
      finalComplianceResult.questionsForDoctor.forEach(q => {
        if (!newAllQuestions.includes(q)) {
          newAllQuestions.push(q)
        }
      })
      
      setCompletedFields(newCompletedFields)
      setAllQuestions(newAllQuestions)
      
      // Inyectar demográficos si el modelo todavía los marca como [Faltante]
      let fixedFinalReport = finalComplianceResult.improvedReport
        .replace(/\*\s*\*\*Sexo:\*\*\s*\[Faltante\]/i, patient?.gender ? `*  **Sexo:** ${String(patient.gender)}` : '*  **Sexo:** [Faltante]')
        .replace(/\*\s*\*\*Nombre del paciente:\*\*\s*\[Faltante\]/i, (patient?.first_name || patient?.last_name) ? `*  **Nombre del paciente:** ${(patient.first_name ?? '') + ' ' + (patient.last_name ?? '')}`.trim() : '*  **Nombre del paciente:** [Faltante]')
      // Normalizar médico tratante
      if (doctorName && doctorName.trim()) {
        const safeDoctor = doctorName.trim()
        if (/\*\s*\*\*Nombre del médico tratante:\*\*/i.test(fixedFinalReport)) {
          fixedFinalReport = fixedFinalReport.replace(/(\*\s*\*\*Nombre del médico tratante:\*\*\s*).*/i, `$1${safeDoctor}`)
        } else if (/\*\s*\*\*Fecha y hora de consulta:\*\*/i.test(fixedFinalReport)) {
          fixedFinalReport = fixedFinalReport.replace(/(\*\s*\*\*Fecha y hora de consulta:\*\*.*\n)/i, `$1*  **Nombre del médico tratante:** ${safeDoctor}\n`)
        } else {
          fixedFinalReport += `\n*  **Nombre del médico tratante:** ${safeDoctor}`
        }
      }
      const finalComplianceResultPatched = {
        ...finalComplianceResult,
        improvedReport: fixedFinalReport
      }
      setComplianceData(finalComplianceResultPatched)
      setReport(fixedFinalReport)
      setIsCompliant(finalComplianceResultPatched.missingInformation.length === 0)
      setPreviousMissingCount(finalComplianceResultPatched.missingInformation.length)

      // Sugerencias con single-flight
      await ensureSuggestions(finalComplianceResultPatched.improvedReport)

      // NO borrar las respuestas, mantenerlas visibles
      
      // Actualizar los datos guardados con la nueva validación
      const reportData = {
        ...consultationData.reportData,
        reporte: finalComplianceResultPatched.improvedReport,
        aiGeneratedReport: finalComplianceResultPatched.improvedReport,
        complianceData: finalComplianceResultPatched,
        suggestions: suggestions,
        isCompliant: complianceResult.missingInformation.length === 0,
      }

      onDataUpdate({
        ...consultationData,
        reportData: reportData
      })

    } catch (error) {
      // Silenciosamente manejar error de revalidación
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
          
          {complianceData && complianceData.missingInformation && complianceData.missingInformation.length > 0 ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle className="h-6 w-6 text-amber-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-base font-semibold text-amber-800">
                      Faltan {complianceData.missingInformation?.length || 0} campos requeridos
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      Complete la información faltante para mejorar el cumplimiento
                    </p>
                  </div>
                </div>
                
                {/* Progress indicator */}
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Campos completados:</span>
                  <span className="font-semibold">
                    {completedFields.size} / {(complianceData.missingInformation?.length || 0) + completedFields.size}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(completedFields.size / ((complianceData.missingInformation?.length || 0) + completedFields.size || 1)) * 100}%` 
                    }}
                  />
                </div>
              </div>
              
              <ScrollArea className="h-[400px]">
                <div className="space-y-3 pr-2">
                  {/* Mostrar todas las preguntas: completadas y pendientes */}
                  {(allQuestions.length > 0 ? allQuestions : complianceData.questionsForDoctor || []).map((question, index) => {
                    const isCompleted = completedFields.has(question)
                    const isPending = complianceData.questionsForDoctor?.includes(question) || false
                    const isExpanded = expandedField === question
                    const hasAnswer = doctorResponses[question]?.trim()
                    
                    // Si no está ni completada ni pendiente, skip
                    if (!isCompleted && !isPending) return null
                    
                    return (
                      <div 
                        key={`${question}-${index}`} 
                        className={cn(
                          "rounded-lg border transition-all",
                          isCompleted ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"
                        )}
                      >
                        <div 
                          className="p-3 cursor-pointer"
                          onClick={() => setExpandedField(isExpanded ? null : question)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-2 flex-1">
                              {isCompleted ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                              )}
                              <p className={cn(
                                "text-sm font-medium",
                                isCompleted ? "text-green-800 line-through" : "text-gray-800"
                              )}>
                                {question}
                              </p>
                            </div>
                            <button className="ml-2">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              )}
                            </button>
                          </div>
                          {hasAnswer && !isExpanded && (
                            <p className="text-xs text-gray-600 mt-1 ml-6 truncate">
                              {doctorResponses[question]}
                            </p>
                          )}
                        </div>
                        
                        {isExpanded && (
                          <div className="px-3 pb-3">
                            <Textarea
                              placeholder="Escriba la respuesta del médico..."
                              value={doctorResponses[question] || ''}
                              onChange={(e) => setDoctorResponses({
                                ...doctorResponses,
                                [question]: e.target.value
                              })}
                              className="min-h-[80px] bg-white mt-2"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
              
              <Button
                onClick={handleRevalidate}
                disabled={validating || Object.keys(doctorResponses).filter(k => doctorResponses[k]?.trim()).length === 0}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
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
              
              {Object.keys(doctorResponses).filter(k => doctorResponses[k]?.trim()).length === 0 && (
                <p className="text-xs text-gray-500 text-center">
                  Responda al menos una pregunta para revalidar
                </p>
              )}
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

        {/* Sugerencias clínicas de IA */}
        {(suggestionsLoading || (suggestions && suggestions.length > 0)) && (
          <Card className="p-4 bg-blue-50 border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
              <Bot className="h-4 w-4" /> Sugerencias clínicas de IA
            </h4>
            {suggestionsLoading ? (
              <div className="mt-3 space-y-2">
                <div className="h-3 bg-blue-100 rounded animate-pulse" />
                <div className="h-3 bg-blue-100 rounded animate-pulse w-11/12" />
                <div className="h-3 bg-blue-100 rounded animate-pulse w-10/12" />
              </div>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-blue-900">
                {suggestions.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {/* Action Buttons */}
      <div className="space-y-3">
          <Button
            onClick={handleNext}
            size="lg"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
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
