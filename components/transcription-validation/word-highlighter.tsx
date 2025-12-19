'use client'

import { memo, useMemo, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  EnhancedDiarizedTranscript,
  FlaggedWord,
  ConfidenceThresholds,
  DEFAULT_THRESHOLDS,
  getHighlightLevel,
} from '@/types/transcription-validation'
import { TranscriptWord } from '@/types/recording'
import { Badge } from '@/components/ui/badge'

interface WordHighlighterProps {
  transcript: EnhancedDiarizedTranscript
  flaggedWords: FlaggedWord[]
  selectedWordId: string | null
  speakerRoles?: Record<string, string>
  thresholds?: ConfidenceThresholds
  onWordClick: (wordId: string) => void
}

/**
 * Individual word span component - memoized for performance
 */
const WordSpan = memo(function WordSpan({
  word,
  probability,
  wordId,
  isSelected,
  isCorrected,
  correctedWord,
  isMedical,
  thresholds,
  onClick,
}: {
  word: string
  probability: number
  wordId: string
  isSelected: boolean
  isCorrected: boolean
  correctedWord?: string
  isMedical: boolean
  thresholds: ConfidenceThresholds
  onClick: () => void
}) {
  const highlightLevel = getHighlightLevel(probability, thresholds, isCorrected)
  const isFlagged = probability < thresholds.warning

  // High-confidence words: render as normal text
  if (!isFlagged) {
    return <span className="text-foreground">{word} </span>
  }

  // Low-confidence but NOT medical: render as normal text (no interaction needed)
  // These are auto-accepted and don't need doctor review
  if (!isMedical && !isCorrected) {
    return <span className="text-foreground">{word} </span>
  }

  // Medical terms or corrected words: render with highlight and interactivity
  return (
    <span
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded px-0.5 py-0.5 transition-all duration-150 inline-block',
        // Highlight levels for medical terms
        highlightLevel === 'critical' && 'bg-red-100 text-red-900 underline decoration-wavy decoration-red-400',
        highlightLevel === 'warning' && 'bg-yellow-100 text-yellow-900',
        highlightLevel === 'corrected' && 'bg-green-100 text-green-900',
        // Selected state
        isSelected && 'ring-2 ring-blue-500 ring-offset-1',
        // Medical term indicator - purple dashed border
        isMedical && !isCorrected && 'border-b-2 border-dashed border-purple-400',
        // Hover state
        'hover:ring-1 hover:ring-blue-300'
      )}
      title={`Confianza: ${Math.round(probability * 100)}% (Término médico)`}
    >
      {isCorrected && correctedWord ? (
        <>
          <span className="line-through opacity-50 mr-1">{word}</span>
          <span className="font-medium">{correctedWord}</span>
        </>
      ) : (
        word
      )}
      {' '}
    </span>
  )
})

/**
 * Speaker label badge
 */
const SpeakerBadge = memo(function SpeakerBadge({
  speaker,
  speakerRoles,
}: {
  speaker: string
  speakerRoles?: Record<string, string>
}) {
  const role = speakerRoles?.[speaker] || speaker.replace('SPEAKER_', 'Speaker ')

  const getColorClass = (role: string) => {
    const lowerRole = role.toLowerCase()
    if (lowerRole.includes('doctor') || lowerRole.includes('médico')) {
      return 'bg-blue-100 text-blue-800 border-blue-200'
    }
    if (lowerRole.includes('paciente') || lowerRole.includes('patient')) {
      return 'bg-green-100 text-green-800 border-green-200'
    }
    if (lowerRole.includes('madre') || lowerRole.includes('padre') || lowerRole.includes('familiar')) {
      return 'bg-purple-100 text-purple-800 border-purple-200'
    }
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-medium mr-2 mb-1', getColorClass(role))}
    >
      {role}
    </Badge>
  )
})

/**
 * A single segment of the transcript
 */
