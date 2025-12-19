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
  AudioDeviceState,
  AudioDeviceActions,
  AudioDevice,
} from "@/types/recording"

const PREFERRED_DEVICE_KEY = 'ezyai-preferred-audio-device'

const initialState: RecordingState = {
  status: "idle",
  session: null,
  elapsedTime: 0,
  audioBlob: null,
  transcript: null,
  error: null,
}

const initialAudioDeviceState: AudioDeviceState = {
  devices: [],
  selectedDeviceId: null,
  permissionStatus: 'unknown',
  isEnumerating: false,
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
  const [isOnConsultationPage, setIsOnConsultationPage] = useState(false)
  const [audioDevices, setAudioDevices] = useState<AudioDeviceState>(initialAudioDeviceState)

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

  // === Audio Device Management ===

  /**
   * Enumerate available audio input devices
   */
  const enumerateDevices = useCallback(async () => {
    setAudioDevices(prev => ({ ...prev, isEnumerating: true, error: null }))

    try {
      // Check if API is available
      if (!navigator.mediaDevices?.enumerateDevices) {
        throw new Error('API de dispositivos no disponible en este navegador')
      }

      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs: AudioDevice[] = allDevices
        .filter(d => d.kind === 'audioinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Micrófono ${index + 1}`,
          groupId: d.groupId,
        }))

      // Load saved preference from localStorage
      let savedDeviceId: string | null = null
      try {
        savedDeviceId = localStorage.getItem(PREFERRED_DEVICE_KEY)
      } catch {
        // localStorage may not be available
      }

      // Validate saved device still exists
      const deviceExists = audioInputs.some(d => d.deviceId === savedDeviceId)
      const selectedId = deviceExists ? savedDeviceId : (audioInputs[0]?.deviceId || null)

      // Determine permission status based on labels
      // If labels are empty/generic, permission hasn't been granted yet
      const hasRealLabels = audioInputs.some(d => d.label && !d.label.startsWith('Micrófono '))

      setAudioDevices(prev => ({
        ...prev,
        devices: audioInputs,
        selectedDeviceId: selectedId,
        permissionStatus: hasRealLabels ? 'granted' : (audioInputs.length > 0 ? 'prompt' : 'unknown'),
        isEnumerating: false,
      }))

      // If saved device no longer exists, clear from storage
      if (savedDeviceId && !deviceExists) {
        try {
          localStorage.removeItem(PREFERRED_DEVICE_KEY)
        } catch {
          // Ignore localStorage errors
        }
      }
    } catch (err) {
      setAudioDevices(prev => ({
        ...prev,
        isEnumerating: false,
        error: err instanceof Error ? err.message : 'Error al enumerar dispositivos',
      }))
    }
  }, [])

  /**
   * Select an audio device and persist to localStorage
   */
  const selectDevice = useCallback((deviceId: string) => {
    setAudioDevices(prev => ({
      ...prev,
      selectedDeviceId: deviceId,
    }))
    try {
      localStorage.setItem(PREFERRED_DEVICE_KEY, deviceId)
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  /**
   * Request microphone permission and re-enumerate devices
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      // Request permission by getting a stream, then immediately stop it
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())

      setAudioDevices(prev => ({ ...prev, permissionStatus: 'granted' }))

      // Re-enumerate to get proper labels
      await enumerateDevices()
      return true
    } catch (err) {
      const error = err as DOMException
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setAudioDevices(prev => ({
          ...prev,
          permissionStatus: 'denied',
          error: 'Permiso de micrófono denegado. Habilítalo en la configuración del navegador.',
        }))
      } else {
        setAudioDevices(prev => ({
          ...prev,
          error: 'Error al solicitar permisos de micrófono',
        }))
      }
      return false
    }
  }, [enumerateDevices])

  /**
   * Clear device error
   */
  const clearDeviceError = useCallback(() => {
    setAudioDevices(prev => ({ ...prev, error: null }))
  }, [])

  // Listen for device changes (plugging/unplugging)
  useEffect(() => {
    const handleDeviceChange = () => {
      enumerateDevices()
    }

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange)

    // Initial enumeration
    enumerateDevices()

    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange)
    }
  }, [enumerateDevices])

  const startRecording = useCallback(async (session: RecordingSession) => {
    try {
      setState((prev) => ({ ...prev, status: "recording", error: null }))
      chunksRef.current = []

      // Build audio constraints with selected device
      const audioConstraints: MediaTrackConstraints = {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      }

      // Add deviceId if a specific device is selected
      if (audioDevices.selectedDeviceId) {
        audioConstraints.deviceId = { exact: audioDevices.selectedDeviceId }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
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

      // Handle specific device errors
      const error = err as DOMException
      let errorMessage = "Error al acceder al micrófono. Verifica los permisos."

      if (error.name === 'OverconstrainedError') {
        // Selected device no longer available
        errorMessage = "El micrófono seleccionado ya no está disponible. Por favor selecciona otro."
        // Clear the invalid device selection
        setAudioDevices(prev => ({ ...prev, selectedDeviceId: null }))
        try {
          localStorage.removeItem(PREFERRED_DEVICE_KEY)
        } catch {
          // Ignore localStorage errors
        }
        // Re-enumerate devices
        enumerateDevices()
      } else if (error.name === 'NotAllowedError') {
        errorMessage = "Permiso de micrófono denegado. Habilítalo en la configuración del navegador."
        setAudioDevices(prev => ({ ...prev, permissionStatus: 'denied' }))
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No se encontró ningún micrófono. Conecta uno y vuelve a intentar."
      }

      setState((prev) => ({
        ...prev,
        status: "error",
        error: errorMessage,
      }))
    }
  }, [audioDevices.selectedDeviceId, enumerateDevices])

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

        // Show modal only if NOT on consultation page (user navigated away)
        // When on consultation page, TranscriptionValidator handles the flow directly
        if (!isOnConsultationPage) {
          setShowStopModal(true)
        }

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
  }, [isOnConsultationPage])

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

  // Build device actions object
  const deviceActions: AudioDeviceActions = {
    enumerateDevices,
    selectDevice,
    requestPermission,
    clearDeviceError,
  }

  const value: RecordingContextValue = {
    ...state,
    isRecordingActive: state.status === "recording" || state.status === "paused",
    isPillExpanded,
    togglePillExpanded,
    showStopModal,
    setShowStopModal,
    isOnConsultationPage,
    setIsOnConsultationPage,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    clearRecording,
    // Audio device management
    audioDevices,
    deviceActions,
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
