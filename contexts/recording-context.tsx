"use client"

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react"
import type {
  RecordingContextValue,
  RecordingState,
  RecordingSession,
  DiarizedTranscript,
} from "@/types/recording"

const initialState: RecordingState = {
  status: "idle",
  session: null,
  elapsedTime: 0,
  audioBlob: null,
  transcript: null,
  error: null,
}

const RecordingContext = createContext<RecordingContextValue | null>(null)

/**
 * Transcribes audio using Replicate whisper-diarization API
 */
async function transcribeWithDiarization(
  audioBlob: Blob
): Promise<DiarizedTranscript> {
  const formData = new FormData()
  formData.append("audio", audioBlob, "recording.webm")

  const response = await fetch("/api/transcribe-diarized", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Transcription failed: ${response.statusText}`)
  }

  return response.json()
}

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  // State
  const [state, setState] = useState<RecordingState>(initialState)
  const [isPillExpanded, setIsPillExpanded] = useState(false)
  const [showStopModal, setShowStopModal] = useState(false)

  // Refs for non-serializable objects (MediaRecorder, Blobs)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Timer effect - counts elapsed seconds while recording
  useEffect(() => {
    if (state.status === "recording") {
      timerRef.current = setInterval(() => {
        setState((prev) => ({ ...prev, elapsedTime: prev.elapsedTime + 1 }))
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [state.status])

  // Cleanup on unmount - stop all tracks
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const startRecording = useCallback(async (session: RecordingSession) => {
    try {
      setState((prev) => ({ ...prev, status: "recording", error: null }))
      chunksRef.current = []

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(1000) // Collect data every second

      setState((prev) => ({
        ...prev,
        status: "recording",
        session,
        elapsedTime: 0,
        audioBlob: null,
        transcript: null,
      }))
    } catch (err) {
      console.error("Error starting recording:", err)
      setState((prev) => ({
        ...prev,
        status: "error",
        error: "Error al acceder al micrófono. Verifica los permisos.",
      }))
    }
  }, [])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause()
      setState((prev) => ({ ...prev, status: "paused" }))
    }
  }, [])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume()
      setState((prev) => ({ ...prev, status: "recording" }))
    }
  }, [])

  const stopRecording = useCallback(async () => {
    return new Promise<void>((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve()
        return
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" })

        // Stop all tracks to release microphone
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
        }

        setState((prev) => ({
          ...prev,
          status: "processing",
          audioBlob,
        }))

        // Show modal immediately
        setShowStopModal(true)

        // Trigger transcription in background
        try {
          const transcript = await transcribeWithDiarization(audioBlob)
          setState((prev) => ({
            ...prev,
            status: "completed",
            transcript,
          }))
        } catch (err) {
          console.error("Transcription error:", err)
          setState((prev) => ({
            ...prev,
            status: "error",
            error:
              err instanceof Error
                ? err.message
                : "Error en la transcripción. Puedes continuar manualmente.",
          }))
        }

        resolve()
      }

      mediaRecorderRef.current.stop()
    })
  }, [])

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
    chunksRef.current = []
    setState(initialState)
    setShowStopModal(false)
  }, [])

  const clearRecording = useCallback(() => {
    chunksRef.current = []
    setState(initialState)
    setShowStopModal(false)
  }, [])

  const togglePillExpanded = useCallback(() => {
    setIsPillExpanded((prev) => !prev)
  }, [])

  const value: RecordingContextValue = {
    ...state,
    isRecordingActive: state.status === "recording" || state.status === "paused",
    isPillExpanded,
    togglePillExpanded,
    showStopModal,
    setShowStopModal,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    clearRecording,
  }

  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  )
}

export function useRecordingContext() {
  const context = useContext(RecordingContext)
  if (!context) {
    throw new Error("useRecordingContext must be used within RecordingProvider")
  }
  return context
}
