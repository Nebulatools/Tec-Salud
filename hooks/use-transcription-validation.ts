'use client'

import { useReducer, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  ValidationState,
  ValidationAction,
  FlaggedWord,
  EnhancedDiarizedTranscript,
  MedicalTermDetection,
  DEFAULT_THRESHOLDS,
  WordCorrection,
  canProceedWithValidation,
} from '@/types/transcription-validation'
import { TranscriptWord } from '@/types/recording'

/**
 * Initial state for the validation system
 */
const initialState: ValidationState = {
  flaggedWords: [],
  currentWordId: null,
  audioCurrentTime: 0,
  isPlaying: false,
  reviewProgress: {
    total: 0,
    reviewed: 0,
    medicalTotal: 0,
    medicalReviewed: 0,
    percentage: 0,
  },
  thresholds: DEFAULT_THRESHOLDS,
  medicalTermsLoading: false,
}

/**
 * Calculate review progress from flagged words
 */
function calculateProgress(flaggedWords: FlaggedWord[]): ValidationState['reviewProgress'] {
  const total = flaggedWords.length
  const reviewed = flaggedWords.filter(w => w.isReviewed).length
  const medicalTotal = flaggedWords.filter(w => w.isMedicalTerm).length
  const medicalReviewed = flaggedWords.filter(w => w.isMedicalTerm && w.isReviewed).length

  return {
    total,
    reviewed,
    medicalTotal,
    medicalReviewed,
    percentage: total > 0 ? Math.round((reviewed / total) * 100) : 100,
  }
}

/**
 * Reducer for validation state management
 */
