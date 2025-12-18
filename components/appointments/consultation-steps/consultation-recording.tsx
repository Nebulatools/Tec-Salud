"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Mic, Square, Loader2, FileText, Pause, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRecording } from "@/hooks/use-recording"
import { AudioDeviceSelector } from "@/components/recording/audio-device-selector"

interface ConsultationRecordingProps {
  appointmentId: string
  patientId?: string
  patientName?: string
  consultationData: any
  onComplete: (data: any) => void
  onDataUpdate?: (updater: any) => void
  onRecordingStateChange: (isRecording: boolean) => void
  onNavigateToStep: (step: number) => void
}

export default function ConsultationRecording({
  appointmentId,
  patientId: propPatientId,
  patientName: propPatientName,
  consultationData,
  onComplete,
  onDataUpdate,
  onRecordingStateChange,
  onNavigateToStep
}: ConsultationRecordingProps) {
  // Global recording state from context
  const {
    status: globalStatus,
    session: globalSession,
    elapsedTime: globalElapsedTime,
    transcript: globalTranscript,
    audioBlob: globalAudioBlob,
    error: globalError,
    isRecordingActive,
    startRecording: globalStartRecording,
    stopRecording: globalStopRecording,
    pauseRecording: globalPauseRecording,
    resumeRecording: globalResumeRecording,
    formatTime,
  } = useRecording()

  // Local state for manual mode and UI
  const [transcript, setTranscript] = useState("")
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualTranscriptMode, setManualTranscriptMode] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  interface ExtractionPreview {
    patient: { id: string; name: string }
    symptoms: string[]
    diagnoses: string[]
    medications: { name: string; dose?: string; route?: string; frequency?: string; duration?: string }[]
    speakerRoles: Record<string, string>
  }

  const [extractionPreview, setExtractionPreview] = useState<ExtractionPreview | null>(null)

  // Function to replace speaker tags with descriptive names
  const formatTranscriptWithSpeakers = (text: string, roles: Record<string, string>): string => {
    if (!text || !roles || Object.keys(roles).length === 0) return text

    let formatted = text
    // Replace various speaker formats: [Speaker 0], [Speaker 1], SPEAKER_0, etc.
    for (const [speakerId, role] of Object.entries(roles)) {
      // Handle "SPEAKER_0" format
      const regex1 = new RegExp(`\\[?${speakerId}\\]?:?`, 'gi')
      // Handle "[Speaker 0]" format
      const speakerNum = speakerId.replace(/\D/g, '')
      const regex2 = new RegExp(`\\[Speaker\\s*${speakerNum}\\]:?`, 'gi')

      formatted = formatted.replace(regex1, `[${role}]:`)
      formatted = formatted.replace(regex2, `[${role}]:`)
    }
    return formatted
  }

  const lastParsedRef = useRef<string>("")

  // Derive recording state from global context
  const isRecording = globalSession?.appointmentId === appointmentId && isRecordingActive
  const isPaused = globalStatus === "paused" && globalSession?.appointmentId === appointmentId
  const recordingTime = (isRecording || isPaused) ? globalElapsedTime : 0

  // Sync global transcript to local state when completed
  useEffect(() => {
    if (globalTranscript && globalSession?.appointmentId === appointmentId && !manualTranscriptMode) {
      setTranscript(globalTranscript.fullText)
      setIsTranscribing(false)
    }
  }, [globalTranscript, globalSession?.appointmentId, appointmentId, manualTranscriptMode])

  // Sync global error to local state
  useEffect(() => {
    if (globalError && globalSession?.appointmentId === appointmentId) {
      setError(globalError)
    }
  }, [globalError, globalSession?.appointmentId, appointmentId])

  // Sync processing state
  useEffect(() => {
    if (globalStatus === "processing" && globalSession?.appointmentId === appointmentId) {
      setIsTranscribing(true)
    }
  }, [globalStatus, globalSession?.appointmentId, appointmentId])

  // Notify parent of recording state changes
  useEffect(() => {
    onRecordingStateChange(isRecording)
  }, [isRecording, onRecordingStateChange])

  const handleStartRecording = async () => {
    try {
      setError(null)
      setTranscript("")

      // Get patient info from props or consultationData
      const patientId = propPatientId || consultationData?.patientInfo?.id || ""
      const patientName = propPatientName || consultationData?.patientInfo?.nombre ||
        `${consultationData?.patientInfo?.first_name || ""} ${consultationData?.patientInfo?.last_name || ""}`.trim() ||
        "Paciente"

      // Start recording using global context
      await globalStartRecording({
        appointmentId,
        patientId,
        patientName,
        startedAt: new Date(),
      })

    } catch (err) {
      console.error("Error starting recording:", err)
      setError("Error al acceder al micrófono. Verifica los permisos.")
    }
  }

  const handleStopRecording = async () => {
    if (isRecording) {
      await globalStopRecording()
    }
  }

  // Helper: trigger parse + persist silently
  const triggerParseAndPersist = async (text: string) => {
    try {
      if (!text?.trim()) return
      if (lastParsedRef.current === text) return
      setIsParsing(true)
      setParseError(null)

      const patientId = consultationData?.patientInfo?.id || ""
      const payload = { transcript: text, appointmentId, patientId }
      const res = await fetch('/api/parse-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        throw new Error(`Parse error ${res.status}`)
      }
      const parsed = await res.json() as {
        patient?: { id?: string; name?: string }
        symptoms?: unknown[]
        diagnoses?: unknown[]
        medications?: unknown[]
        speakerRoles?: Record<string, unknown>
      }

      // Sanitize speakerRoles
      const safeSpeakerRoles: Record<string, string> = {}
      if (parsed?.speakerRoles && typeof parsed.speakerRoles === 'object') {
        for (const [key, value] of Object.entries(parsed.speakerRoles)) {
          if (typeof value === 'string') {
            safeSpeakerRoles[key] = value
          }
        }
      }

      // Basic sanitize
      const safe: ExtractionPreview = {
        patient: {
          id: typeof parsed?.patient?.id === 'string' ? parsed.patient.id : (patientId || ''),
          name: typeof parsed?.patient?.name === 'string' ? parsed.patient.name : ''
        },
        symptoms: Array.isArray(parsed?.symptoms) ? parsed.symptoms.filter((s): s is string => typeof s === 'string') : [],
        diagnoses: Array.isArray(parsed?.diagnoses) ? parsed.diagnoses.filter((s): s is string => typeof s === 'string') : [],
        medications: Array.isArray(parsed?.medications)
          ? parsed.medications.map((m: unknown) => {
              const med = m as { name?: string; dose?: string; route?: string; frequency?: string; duration?: string }
              return {
                name: typeof med?.name === 'string' ? med.name : '',
                dose: typeof med?.dose === 'string' ? med.dose : '',
                route: typeof med?.route === 'string' ? med.route : '',
                frequency: typeof med?.frequency === 'string' ? med.frequency : '',
                duration: typeof med?.duration === 'string' ? med.duration : ''
              }
            })
          : [],
        speakerRoles: safeSpeakerRoles
      }

      setExtractionPreview(safe)
      lastParsedRef.current = text

      // Push into shared state (non-blocking)
      if (typeof onDataUpdate === 'function') {
        try {
          onDataUpdate((prev: ConsultationData) => ({ ...prev, extractionPreview: safe }))
        } catch {
          // Ignore update errors
        }
      }

      // Persist silently
      const saveRes = await fetch('/api/clinical-extractions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, patientId, extraction: safe })
      })
      if (!saveRes.ok) {
        console.warn('Failed to save clinical extraction')
      }
    } catch {
      setParseError('No se pudo procesar la transcripción automáticamente.')
    } finally {
      setIsParsing(false)
    }
  }

  // Note: transcribeAudio is now handled by the global recording context
  // The context calls /api/transcribe-diarized and updates globalTranscript

  // Auto-parse when transcription finished (audio flow)
  useEffect(() => {
    if (!isTranscribing && transcript && !manualTranscriptMode) {
      const t = setTimeout(() => triggerParseAndPersist(transcript), 150)
      return () => clearTimeout(t)
    }
  }, [isTranscribing, transcript, manualTranscriptMode])

  // Debounced auto-parse for manual transcript
  useEffect(() => {
    if (manualTranscriptMode && transcript && transcript.trim().length > 10) {
      const t = setTimeout(() => triggerParseAndPersist(transcript), 1000)
      return () => clearTimeout(t)
    }
  }, [manualTranscriptMode, transcript])

  const handleComplete = () => {
    const recordingData = {
      duration: recordingTime,
      startedAt: new Date().toISOString(),
      processedTranscript: transcript || "No se pudo transcribir el audio.",
      audioBlob: globalAudioBlob, // From global recording context
      isManualTranscript: manualTranscriptMode
    }
    
    onComplete(recordingData)
    
    setTimeout(() => {
      onNavigateToStep(3)
    }, 1000)
  }

  const handleManualTranscript = () => {
    setManualTranscriptMode(true)
    setTranscript("")
  }

  // Note: formatTime is now provided by the useRecording hook

  return (
    <Card>
      <CardContent className="p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
              {isRecording ? "Grabación en Progreso" : 
               isTranscribing ? "Transcribiendo Audio..." : 
               "Iniciar Grabación de Consulta"}
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              {isRecording ? "Presione el botón para detener. Puede navegar a otras páginas sin perder la grabación." :
               isTranscribing ? "Transcribiendo con IA..." :
               "La grabación se transcribirá automáticamente con IA."}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              disabled={isTranscribing}
              className={cn(
                "w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
                isRecording
                  ? "bg-red-500 hover:bg-red-600 animate-pulse"
                  : isTranscribing
                  ? "bg-blue-500 cursor-not-allowed"
                  : "bg-orange-500 hover:bg-orange-600"
              )}
            >
              {isTranscribing ? (
                <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-white animate-spin" />
              ) : isRecording ? (
                <Square className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              ) : (
                <Mic className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              )}
            </button>
          </div>

          {(isRecording || isPaused) && (
            <div className="text-center space-y-4">
              <div className="text-2xl sm:text-3xl font-mono font-bold text-gray-900 mb-1">
                {formatTime(recordingTime)}
              </div>
              <div className="flex items-center justify-center gap-2 text-sm font-medium">
                <div className={cn(
                  "w-2 h-2 sm:w-3 sm:h-3 rounded-full",
                  isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
                )}></div>
                <span className={isPaused ? "text-yellow-600" : "text-red-600"}>
                  {isPaused ? "PAUSADO" : "REC"}
                </span>
              </div>

              {/* Botón de Pausar/Reanudar */}
              <Button
                variant="outline"
                onClick={isPaused ? globalResumeRecording : globalPauseRecording}
                className="flex items-center gap-2"
              >
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4" />
                    Reanudar
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4" />
                    Pausar
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Textarea para grabación/transcripción automática */}
          {(transcript || isTranscribing) && !manualTranscriptMode && (
            <div className="space-y-4">
              {/* Speaker roles indicator */}
              {extractionPreview?.speakerRoles && Object.keys(extractionPreview.speakerRoles).length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
                  <span className="text-gray-500">Participantes detectados:</span>
                  {Object.entries(extractionPreview.speakerRoles).map(([speakerId, role]) => (
                    <span
                      key={speakerId}
                      className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        role === "Doctor" ? "bg-blue-100 text-blue-700" :
                        role === "Paciente" ? "bg-green-100 text-green-700" :
                        "bg-purple-100 text-purple-700"
                      )}
                    >
                      {role}
                    </span>
                  ))}
                </div>
              )}

              <Textarea
                value={extractionPreview?.speakerRoles
                  ? formatTranscriptWithSpeakers(transcript, extractionPreview.speakerRoles)
                  : transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={isTranscribing ? "Transcribiendo..." : "La transcripción aparecerá aquí o puedes escribir manualmente..."}
                className="min-h-[150px] sm:min-h-[200px] text-sm border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                disabled={isTranscribing}
              />

              {extractionPreview && (
                <div className="rounded-lg border border-gray-200 p-4 text-left bg-white">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Extracción clínica (preview)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Paciente</p>
                      <p className="text-gray-900">{extractionPreview.patient.name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Síntomas/Signos</p>
                      <p className="text-gray-900">{extractionPreview.symptoms.length ? extractionPreview.symptoms.join(', ') : '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Diagnósticos</p>
                      <p className="text-gray-900">{extractionPreview.diagnoses.length ? extractionPreview.diagnoses.join(', ') : '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Tratamiento/Medicación</p>
                      {extractionPreview.medications.length ? (
                        <ul className="list-disc pl-5 text-gray-900 space-y-1">
                          {extractionPreview.medications.map((m, idx) => (
                            <li key={idx}>{m.name}{m.dose?` • ${m.dose}`:''}{m.route?` • ${m.route}`:''}{m.frequency?` • ${m.frequency}`:''}{m.duration?` • ${m.duration}`:''}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-900">—</p>
                      )}
                    </div>
                  </div>
                  {(isParsing || parseError) && (
                    <div className="mt-2 text-xs text-gray-500">
                      {isParsing ? 'Procesando extracción...' : parseError}
                    </div>
                  )}
                </div>
              )}

              {transcript && !isTranscribing && (
                <Button 
                  onClick={handleComplete}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  Continuar con esta transcripción →
                </Button>
              )}
            </div>
          )}

          {/* Opciones iniciales - solo si no hay transcript Y no está en modo manual */}
          {!isRecording && !isTranscribing && !transcript && !manualTranscriptMode && (
            <div className="space-y-6 pt-4">
              {/* Selector de dispositivo de audio */}
              <AudioDeviceSelector className="max-w-sm mx-auto" />

              <p className="text-gray-500 text-sm">
                Seleccione una opción para continuar:
              </p>

              {/* Opciones de transcripción */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Button 
                  variant="outline"
                  onClick={handleStartRecording}
                  className="h-32 flex flex-col gap-3 border-2 border-primary-200 hover:border-primary-400"
                >
                  <Mic className="h-8 w-8 text-primary-500" />
                  <div className="text-center">
                    <span className="text-base font-medium block">Grabar Audio</span>
                    <span className="text-xs text-gray-500">Transcripción automática con IA</span>
                  </div>
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleManualTranscript}
                  className="h-32 flex flex-col gap-3 border-2 border-green-200 hover:border-green-400"
                >
                  <FileText className="h-8 w-8 text-green-500" />
                  <div className="text-center">
                    <span className="text-base font-medium block">Escribir Manual</span>
                    <span className="text-xs text-gray-500">Copiar/pegar transcript existente</span>
                  </div>
                </Button>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => onNavigateToStep(1)}
                  className="text-gray-600 w-full sm:w-auto"
                >
                  ← Resumen Paciente
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => onNavigateToStep(3)}
                  className="text-gray-600 w-full sm:w-auto"
                >
                  Saltar Grabación →
                </Button>
              </div>
            </div>
          )}

          {/* Modo manual de transcript */}
          {manualTranscriptMode && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Transcripción Manual
                </h3>
                <p className="text-gray-600 text-sm">
                  Escriba o pegue la transcripción de la consulta médica
                </p>
              </div>
              
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Escriba aquí la transcripción de la consulta médica..."
                className="min-h-[200px] text-sm border-gray-300 focus:ring-primary-500 focus:border-primary-500"
              />

              {extractionPreview && (
                <div className="rounded-lg border border-gray-200 p-4 text-left bg-white">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Extracción clínica (preview)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Paciente</p>
                      <p className="text-gray-900">{extractionPreview.patient.name || '—'} <span className="text-gray-400">({extractionPreview.patient.id || '—'})</span></p>
                    </div>
                    <div>
                      <p className="text-gray-500">Síntomas/Signos</p>
                      <p className="text-gray-900">{extractionPreview.symptoms.length ? extractionPreview.symptoms.join(', ') : '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Diagnósticos</p>
                      <p className="text-gray-900">{extractionPreview.diagnoses.length ? extractionPreview.diagnoses.join(', ') : '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Tratamiento/Medicación</p>
                      {extractionPreview.medications.length ? (
                        <ul className="list-disc pl-5 text-gray-900 space-y-1">
                          {extractionPreview.medications.map((m, idx) => (
                            <li key={idx}>{m.name}{m.dose?` • ${m.dose}`:''}{m.route?` • ${m.route}`:''}{m.frequency?` • ${m.frequency}`:''}{m.duration?` • ${m.duration}`:''}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-900">—</p>
                      )}
                    </div>
                  </div>
                  {(isParsing || parseError) && (
                    <div className="mt-2 text-xs text-gray-500">
                      {isParsing ? 'Procesando extracción...' : parseError}
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex gap-3">
                <Button 
                  onClick={() => {
                    setManualTranscriptMode(false)
                    setTranscript("")
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleComplete}
                  disabled={!transcript.trim()}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                >
                  Continuar con esta transcripción →
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 
