'use client'

import { useEffect, useRef, useState, useCallback, memo } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { FlaggedWord, getHighlightLevel, DEFAULT_THRESHOLDS } from '@/types/transcription-validation'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AudioWaveformProps {
  audioBlob: Blob | null
  flaggedWords: FlaggedWord[]
  currentTime: number
  isPlaying: boolean
  selectedWordId: string | null
  onTimeChange: (time: number) => void
  onPlayPause: () => void
  onMarkerClick: (wordId: string) => void
}

/**
 * Format time as MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Marker component for flagged words on the waveform
 */
const WaveformMarker = memo(function WaveformMarker({
  word,
  totalDuration,
  isSelected,
  onClick,
}: {
  word: FlaggedWord
  totalDuration: number
  isSelected: boolean
  onClick: () => void
}) {
  if (totalDuration === 0) return null

  const position = (word.timestamp / totalDuration) * 100
  const highlightLevel = getHighlightLevel(word.probability, DEFAULT_THRESHOLDS)

  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute top-0 w-0.5 h-full transition-all duration-150 z-10',
        'hover:w-1.5 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring',
        highlightLevel === 'critical' && 'bg-red-500',
        highlightLevel === 'warning' && 'bg-yellow-500',
        word.isMedicalTerm && 'ring-2 ring-purple-400',
        word.isReviewed && 'opacity-40',
        isSelected && 'w-2 opacity-100 ring-2 ring-blue-500'
      )}
      style={{ left: `${position}%` }}
      title={`${word.word} (${Math.round(word.probability * 100)}%) - Término médico - ${formatTime(word.timestamp)}`}
    />
  )
})

/**
 * AudioWaveform - Visualizes audio with playback controls and word markers
 */
export function AudioWaveform({
  audioBlob,
  flaggedWords,
  currentTime,
  isPlaying,
  selectedWordId,
  onTimeChange,
  onPlayPause,
  onMarkerClick,
}: AudioWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isReady, setIsReady] = useState(false)

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current || !audioBlob) return

    // Track if component is still mounted
    let isMounted = true
    let ws: WaveSurfer | null = null

    // Create URL from blob
    const url = URL.createObjectURL(audioBlob)

    // Initialize WaveSurfer
    ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'hsl(var(--muted-foreground) / 0.3)',
      progressColor: 'hsl(var(--primary))',
      cursorColor: 'hsl(var(--primary))',
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 60,
      normalize: true,
      interact: true,
    })

    wavesurferRef.current = ws

    // Load audio
    ws.load(url)

    // Event handlers - check isMounted before updating state
    ws.on('ready', () => {
      if (isMounted) {
        setDuration(ws?.getDuration() ?? 0)
        setIsReady(true)
      }
    })

    ws.on('audioprocess', () => {
      if (isMounted && ws) {
        onTimeChange(ws.getCurrentTime())
      }
    })

    ws.on('seeking', () => {
      if (isMounted && ws) {
        onTimeChange(ws.getCurrentTime())
      }
    })

    ws.on('finish', () => {
      // This is handled by the parent hook
    })

    ws.on('click', () => {
      if (isMounted && ws) {
        onTimeChange(ws.getCurrentTime())
      }
    })

    // Handle errors gracefully (e.g., during React Strict Mode double-mount)
    ws.on('error', (error) => {
      // Suppress abort errors during unmount - these are expected in React Strict Mode
      if (error?.name === 'AbortError' || String(error).includes('aborted')) {
        return
      }
      console.error('WaveSurfer error:', error)
    })

    return () => {
      isMounted = false
      wavesurferRef.current = null

      // Delay destruction slightly to avoid race conditions during React Strict Mode double-mount
      setTimeout(() => {
        try {
          if (ws) {
            ws.destroy()
          }
        } catch {
          // Ignore destroy errors during unmount
        }
      }, 0)

      URL.revokeObjectURL(url)
      setIsReady(false)
    }
  }, [audioBlob]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync playback state with parent
  useEffect(() => {
    if (!wavesurferRef.current || !isReady) return

    if (isPlaying && !wavesurferRef.current.isPlaying()) {
      wavesurferRef.current.play()
    } else if (!isPlaying && wavesurferRef.current.isPlaying()) {
      wavesurferRef.current.pause()
    }
  }, [isPlaying, isReady])

  // Sync current time with parent (when seeking from external source)
  useEffect(() => {
    if (!wavesurferRef.current || !isReady) return

    const wsTime = wavesurferRef.current.getCurrentTime()
    // Only seek if the difference is significant (to avoid loop)
    if (Math.abs(wsTime - currentTime) > 0.5) {
      wavesurferRef.current.seekTo(currentTime / duration)
    }
  }, [currentTime, duration, isReady])

  // Handle volume changes
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(isMuted ? 0 : volume)
    }
  }, [volume, isMuted])

  /**
   * Toggle mute
   */
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev)
  }, [])

  /**
   * Skip backward 5 seconds
   */
  const skipBackward = useCallback(() => {
    if (wavesurferRef.current) {
      const newTime = Math.max(0, currentTime - 5)
      wavesurferRef.current.seekTo(newTime / duration)
      onTimeChange(newTime)
    }
  }, [currentTime, duration, onTimeChange])

  /**
   * Skip forward 5 seconds
   */
  const skipForward = useCallback(() => {
    if (wavesurferRef.current) {
      const newTime = Math.min(duration, currentTime + 5)
      wavesurferRef.current.seekTo(newTime / duration)
      onTimeChange(newTime)
    }
  }, [currentTime, duration, onTimeChange])

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
      {/* Waveform container with markers */}
      <div className="relative">
        {/* Markers layer */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="relative w-full h-full pointer-events-auto">
            {flaggedWords.map(word => (
              <WaveformMarker
                key={word.id}
                word={word}
                totalDuration={duration}
                isSelected={selectedWordId === word.id}
                onClick={() => onMarkerClick(word.id)}
              />
            ))}
          </div>
        </div>

        {/* WaveSurfer container */}
        <div
          ref={containerRef}
          className={cn(
            'w-full rounded-md overflow-hidden',
            !isReady && 'opacity-50'
          )}
        />

        {/* Loading indicator */}
        {!isReady && audioBlob && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {/* No audio placeholder */}
        {!audioBlob && (
          <div className="h-[60px] flex items-center justify-center text-sm text-muted-foreground">
            No hay audio disponible
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Playback controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={skipBackward}
            disabled={!isReady}
            title="Retroceder 5s"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="default"
            size="icon"
            className="h-10 w-10"
            onClick={onPlayPause}
            disabled={!isReady}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={skipForward}
            disabled={!isReady}
            title="Avanzar 5s"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Time display */}
        <div className="text-sm tabular-nums text-muted-foreground min-w-[100px]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Volume control */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleMute}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume * 100]}
            onValueChange={([val]) => {
              setVolume(val / 100)
              if (val > 0) setIsMuted(false)
            }}
            max={100}
            step={1}
            className="w-20"
          />
        </div>
      </div>

      {/* Legend for markers - only medical terms are shown */}
      {flaggedWords.length > 0 && (
        <div className="flex flex-wrap gap-3 pt-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="inline-block w-2 h-4 rounded-sm bg-red-500 ring-2 ring-purple-400" />
            <span>Término médico crítico</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-2 h-4 rounded-sm bg-yellow-500 ring-2 ring-purple-400" />
            <span>Término médico a revisar</span>
          </div>
        </div>
      )}
    </div>
  )
}
