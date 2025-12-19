'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { FlaggedWord, getHighlightLevel, DEFAULT_THRESHOLDS } from '@/types/transcription-validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Play,
  SkipForward,
  Check,
  X,
  Clock,
  User,
  AlertTriangle,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WordEditorProps {
  word: FlaggedWord | null
  isOpen: boolean
  onClose: () => void
  onAccept: (correctedWord?: string) => void
  onSkip: () => void
  onPlayAudio: (timestamp: number) => void
  onPrevWord: () => void
  onNextWord: () => void
  hasPrev: boolean
  hasNext: boolean
  isPlaying: boolean
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
 * WordEditor - Card component for editing a flagged word
 */
export function WordEditor({
  word,
  isOpen,
  onClose,
  onAccept,
  onSkip,
  onPlayAudio,
  onPrevWord,
  onNextWord,
  hasPrev,
  hasNext,
  isPlaying,
}: WordEditorProps) {
  const [correction, setCorrection] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset correction when word changes
  useEffect(() => {
    if (word) {
      setCorrection(word.correctedWord || word.word)
    }
  }, [word])

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isOpen, word?.id])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'Enter':
          e.preventDefault()
          handleAccept()
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case ' ':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            if (word) onPlayAudio(word.timestamp)
          }
          break
        case 'ArrowLeft':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            if (hasPrev) onPrevWord()
          }
          break
        case 'ArrowRight':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            if (hasNext) onNextWord()
          }
          break
        case 'Tab':
          e.preventDefault()
          if (e.shiftKey && hasPrev) {
            onPrevWord()
          } else if (!e.shiftKey && hasNext) {
            onNextWord()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, word, correction, hasPrev, hasNext, onClose, onPlayAudio, onPrevWord, onNextWord])

  const handleAccept = useCallback(() => {
    const trimmed = correction.trim()
    if (trimmed && trimmed !== word?.word) {
      onAccept(trimmed)
    } else {
      onAccept()
    }
  }, [correction, word, onAccept])

  if (!word || !isOpen) return null

  const highlightLevel = getHighlightLevel(word.probability, DEFAULT_THRESHOLDS)
  const confidencePercent = Math.round(word.probability * 100)

  return (
    <Card className="w-full max-w-md shadow-lg border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            Editar palabra
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onPrevWord}
              disabled={!hasPrev}
              title="Anterior (Ctrl+←)"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onNextWord}
              disabled={!hasNext}
              title="Siguiente (Ctrl+→)"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
              title="Cerrar (Esc)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Original word with confidence */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Palabra original</Label>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn(
                'text-sm px-3 py-1',
                highlightLevel === 'critical' && 'bg-red-100 text-red-800 border-red-200',
                highlightLevel === 'warning' && 'bg-yellow-100 text-yellow-800 border-yellow-200'
              )}
            >
              {word.word}
            </Badge>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle
                className={cn(
                  'h-3.5 w-3.5',
                  highlightLevel === 'critical' ? 'text-red-500' : 'text-yellow-500'
                )}
              />
              <span>Confianza: {confidencePercent}%</span>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatTimestamp(word.timestamp)}</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            <span>{word.speaker.replace('SPEAKER_', 'Speaker ')}</span>
          </div>
          {word.isMedicalTerm && (
            <div className="flex items-center gap-1 text-purple-600">
              <Stethoscope className="h-3.5 w-3.5" />
              <span>Término médico</span>
              {word.medicalCategory && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                  {word.medicalCategory}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Play audio button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onPlayAudio(word.timestamp)}
          disabled={isPlaying}
        >
          <Play className={cn('h-4 w-4 mr-2', isPlaying && 'animate-pulse')} />
          {isPlaying ? 'Reproduciendo...' : 'Escuchar audio (±3s)'}
        </Button>

        {/* Correction input */}
        <div className="space-y-2">
          <Label htmlFor="correction" className="text-xs text-muted-foreground">
            Corrección
          </Label>
          <Input
            ref={inputRef}
            id="correction"
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            placeholder="Escribe la palabra correcta..."
            className="text-base"
            autoComplete="off"
          />
          <p className="text-[10px] text-muted-foreground">
            Enter para aceptar • Esc para cerrar • Ctrl+Space para audio
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between gap-2 pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="text-muted-foreground"
        >
          <SkipForward className="h-4 w-4 mr-1" />
          Saltar
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleAccept}>
            <Check className="h-4 w-4 mr-1" />
            Aceptar
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
