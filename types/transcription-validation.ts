/**
 * Types for the transcription validation system (human-in-the-loop)
 * Used in Step 2 of the consultation wizard to verify low-confidence words
 */

import { TranscriptSegment, TranscriptWord } from './recording'

/**
 * Medical term categories for classification
 */
export type MedicalCategory =
  | 'medication'   // medicamentos, fármacos
  | 'diagnosis'    // diagnósticos, enfermedades
  | 'symptom'      // síntomas, signos clínicos
  | 'anatomy'      // partes del cuerpo, órganos
  | 'procedure'    // procedimientos médicos
  | 'pain_verb'    // verbos de dolor (duele, pica, arde)
  | 'intensity'    // intensidad (mucho, severo, leve)
  | 'temporal'     // temporal (crónico, agudo)
  | 'emotional'    // emocional (ansiedad, estrés)
  | 'vital_sign'   // signos vitales
  | 'other'

/**
 * A word flagged for review due to low confidence score
 */
export interface FlaggedWord {
  id: string                    // Unique identifier: "segmentIndex-wordIndex"
  word: string                  // Original transcribed word
  correctedWord?: string        // User's correction (if made)
  probability: number           // Confidence score (0-1)
  timestamp: number             // Start time in seconds
  endTimestamp?: number         // End time in seconds
  speaker: string               // SPEAKER_00, SPEAKER_01, etc.
  segmentIndex: number          // Index in segments array
  wordIndex: number             // Index in segment.words array
  isMedicalTerm: boolean        // AI-detected medical terminology
  medicalCategory?: MedicalCategory  // Category of the medical term
  isReviewed: boolean           // Has user reviewed this word
  isAccepted: boolean           // User accepted (original or corrected)
}

/**
 * Confidence thresholds for highlighting words
 */
export interface ConfidenceThresholds {
  critical: number    // Below this = red highlight (default: 0.4)
  warning: number     // Below this = yellow highlight (default: 0.7)
}

/**
 * State for the validation system
 */
export interface ValidationState {
  flaggedWords: FlaggedWord[]
  currentWordId: string | null        // Currently selected word
  audioCurrentTime: number            // Current playback position in seconds
  isPlaying: boolean
  reviewProgress: {
    total: number                     // Total flagged words
    reviewed: number                  // Words that have been reviewed
    medicalTotal: number              // Total flagged medical terms
    medicalReviewed: number           // Medical terms that have been reviewed
    percentage: number                // Overall progress percentage
  }
  thresholds: ConfidenceThresholds
  medicalTermsLoading: boolean        // Loading state for medical term detection
}

/**
 * Actions for the validation reducer
 */
export type ValidationAction =
  | { type: 'SET_FLAGGED_WORDS'; payload: FlaggedWord[] }
  | { type: 'SET_MEDICAL_TERMS'; payload: MedicalTermDetection[] }
  | { type: 'SELECT_WORD'; payload: string | null }
  | { type: 'UPDATE_WORD'; payload: { id: string; correctedWord: string } }
  | { type: 'ACCEPT_WORD'; payload: { id: string; correctedWord?: string } }
  | { type: 'SKIP_WORD'; payload: string }
  | { type: 'SET_AUDIO_TIME'; payload: number }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_MEDICAL_LOADING'; payload: boolean }
  | { type: 'BULK_ACCEPT_ALL' }
  | { type: 'RESET' }

/**
 * Medical term detection result from AI
 */
export interface MedicalTermDetection {
  word: string
  isMedical: boolean
  category?: MedicalCategory
  suggestedCorrection?: string
}

/**
 * Enhanced segment with word-level data for validation UI
 */
export interface EnhancedTranscriptSegment extends TranscriptSegment {
  words: TranscriptWord[]
}

/**
 * Enhanced diarized transcript with guaranteed word-level data
 */
export interface EnhancedDiarizedTranscript {
  language: string
  num_speakers: number
  segments: EnhancedTranscriptSegment[]
  fullText: string
}

/**
 * Clinical extraction preview data
 */
export interface ExtractionPreview {
  patient: { id: string; name: string }
  symptoms: string[]
  diagnoses: string[]
  medications: { name: string; dose?: string; route?: string; frequency?: string; duration?: string }[]
  speakerRoles?: Record<string, string>
}

/**
 * Props for the TranscriptionValidator component
 */
export interface TranscriptionValidatorProps {
  transcript: EnhancedDiarizedTranscript
  audioBlob: Blob | null
  speakerRoles?: Record<string, string>  // SPEAKER_00 -> "Doctor", etc.
  extractionPreview?: ExtractionPreview  // Clinical extraction data to display during validation
  onValidationComplete: (validatedTranscript: string, corrections: WordCorrection[]) => void
  onCancel?: () => void
}

/**
 * A word correction made by the user
 */
export interface WordCorrection {
  segmentIndex: number
  wordIndex: number
  originalWord: string
  correctedWord: string
  timestamp: number
}

/**
 * Default confidence thresholds
 */
export const DEFAULT_THRESHOLDS: ConfidenceThresholds = {
  critical: 0.4,   // Below 40% = red, critical review needed
  warning: 0.7,    // Below 70% = yellow, should review
}

/**
 * Helper to determine word highlight level based on confidence
 */
export type HighlightLevel = 'critical' | 'warning' | 'normal' | 'corrected'

export function getHighlightLevel(
  probability: number,
  thresholds: ConfidenceThresholds = DEFAULT_THRESHOLDS,
  isCorrected = false
): HighlightLevel {
  if (isCorrected) return 'corrected'
  if (probability < thresholds.critical) return 'critical'
  if (probability < thresholds.warning) return 'warning'
  return 'normal'
}

/**
 * Check if validation can proceed (all medical terms reviewed)
 */
export function canProceedWithValidation(flaggedWords: FlaggedWord[]): {
  canProceed: boolean
  unreviewedMedicalCount: number
  message?: string
} {
  const unreviewedMedical = flaggedWords.filter(
    w => w.isMedicalTerm && !w.isReviewed
  )

  return {
    canProceed: unreviewedMedical.length === 0,
    unreviewedMedicalCount: unreviewedMedical.length,
    message: unreviewedMedical.length > 0
      ? `Debes revisar ${unreviewedMedical.length} término${unreviewedMedical.length === 1 ? '' : 's'} médico${unreviewedMedical.length === 1 ? '' : 's'} antes de continuar`
      : undefined
  }
}
