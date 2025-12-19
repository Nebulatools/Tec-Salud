"use client"

import { useState, useEffect } from "react"
import { Mic, Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function RecordingIndicator() {
  const [recordingTime, setRecordingTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (!isPaused) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isPaused])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed top-6 right-6 z-50">
      <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-4 min-w-[200px]">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative">
            <Mic className="h-5 w-5 text-red-500" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          </div>
          <span className="text-sm font-medium text-gray-700">Grabando</span>
        </div>

        {/* Recording Time */}
        <div className="text-center mb-4">
          <div className="text-2xl font-mono font-bold text-gray-900">
            {formatTime(recordingTime)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            La grabación se procesa automáticamente
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
            className="flex items-center gap-2"
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4" />
                Reanudar
              </>
            ) : (
              <>
                <Pause className="h-4 w-4" />
                Pausar
              </>
            )}
          </Button>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isPaused ? "bg-yellow-500" : "bg-green-500 animate-pulse"
          )} />
          <span className="text-xs text-gray-500">
            {isPaused ? "Grabación pausada" : "Grabación activa"}
          </span>
        </div>
      </div>
    </div>
  )
} 