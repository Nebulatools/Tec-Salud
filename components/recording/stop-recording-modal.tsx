"use client"

import { useRecording } from "@/hooks/use-recording"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, FileText, Briefcase, CheckCircle, AlertCircle } from "lucide-react"

/**
 * Modal that appears when recording is stopped
 * Shows transcription progress and offers navigation options
 */
export default function StopRecordingModal() {
  const {
    showStopModal,
    setShowStopModal,
    status,
    session,
    transcript,
    error,
    navigateToConsultation,
    continueWorking,
    formatTimeVerbose,
    elapsedTime,
  } = useRecording()

  const isProcessing = status === "processing"
  const isCompleted = status === "completed"
  const hasError = status === "error"

  return (
    <Dialog open={showStopModal} onOpenChange={setShowStopModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                Procesando grabación...
              </>
            ) : isCompleted ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Grabación completada
              </>
            ) : hasError ? (
              <>
                <AlertCircle className="h-5 w-5 text-red-500" />
                Error en transcripción
              </>
            ) : (
              "Grabación detenida"
            )}
          </DialogTitle>
          <DialogDescription>
            {isProcessing ? (
              "Estamos transcribiendo el audio con inteligencia artificial. Esto puede tomar unos momentos."
            ) : isCompleted ? (
              <>
                La transcripción está lista para{" "}
                <strong>{session?.patientName}</strong>. ¿Quieres revisar y
                editar la transcripción ahora?
              </>
            ) : hasError ? (
              <>
                {error || "Hubo un error procesando el audio, pero puedes continuar manualmente."}
              </>
            ) : (
              "¿Qué deseas hacer ahora?"
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Recording duration */}
        {elapsedTime > 0 && (
          <div className="text-sm text-gray-500">
            Duración de la grabación: <strong>{formatTimeVerbose(elapsedTime)}</strong>
          </div>
        )}

        {/* Transcript preview if available */}
        {transcript && (
          <div className="max-h-32 overflow-y-auto rounded-lg bg-gray-50 p-3 text-sm text-gray-700 border">
            <p className="font-medium text-xs text-gray-500 mb-1">
              Vista previa ({transcript.num_speakers} speaker{transcript.num_speakers !== 1 ? "s" : ""} detectado{transcript.num_speakers !== 1 ? "s" : ""}):
            </p>
            <p className="line-clamp-4">
              {transcript.fullText.substring(0, 300)}
              {transcript.fullText.length > 300 && "..."}
            </p>
          </div>
        )}

        {/* Error details */}
        {hasError && error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={continueWorking}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            <Briefcase className="h-4 w-4" />
            Seguir trabajando
          </Button>
          <Button
            onClick={navigateToConsultation}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
          >
            <FileText className="h-4 w-4" />
            {isProcessing ? "Procesando..." : "Continuar consulta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
