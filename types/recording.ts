/**
 * Types for the global recording system
 * Supports persistent audio recording across navigation with Replicate whisper-diarization
 */

export type RecordingStatus =
  | 'idle'
  | 'recording'
  | 'paused'
  | 'processing'
  | 'completed'
  | 'error'

/**
 * Context for the current recording session
 * Contains appointment and patient info for reference
 */
export interface RecordingSession {
  appointmentId: string
  patientId: string
  patientName: string
  startedAt: Date
}

/**
 * Word-level data from Replicate whisper-diarization
 * Includes confidence score (probability) for transcription validation
 */
export interface TranscriptWord {
  word: string
  probability: number // 0-1 confidence score from Whisper
  start?: number      // Start timestamp in seconds (if available)
  end?: number        // End timestamp in seconds (if available)
}

/**
 * A single segment from the diarized transcript
 * Speaker is kept as raw SPEAKER_00, SPEAKER_01, etc.
 */
export interface TranscriptSegment {
  start: number
  end: number
  text: string
  speaker: string // SPEAKER_00, SPEAKER_01, etc.
  words?: TranscriptWord[] // Word-level data with confidence scores
}

/**
 * Complete diarized transcript from Replicate
 */
export interface DiarizedTranscript {
  language: string
  num_speakers: number
  segments: TranscriptSegment[]
  fullText: string // Concatenated text with speaker labels
}

/**
 * Global recording state
 */
export interface RecordingState {
  status: RecordingStatus
  session: RecordingSession | null
  elapsedTime: number // seconds
  audioBlob: Blob | null
  transcript: DiarizedTranscript | null
  error: string | null
}

/**
 * Actions available in the recording context
 */
export interface RecordingActions {
  startRecording: (session: RecordingSession) => Promise<void>
  pauseRecording: () => void
  resumeRecording: () => void
  stopRecording: () => Promise<void>
  cancelRecording: () => void
  clearRecording: () => void
}

/**
 * Represents an audio input device (microphone)
 */
export interface AudioDevice {
  deviceId: string
  label: string
  groupId: string
}

/**
 * Permission status for microphone access
 */
export type AudioPermissionStatus = 'prompt' | 'granted' | 'denied' | 'unknown'

/**
 * State for audio device management
 */
export interface AudioDeviceState {
  devices: AudioDevice[]
  selectedDeviceId: string | null
  permissionStatus: AudioPermissionStatus
  isEnumerating: boolean
  error: string | null
}

/**
 * Actions for audio device management
 */
export interface AudioDeviceActions {
  enumerateDevices: () => Promise<void>
  selectDevice: (deviceId: string) => void
  requestPermission: () => Promise<boolean>
  clearDeviceError: () => void
}

/**
 * Complete context value including state, actions, and UI state
 */
export interface RecordingContextValue extends RecordingState, RecordingActions {
  isRecordingActive: boolean
  isPillExpanded: boolean
  togglePillExpanded: () => void
  showStopModal: boolean
  setShowStopModal: (show: boolean) => void
  // Consultation page tracking - when true, modal is skipped on stop
  isOnConsultationPage: boolean
  setIsOnConsultationPage: (isOn: boolean) => void
  // Audio device management
  audioDevices: AudioDeviceState
  deviceActions: AudioDeviceActions
}
