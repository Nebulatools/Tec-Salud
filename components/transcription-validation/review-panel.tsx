'use client'

import { memo, useMemo } from 'react'
import { FlaggedWord, ValidationState, getHighlightLevel, DEFAULT_THRESHOLDS } from '@/types/transcription-validation'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Stethoscope,
  User,
  CheckCheck,
  ListTodo,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReviewPanelProps {
  flaggedWords: FlaggedWord[]
  selectedWordId: string | null
  reviewProgress: ValidationState['reviewProgress']
  medicalTermsLoading: boolean
  speakerRoles?: Record<string, string>
  onWordSelect: (wordId: string) => void
  onAcceptAll: () => void
}

/**
 * Format timestamp as MM:SS
 */
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Individual review queue item
 */
const ReviewQueueItem = memo(function ReviewQueueItem({
  word,
  isSelected,
  speakerRoles,
  onClick,
}: {
  word: FlaggedWord
  isSelected: boolean
  speakerRoles?: Record<string, string>
  onClick: () => void
}) {
  const highlightLevel = getHighlightLevel(word.probability, DEFAULT_THRESHOLDS, word.isReviewed && !!word.correctedWord)
  const confidencePercent = Math.round(word.probability * 100)
  const speakerRole = speakerRoles?.[word.speaker] || word.speaker.replace('SPEAKER_', 'Speaker ')

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-3 text-left rounded-lg border transition-all duration-150',
        'hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        isSelected && 'bg-accent border-primary ring-1 ring-primary',
        word.isReviewed && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Word and status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* Status icon */}
            {word.isReviewed ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
            ) : highlightLevel === 'critical' ? (
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
            )}

            {/* Word */}
            <span
              className={cn(
                'font-medium truncate',
                word.isReviewed && word.correctedWord && word.correctedWord !== word.word && 'line-through text-muted-foreground'
              )}
            >
              {word.word}
            </span>

            {/* Corrected word */}
            {word.isReviewed && word.correctedWord && word.correctedWord !== word.word && (
              <span className="font-medium text-green-600 truncate">
                → {word.correctedWord}
              </span>
            )}
          </div>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {/* Confidence */}
            <span
              className={cn(
                'font-medium',
                highlightLevel === 'critical' && 'text-red-600',
                highlightLevel === 'warning' && 'text-yellow-600'
              )}
            >
              {confidencePercent}%
            </span>

            {/* Timestamp */}
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {formatTimestamp(word.timestamp)}
            </span>

            {/* Speaker */}
            <span className="flex items-center gap-0.5">
              <User className="h-3 w-3" />
              {speakerRole}
            </span>
          </div>
        </div>

        {/* Medical category badge */}
        {word.medicalCategory && (
          <Badge
            variant="secondary"
            className="flex-shrink-0 bg-purple-100 text-purple-700 border-purple-200 text-[10px] px-1.5 capitalize"
          >
            {word.medicalCategory.replace('_', ' ')}
          </Badge>
        )}
      </div>
    </button>
  )
})

/**
 * ReviewPanel - Side panel showing the queue of flagged words to review
 */
export function ReviewPanel({
  flaggedWords,
  selectedWordId,
  reviewProgress,
  medicalTermsLoading,
  speakerRoles,
  onWordSelect,
  onAcceptAll,
}: ReviewPanelProps) {
  // Separate words into reviewed and pending
  const { pendingWords, reviewedWords, pendingMedical } = useMemo(() => {
    const pending: FlaggedWord[] = []
    const reviewed: FlaggedWord[] = []
    let medicalCount = 0

    flaggedWords.forEach(word => {
      if (word.isReviewed) {
        reviewed.push(word)
      } else {
        pending.push(word)
        if (word.isMedicalTerm) {
          medicalCount++
        }
      }
    })

    return {
      pendingWords: pending,
      reviewedWords: reviewed,
      pendingMedical: medicalCount,
    }
  }, [flaggedWords])

  const hasUnreviewedMedical = pendingMedical > 0

  return (
    <div className="flex flex-col h-full">
      {/* Header with progress */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold">Términos Médicos</h3>
          </div>
          <Badge variant="outline" className="tabular-nums bg-purple-50 text-purple-700 border-purple-200">
            {reviewProgress.medicalReviewed}/{reviewProgress.medicalTotal}
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <Progress value={reviewProgress.percentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{reviewProgress.percentage}% completado</span>
            {reviewProgress.medicalTotal > 0 && (
              <span className={cn(hasUnreviewedMedical ? 'text-purple-600 font-medium' : 'text-green-600')}>
                {reviewProgress.medicalReviewed}/{reviewProgress.medicalTotal} médicos
              </span>
            )}
          </div>
        </div>

        {/* Medical terms warning */}
        {hasUnreviewedMedical && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-purple-50 border border-purple-200 text-purple-700 text-xs">
            <Stethoscope className="h-4 w-4 flex-shrink-0" />
            <span>
              <strong>{pendingMedical}</strong> término{pendingMedical === 1 ? '' : 's'} médico{pendingMedical === 1 ? '' : 's'} pendiente{pendingMedical === 1 ? '' : 's'}
            </span>
          </div>
        )}

        {/* Loading indicator for medical term detection */}
        {medicalTermsLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-3 w-3 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            <span>Detectando términos médicos...</span>
          </div>
        )}

        {/* Accept all button - only show when all remaining words are reviewed */}
        {pendingWords.length > 0 && !hasUnreviewedMedical && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onAcceptAll}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Aceptar todos los términos
          </Button>
        )}
      </div>

      {/* Scrollable word list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {/* Pending words first */}
          {pendingWords.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground px-1">
                Pendientes ({pendingWords.length})
              </p>
              {pendingWords.map(word => (
                <ReviewQueueItem
                  key={word.id}
                  word={word}
                  isSelected={selectedWordId === word.id}
                  speakerRoles={speakerRoles}
                  onClick={() => onWordSelect(word.id)}
                />
              ))}
            </div>
          )}

          {/* Reviewed words */}
          {reviewedWords.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-xs font-medium text-muted-foreground px-1">
                Revisadas ({reviewedWords.length})
              </p>
              {reviewedWords.map(word => (
                <ReviewQueueItem
                  key={word.id}
                  word={word}
                  isSelected={selectedWordId === word.id}
                  speakerRoles={speakerRoles}
                  onClick={() => onWordSelect(word.id)}
                />
              ))}
            </div>
          )}

          {/* Empty state - only show when loading is complete */}
          {!medicalTermsLoading && flaggedWords.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
              <p className="font-medium">¡Sin términos médicos pendientes!</p>
              <p className="text-sm text-muted-foreground mt-1">
                No hay terminología clínica con baja confianza para revisar.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
