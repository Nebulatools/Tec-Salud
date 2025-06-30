"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Mic, Square, Loader2, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConsultationRecordingProps {
  appointmentId: string
  consultationData: any
  onComplete: (data: any) => void
  onRecordingStateChange: (isRecording: boolean) => void
  onNavigateToStep: (step: number) => void
}

export default function ConsultationRecording({ 
  appointmentId, 
  consultationData, 
  onComplete, 
  onRecordingStateChange,
  onNavigateToStep 
}: ConsultationRecordingProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [transcript, setTranscript] = useState("")
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [manualTranscriptMode, setManualTranscriptMode] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording])

  const handleStartRecording = async () => {
    try {
      setError(null)
      setTranscript("")
      chunksRef.current = []

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      })
      
      streamRef.current = stream

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
        }
        
        // Start transcription
        await transcribeAudio(audioBlob)
      }

      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      setRecordingTime(0)
      onRecordingStateChange(true)

    } catch (err) {
      console.error("Error starting recording:", err)
      setError("Error al acceder al micrófono. Verifica los permisos.")
    }
  }

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      onRecordingStateChange(false)
    }
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('language', 'es-MX')

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Error en transcripción: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success && data.transcript) {
        setTranscript(data.transcript)
      } else {
        throw new Error(data.error || 'Error desconocido en transcripción')
      }

    } catch (err) {
      console.error("Transcription error:", err)
      setError(`Error de transcripción: ${err instanceof Error ? err.message : 'Error desconocido'}`)
      setTranscript("Error al transcribir el audio. Puedes escribir manualmente.")
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleComplete = () => {
    const recordingData = {
      duration: recordingTime,
      startedAt: new Date().toISOString(),
      processedTranscript: transcript || "No se pudo transcribir el audio.",
      audioBlob: audioBlob, // Optional: keep for future use
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

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
              {isRecording ? "Presione el botón para detener." : 
               isTranscribing ? "Procesando con Gemini AI..." :
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

          {isRecording && (
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-mono font-bold text-gray-900 mb-1">
                {formatTime(recordingTime)}
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-red-600 font-medium">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-pulse"></div>
                REC
              </div>
            </div>
          )}

          {/* Textarea para grabación/transcripción automática */}
          {(transcript || isTranscribing) && !manualTranscriptMode && (
            <div className="space-y-4">
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={isTranscribing ? "Transcribiendo..." : "La transcripción aparecerá aquí o puedes escribir manualmente..."}
                className="min-h-[150px] sm:min-h-[200px] text-sm border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                disabled={isTranscribing}
              />

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