function validationReducer(state: ValidationState, action: ValidationAction): ValidationState {
  switch (action.type) {
    case 'SET_FLAGGED_WORDS': {
      const flaggedWords = action.payload
      return {
        ...state,
        flaggedWords,
        reviewProgress: calculateProgress(flaggedWords),
        // Don't select any word until medical detection completes
        // SET_MEDICAL_TERMS will select the first unreviewed medical word
        currentWordId: null,
      }
    }

    case 'SET_MEDICAL_TERMS': {
      const medicalMap = new Map(
        action.payload.map(m => [m.word.toLowerCase(), m])
      )

      const updatedWords = state.flaggedWords.map(word => {
        const medical = medicalMap.get(word.word.toLowerCase())
        const isMedical = medical?.isMedical ?? false

        return {
          ...word,
          isMedicalTerm: isMedical,
          medicalCategory: medical?.category,
          // Auto-accept non-medical words immediately - they don't need review
          isReviewed: isMedical ? word.isReviewed : true,
          isAccepted: isMedical ? word.isAccepted : true,
        }
      })

      // Select the first unreviewed medical word (if any)
      const firstUnreviewed = updatedWords.find(w => w.isMedicalTerm && !w.isReviewed)

      return {
        ...state,
        flaggedWords: updatedWords,
        reviewProgress: calculateProgress(updatedWords),
        currentWordId: firstUnreviewed?.id ?? null,
        medicalTermsLoading: false,
      }
    }

    case 'SELECT_WORD':
      return {
        ...state,
        currentWordId: action.payload,
      }

    case 'UPDATE_WORD': {
      const { id, correctedWord } = action.payload
      const updatedWords = state.flaggedWords.map(word =>
        word.id === id ? { ...word, correctedWord } : word
      )
      return {
        ...state,
        flaggedWords: updatedWords,
      }
    }

    case 'ACCEPT_WORD': {
      const { id, correctedWord } = action.payload
      const updatedWords = state.flaggedWords.map(word =>
        word.id === id
          ? {
              ...word,
              isReviewed: true,
              isAccepted: true,
              correctedWord: correctedWord ?? word.correctedWord,
            }
          : word
      )

      // Auto-select next unreviewed MEDICAL word
      const medicalWords = updatedWords.filter(w => w.isMedicalTerm)
      const currentIndex = medicalWords.findIndex(w => w.id === id)
      const nextUnreviewed = medicalWords.find(
        (w, i) => i > currentIndex && !w.isReviewed
      ) ?? medicalWords.find(w => !w.isReviewed)

      return {
        ...state,
        flaggedWords: updatedWords,
        reviewProgress: calculateProgress(updatedWords),
        currentWordId: nextUnreviewed?.id ?? null,
      }
    }

    case 'SKIP_WORD': {
      const updatedWords = state.flaggedWords.map(word =>
        word.id === action.payload
          ? { ...word, isReviewed: true, isAccepted: true }
          : word
      )

      // Auto-select next unreviewed MEDICAL word
      const medicalWords = updatedWords.filter(w => w.isMedicalTerm)
      const currentIndex = medicalWords.findIndex(w => w.id === action.payload)
      const nextUnreviewed = medicalWords.find(
        (w, i) => i > currentIndex && !w.isReviewed
      ) ?? medicalWords.find(w => !w.isReviewed)

      return {
        ...state,
        flaggedWords: updatedWords,
        reviewProgress: calculateProgress(updatedWords),
        currentWordId: nextUnreviewed?.id ?? null,
      }
    }

    case 'SET_AUDIO_TIME':
      return {
        ...state,
        audioCurrentTime: action.payload,
      }

    case 'SET_PLAYING':
      return {
        ...state,
        isPlaying: action.payload,
      }

    case 'SET_MEDICAL_LOADING':
      return {
        ...state,
        medicalTermsLoading: action.payload,
      }

    case 'BULK_ACCEPT_ALL': {
      const updatedWords = state.flaggedWords.map(word => ({
        ...word,
        isReviewed: true,
        isAccepted: true,
      }))
      return {
        ...state,
        flaggedWords: updatedWords,
        reviewProgress: calculateProgress(updatedWords),
        currentWordId: null,
      }
    }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

/**
 * Extract flagged words from transcript segments
 */
function extractFlaggedWords(
  segments: EnhancedDiarizedTranscript['segments'],
  thresholds = DEFAULT_THRESHOLDS
): FlaggedWord[] {
  const flaggedWords: FlaggedWord[] = []

  segments.forEach((segment, segmentIndex) => {
    if (!segment.words) return

    segment.words.forEach((word: TranscriptWord, wordIndex: number) => {
      // Only flag words below the warning threshold
      if (word.probability < thresholds.warning) {
        flaggedWords.push({
          id: `${segmentIndex}-${wordIndex}`,
          word: word.word,
          probability: word.probability,
          timestamp: word.start ?? segment.start,
          endTimestamp: word.end ?? segment.end,
          speaker: segment.speaker,
          segmentIndex,
          wordIndex,
          isMedicalTerm: false, // Will be set by medical term detection API
          isReviewed: false,
          isAccepted: false,
        })
      }
    })
  })

  // Sort by timestamp
  return flaggedWords.sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Hook for managing transcription validation state and audio playback
 */
export function useTranscriptionValidation(
  transcript: EnhancedDiarizedTranscript | null,
  audioBlob: Blob | null
) {
  const [state, dispatch] = useReducer(validationReducer, initialState)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Extract flagged words when transcript changes
  useEffect(() => {
    if (transcript?.segments) {
      const hasWordData = transcript.segments.some(s => s.words && s.words.length > 0)

      if (hasWordData) {
        const flagged = extractFlaggedWords(transcript.segments, state.thresholds)
        dispatch({ type: 'SET_FLAGGED_WORDS', payload: flagged })

        // Trigger medical term detection if there are flagged words
        if (flagged.length > 0) {
          detectMedicalTerms(flagged.map(w => w.word))
        }
      }
    }
  }, [transcript]) // eslint-disable-line react-hooks/exhaustive-deps

  // Create audio element from blob
  useEffect(() => {
    if (audioBlob) {
      // Clean up previous URL
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
      }

      const url = URL.createObjectURL(audioBlob)
      audioUrlRef.current = url
      audioRef.current = new Audio(url)

      // Update time during playback
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          dispatch({ type: 'SET_AUDIO_TIME', payload: audioRef.current.currentTime })
        }
      }

      audioRef.current.onended = () => {
        dispatch({ type: 'SET_PLAYING', payload: false })
      }

      return () => {
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current)
          audioUrlRef.current = null
        }
        if (playbackTimeoutRef.current) {
          clearTimeout(playbackTimeoutRef.current)
        }
      }
    }
  }, [audioBlob])

  /**
   * Detect medical terms using the API
   */
  const detectMedicalTerms = useCallback(async (words: string[]) => {
    if (words.length === 0) return

    dispatch({ type: 'SET_MEDICAL_LOADING', payload: true })

    try {
      const response = await fetch('/api/detect-medical-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: [...new Set(words)] }), // Deduplicate
      })

      if (response.ok) {
        const data: MedicalTermDetection[] = await response.json()
        dispatch({ type: 'SET_MEDICAL_TERMS', payload: data })
      } else {
        // Handle API errors (429 rate limit, 500 server error, etc.)
        // Mark all words as non-medical so user can proceed
        console.warn(`Medical term detection failed with status ${response.status}`)
        const fallbackData: MedicalTermDetection[] = words.map(word => ({
          word,
          isMedical: false,
        }))
        dispatch({ type: 'SET_MEDICAL_TERMS', payload: fallbackData })
      }
    } catch (error) {
      console.error('Failed to detect medical terms:', error)
      dispatch({ type: 'SET_MEDICAL_LOADING', payload: false })
    }
  }, [])

  /**
   * Play audio for a specific word with ±3 seconds context
   */
  const playWordAudio = useCallback((timestamp: number, contextSeconds = 3) => {
    if (!audioRef.current) return

    // Clear any existing timeout
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current)
    }

    // Calculate start and end times with context
    const startTime = Math.max(0, timestamp - contextSeconds)
    const endTime = timestamp + contextSeconds

    audioRef.current.currentTime = startTime
    audioRef.current.play()
    dispatch({ type: 'SET_PLAYING', payload: true })

    // Auto-stop after the context window
    const duration = (endTime - startTime) * 1000
    playbackTimeoutRef.current = setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause()
        dispatch({ type: 'SET_PLAYING', payload: false })
      }
    }, duration)
  }, [])

  /**
   * Seek audio to a specific time
   */
  const seekAudio = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      dispatch({ type: 'SET_AUDIO_TIME', payload: time })
    }
  }, [])

  /**
   * Toggle audio playback
   */
  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return

    if (state.isPlaying) {
      audioRef.current.pause()
      if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current)
      }
    } else {
      audioRef.current.play()
    }
    dispatch({ type: 'SET_PLAYING', payload: !state.isPlaying })
  }, [state.isPlaying])

  /**
   * Select a word for editing
   */
  const selectWord = useCallback((wordId: string | null) => {
    dispatch({ type: 'SELECT_WORD', payload: wordId })

    // If selecting a word, jump to its timestamp in audio
    if (wordId) {
      const word = state.flaggedWords.find(w => w.id === wordId)
      if (word && audioRef.current) {
        audioRef.current.currentTime = word.timestamp
        dispatch({ type: 'SET_AUDIO_TIME', payload: word.timestamp })
      }
    }
  }, [state.flaggedWords])

  /**
   * Update a word's correction
   */
  const updateWord = useCallback((id: string, correctedWord: string) => {
    dispatch({ type: 'UPDATE_WORD', payload: { id, correctedWord } })
  }, [])

  /**
   * Accept a word (with optional correction)
   */
  const acceptWord = useCallback((id: string, correctedWord?: string) => {
    dispatch({ type: 'ACCEPT_WORD', payload: { id, correctedWord } })
  }, [])

  /**
   * Skip reviewing a word (mark as reviewed without changes)
   */
  const skipWord = useCallback((id: string) => {
    dispatch({ type: 'SKIP_WORD', payload: id })
  }, [])

  /**
   * Accept all remaining words
   */
  const acceptAll = useCallback(() => {
    dispatch({ type: 'BULK_ACCEPT_ALL' })
  }, [])

  /**
   * Get the currently selected word
   */
  const currentWord = useMemo(() => {
    return state.flaggedWords.find(w => w.id === state.currentWordId) ?? null
  }, [state.flaggedWords, state.currentWordId])

  /**
   * Navigate to next unreviewed medical word
   */
  const nextWord = useCallback(() => {
    const medicalWords = state.flaggedWords.filter(w => w.isMedicalTerm)
    const currentIndex = medicalWords.findIndex(w => w.id === state.currentWordId)
    const next = medicalWords.find(
      (w, i) => i > currentIndex && !w.isReviewed
    ) ?? medicalWords.find(w => !w.isReviewed)

    if (next) {
      selectWord(next.id)
    }
  }, [state.flaggedWords, state.currentWordId, selectWord])

  /**
   * Navigate to previous medical word
   */
  const prevWord = useCallback(() => {
    const medicalWords = state.flaggedWords.filter(w => w.isMedicalTerm)
    const currentIndex = medicalWords.findIndex(w => w.id === state.currentWordId)
    if (currentIndex > 0) {
      selectWord(medicalWords[currentIndex - 1].id)
    }
  }, [state.flaggedWords, state.currentWordId, selectWord])

  /**
   * Get the final transcript with corrections applied
   */
  const getFinalTranscript = useCallback((): string => {
    if (!transcript) return ''

    const corrections = new Map<string, string>()
    state.flaggedWords.forEach(word => {
      if (word.correctedWord && word.correctedWord !== word.word) {
        corrections.set(word.id, word.correctedWord)
      }
    })

    // Rebuild the transcript with corrections
    const correctedSegments = transcript.segments.map((segment, segmentIndex) => {
      if (!segment.words) return segment.text

      const correctedWords = segment.words.map((word, wordIndex) => {
        const id = `${segmentIndex}-${wordIndex}`
        return corrections.get(id) ?? word.word
      })

      return correctedWords.join(' ')
    })

    // Format with speaker labels
    let result = ''
    let currentSpeaker: string | null = null

    transcript.segments.forEach((segment, index) => {
      if (segment.speaker !== currentSpeaker) {
        const speakerLabel = segment.speaker.replace('SPEAKER_', 'Speaker ')
        result += `\n[${speakerLabel}]: `
        currentSpeaker = segment.speaker
      }
      result += correctedSegments[index] + ' '
    })

    return result.trim()
  }, [transcript, state.flaggedWords])

  /**
   * Get all corrections made
   */
  const getCorrections = useCallback((): WordCorrection[] => {
    return state.flaggedWords
      .filter(w => w.correctedWord && w.correctedWord !== w.word)
      .map(w => ({
        segmentIndex: w.segmentIndex,
        wordIndex: w.wordIndex,
        originalWord: w.word,
        correctedWord: w.correctedWord!,
        timestamp: w.timestamp,
      }))
  }, [state.flaggedWords])

  /**
   * Check if validation can proceed
   */
  const validationStatus = useMemo(() => {
    return canProceedWithValidation(state.flaggedWords)
  }, [state.flaggedWords])

  /**
   * Get only medically-relevant flagged words for UI display
   * Non-medical words are auto-accepted and don't need review
   */
  const medicalFlaggedWords = useMemo(() => {
    return state.flaggedWords.filter(w => w.isMedicalTerm)
  }, [state.flaggedWords])

  /**
   * Get audio duration
   */
  const audioDuration = useMemo(() => {
    return audioRef.current?.duration ?? 0
  }, [state.audioCurrentTime]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // State
    flaggedWords: state.flaggedWords,
    medicalFlaggedWords,  // Only medical words for UI display
    currentWord,
    currentWordId: state.currentWordId,
    audioCurrentTime: state.audioCurrentTime,
    audioDuration,
    isPlaying: state.isPlaying,
    reviewProgress: state.reviewProgress,
    medicalTermsLoading: state.medicalTermsLoading,
    validationStatus,

    // Actions
    selectWord,
    updateWord,
    acceptWord,
    skipWord,
    acceptAll,
    nextWord,
    prevWord,

    // Audio
    playWordAudio,
    seekAudio,
    togglePlayback,

    // Results
    getFinalTranscript,
    getCorrections,
  }
}
