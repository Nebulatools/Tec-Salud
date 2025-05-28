"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mic } from "lucide-react"
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

  const handleStartRecording = () => {
    setIsRecording(true)
    onRecordingStateChange(true)
    // Here you would start actual recording
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    onRecordingStateChange(false)
    
    // Simulate processing and complete this step
    const recordingData = {
      duration: recordingTime,
      startedAt: new Date().toISOString(),
      processedTranscript: "Grabación procesada automáticamente...",
    }
    
    onComplete(recordingData)
    
    // Auto-navigate to verification step after a short delay
    setTimeout(() => {
      onNavigateToStep(3)
    }, 1000)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card>
      <CardContent className="p-8">
        <div className="text-center space-y-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Presione el botón para iniciar la grabación de la consulta
            </h2>
            <p className="text-gray-600">
              La grabación se procesará automáticamente
            </p>
          </div>

          {/* Recording Button */}
          <div className="flex justify-center">
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={cn(
                "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
                isRecording
                  ? "bg-red-500 hover:bg-red-600 animate-pulse"
                  : "bg-primary-400 hover:bg-primary-500"
              )}
            >
              <Mic className="w-12 h-12 text-white" />
            </button>
          </div>

          {/* Recording Status */}
          {isRecording && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-mono font-bold text-gray-900 mb-2">
                  {formatTime(recordingTime)}
                </div>
                <p className="text-sm text-gray-600">
                  Grabación en progreso...
                </p>
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-red-600 font-medium">REC</span>
              </div>
            </div>
          )}

          {!isRecording && recordingTime === 0 && (
            <div className="space-y-4">
              <p className="text-gray-500">
                Haga clic en el micrófono para comenzar la grabación
              </p>
              
              {/* Navigation to other steps while not recording */}
              <div className="flex justify-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => onNavigateToStep(1)}
                  className="text-gray-600"
                >
                  ← Volver al resumen
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => onNavigateToStep(3)}
                  className="text-gray-600"
                >
                  Ir a verificación →
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 