const TranscriptSegment = memo(function TranscriptSegment({
  segment,
  segmentIndex,
  flaggedWords,
  selectedWordId,
  speakerRoles,
  thresholds,
  onWordClick,
  showSpeaker,
}: {
  segment: EnhancedDiarizedTranscript['segments'][0]
  segmentIndex: number
  flaggedWords: FlaggedWord[]
  selectedWordId: string | null
  speakerRoles?: Record<string, string>
  thresholds: ConfidenceThresholds
  onWordClick: (wordId: string) => void
  showSpeaker: boolean
}) {
  // Create a map of flagged words for quick lookup
  const flaggedMap = useMemo(() => {
    const map = new Map<string, FlaggedWord>()
    flaggedWords.forEach(fw => {
      if (fw.segmentIndex === segmentIndex) {
        map.set(`${segmentIndex}-${fw.wordIndex}`, fw)
      }
    })
    return map
  }, [flaggedWords, segmentIndex])

  // If no word-level data, render as plain text
  if (!segment.words || segment.words.length === 0) {
    return (
      <div className="mb-3">
        {showSpeaker && (
          <SpeakerBadge speaker={segment.speaker} speakerRoles={speakerRoles} />
        )}
        <span className="text-foreground">{segment.text}</span>
      </div>
    )
  }

  return (
    <div className="mb-3">
      {showSpeaker && (
        <div className="mb-1">
          <SpeakerBadge speaker={segment.speaker} speakerRoles={speakerRoles} />
        </div>
      )}
      <div className="leading-relaxed">
        {segment.words.map((word: TranscriptWord, wordIndex: number) => {
          const wordId = `${segmentIndex}-${wordIndex}`
          const flaggedWord = flaggedMap.get(wordId)

          return (
            <WordSpan
              key={wordId}
              word={word.word}
              probability={word.probability}
              wordId={wordId}
              isSelected={selectedWordId === wordId}
              isCorrected={flaggedWord?.correctedWord !== undefined && flaggedWord.correctedWord !== flaggedWord.word}
              correctedWord={flaggedWord?.correctedWord}
              isMedical={flaggedWord?.isMedicalTerm ?? false}
              thresholds={thresholds}
              onClick={() => {
                // Only allow clicking on medical terms
                if (flaggedWord?.isMedicalTerm) {
                  onWordClick(wordId)
                }
              }}
            />
          )
        })}
      </div>
    </div>
  )
})

/**
 * WordHighlighter - Renders the full transcript with confidence-based word highlighting
 */
export function WordHighlighter({
  transcript,
  flaggedWords,
  selectedWordId,
  speakerRoles,
  thresholds = DEFAULT_THRESHOLDS,
  onWordClick,
}: WordHighlighterProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll to selected word when it changes
  useEffect(() => {
    if (selectedWordId && containerRef.current) {
      const selectedElement = containerRef.current.querySelector(
        `[data-word-id="${selectedWordId}"]`
      )
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [selectedWordId])

  // Track speaker changes to show badges only on change
  const segmentsWithSpeakerChange = useMemo(() => {
    let lastSpeaker: string | null = null
    return transcript.segments.map(segment => {
      const showSpeaker = segment.speaker !== lastSpeaker
      lastSpeaker = segment.speaker
      return { segment, showSpeaker }
    })
  }, [transcript.segments])

  return (
    <div
      ref={containerRef}
      className="p-4 bg-muted/30 rounded-lg border max-h-[400px] overflow-y-auto"
    >
      {/* Legend - Only medical terms are highlighted */}
      <div className="flex flex-wrap gap-3 mb-4 pb-3 border-b text-xs">
        <div className="flex items-center gap-1">
          <span className="inline-block w-4 h-4 rounded bg-red-100 border border-red-200 border-b-2 border-dashed border-purple-400" />
          <span className="text-muted-foreground">Término médico crítico</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-4 h-4 rounded bg-yellow-100 border border-yellow-200 border-b-2 border-dashed border-purple-400" />
          <span className="text-muted-foreground">Término médico a revisar</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-4 h-4 rounded bg-green-100 border border-green-200" />
          <span className="text-muted-foreground">Corregido</span>
        </div>
      </div>

      {/* Transcript content */}
      <div className="space-y-1">
        {segmentsWithSpeakerChange.map(({ segment, showSpeaker }, index) => (
          <TranscriptSegment
            key={index}
            segment={segment}
            segmentIndex={index}
            flaggedWords={flaggedWords}
            selectedWordId={selectedWordId}
            speakerRoles={speakerRoles}
            thresholds={thresholds}
            onWordClick={onWordClick}
            showSpeaker={showSpeaker}
          />
        ))}
      </div>
    </div>
  )
}
