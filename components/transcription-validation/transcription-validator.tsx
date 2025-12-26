'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  EnhancedDiarizedTranscript,
  TranscriptionValidatorProps,
  ExtractionPreview,
  canProceedWithValidation,
} from '@/types/transcription-validation'
import { useTranscriptionValidation } from '@/hooks/use-transcription-validation'
import { WordHighlighter } from './word-highlighter'
import { WordEditor } from './word-editor'
import { ReviewPanel } from './review-panel'
import { AudioWaveform } from './audio-waveform'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  ArrowRight,
  ArrowLeft,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * TranscriptionValidator - Main component for human-in-the-loop transcription validation
 *
 * Allows doctors to review and correct low-confidence words before proceeding.
 * Medical terms must be reviewed (mandatory), other words are optional.
 */
export function TranscriptionValidator({
  transcript,
  audioBlob,
  speakerRoles,
  extractionPreview,
  onValidationComplete,
  onCancel,
  onRestart,
}: TranscriptionValidatorProps) {
  // Start with panel closed - user can open it manually if needed
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  // Use the validation hook
  const {
    flaggedWords,
    medicalFlaggedWords,  // Only medical terms for UI display
    currentWord,
    currentWordId,
    audioCurrentTime,
    audioDuration,
    isPlaying,
    reviewProgress,
    medicalTermsLoading,
    validationStatus,
    selectWord,
    updateWord,
    acceptWord,
    skipWord,
    acceptAll,
    nextWord,
    prevWord,
    playWordAudio,
    seekAudio,
    togglePlayback,
    getFinalTranscript,
    getCorrections,
  } = useTranscriptionValidation(transcript, audioBlob)

  /**
   * Handle completing validation
   */
  const handleComplete = useCallback(() => {
    const finalTranscript = getFinalTranscript()
    const corrections = getCorrections()
    onValidationComplete(finalTranscript, corrections)
  }, [getFinalTranscript, getCorrections, onValidationComplete])

  /**
   * Check if there are previous/next medical words for navigation
   */
  const navigationState = useMemo(() => {
    const currentIndex = medicalFlaggedWords.findIndex(w => w.id === currentWordId)
    return {
      hasPrev: currentIndex > 0,
      hasNext: currentIndex < medicalFlaggedWords.length - 1,
    }
  }, [medicalFlaggedWords, currentWordId])

  /**
   * Handle word click in highlighter
   */
  const handleWordClick = useCallback((wordId: string) => {
    selectWord(wordId)
  }, [selectWord])

  /**
   * Handle accepting a word from the editor
   */
  const handleAcceptWord = useCallback((correctedWord?: string) => {
    if (currentWordId) {
      acceptWord(currentWordId, correctedWord)
    }
  }, [currentWordId, acceptWord])

  /**
   * Handle skipping a word
   */
  const handleSkipWord = useCallback(() => {
    if (currentWordId) {
      skipWord(currentWordId)
    }
  }, [currentWordId, skipWord])

  /**
   * Handle marker click in waveform
   */
  const handleMarkerClick = useCallback((wordId: string) => {
    selectWord(wordId)
  }, [selectWord])

  // No medical terms to review - show success state
  if (medicalFlaggedWords.length === 0 && !medicalTermsLoading) {
    return (
      <div className="space-y-6">
        {/* Success message */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700">
          <CheckCircle2 className="h-6 w-6 flex-shrink-0" />
          <div>
            <p className="font-medium">Sin términos médicos para revisar</p>
            <p className="text-sm opacity-80">
              La terminología clínica tiene alta confianza. No se requiere revisión manual.
            </p>
          </div>
        </div>

        {/* Audio waveform (still show for reference) */}
        {audioBlob && (
          <AudioWaveform
            audioBlob={audioBlob}
            flaggedWords={[]}
            currentTime={audioCurrentTime}
            isPlaying={isPlaying}
            selectedWordId={null}
            onTimeChange={seekAudio}
            onPlayPause={togglePlayback}
            onMarkerClick={() => {}}
          />
        )}

        {/* Simple transcript display */}
        <div className="p-4 bg-muted/30 rounded-lg border">
          <p className="text-sm text-muted-foreground mb-2">Transcripción:</p>
          <p className="whitespace-pre-wrap">{transcript.fullText}</p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          {onRestart && (
            <Button
              variant="outline"
              onClick={onRestart}
              className="text-gray-600 rounded-xl group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
              Volver a grabar
            </Button>
          )}
          <Button onClick={handleComplete} className="btn-zuli-gradient rounded-xl font-medium group">
            Continuar
            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Validación de Transcripción</h3>
          {medicalTermsLoading && (
            <span className="text-xs text-muted-foreground animate-pulse">
              Analizando términos médicos...
            </span>
          )}
        </div>

        {/* Panel toggle for mobile */}
        <Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="lg:hidden">
              <ListTodo className="h-4 w-4 mr-2" />
              {reviewProgress.medicalTotal - reviewProgress.medicalReviewed} términos médicos
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 p-0">
            <SheetTitle className="sr-only">
              Panel de revisión de términos médicos
            </SheetTitle>
            <ReviewPanel
              flaggedWords={medicalFlaggedWords}
              selectedWordId={currentWordId}
              reviewProgress={reviewProgress}
              medicalTermsLoading={medicalTermsLoading}
              speakerRoles={speakerRoles}
              onWordSelect={selectWord}
              onAcceptAll={acceptAll}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-sm">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <div>
          <p>
            Solo se muestran <strong>términos médicos</strong> que podrían afectar el diagnóstico.
            {validationStatus.unreviewedMedicalCount > 0 && (
              <span className="font-medium">
                {' '}Revisa los {validationStatus.unreviewedMedicalCount} términos resaltados.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Clinical extraction preview - shows symptoms, diagnoses, medications */}
      {extractionPreview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-white rounded-lg border shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Síntomas/Signos</p>
            <p className="text-sm text-foreground">
              {extractionPreview.symptoms.length > 0
                ? extractionPreview.symptoms.join(', ')
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Diagnósticos</p>
            <p className="text-sm text-foreground">
              {extractionPreview.diagnoses.length > 0
                ? extractionPreview.diagnoses.join(', ')
                : '—'}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium text-muted-foreground mb-1">Medicamentos</p>
            {extractionPreview.medications.length > 0 ? (
              <div className="text-sm text-foreground space-y-0.5">
                {extractionPreview.medications.map((med, idx) => (
                  <p key={idx}>
                    <span className="font-medium">{med.name}</span>
                    {med.dose && <span className="text-muted-foreground"> • {med.dose}</span>}
                    {med.frequency && <span className="text-muted-foreground"> • {med.frequency}</span>}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground">—</p>
            )}
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex gap-4">
        {/* Left: Transcript and editor */}
        <div className="flex-1 space-y-4">
          {/* Transcript with highlighted words */}
          <WordHighlighter
            transcript={transcript}
            flaggedWords={flaggedWords}
            selectedWordId={currentWordId}
            speakerRoles={speakerRoles}
            onWordClick={handleWordClick}
          />

          {/* Word editor card (shows when a word is selected) */}
          {currentWord && (
            <WordEditor
              word={currentWord}
              isOpen={!!currentWord}
              onClose={() => selectWord(null)}
              onAccept={handleAcceptWord}
              onSkip={handleSkipWord}
              onPlayAudio={playWordAudio}
              onPrevWord={prevWord}
              onNextWord={nextWord}
              hasPrev={navigationState.hasPrev}
              hasNext={navigationState.hasNext}
              isPlaying={isPlaying}
            />
          )}

          {/* Audio waveform - only show markers for medical terms */}
          {audioBlob && (
            <AudioWaveform
              audioBlob={audioBlob}
              flaggedWords={medicalFlaggedWords}
              currentTime={audioCurrentTime}
              isPlaying={isPlaying}
              selectedWordId={currentWordId}
              onTimeChange={seekAudio}
              onPlayPause={togglePlayback}
              onMarkerClick={handleMarkerClick}
            />
          )}
        </div>

        {/* Right: Review panel (desktop) - only show medical terms */}
        <div className="hidden lg:block w-80 flex-shrink-0">
          <div className="sticky top-4 border rounded-lg overflow-hidden h-[600px]">
            <ReviewPanel
              flaggedWords={medicalFlaggedWords}
              selectedWordId={currentWordId}
              reviewProgress={reviewProgress}
              medicalTermsLoading={medicalTermsLoading}
              speakerRoles={speakerRoles}
              onWordSelect={selectWord}
              onAcceptAll={acceptAll}
            />
          </div>
        </div>
      </div>

      {/* Footer with actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        {/* Status message */}
        <div className="flex items-center gap-2 text-sm">
          {validationStatus.canProceed ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-green-700">
                Todos los términos médicos revisados
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-amber-700">
                {validationStatus.message}
              </span>
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {onRestart && (
            <Button
              variant="outline"
              onClick={onRestart}
              className="text-gray-600 rounded-xl group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
              Volver a grabar
            </Button>
          )}
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="rounded-xl">
              Cancelar
            </Button>
          )}
          <Button
            onClick={handleComplete}
            disabled={!validationStatus.canProceed}
            className={cn(
              "btn-zuli-gradient rounded-xl font-medium group",
              !validationStatus.canProceed && 'opacity-50 cursor-not-allowed'
            )}
          >
            Continuar con transcripción
            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  )
}
