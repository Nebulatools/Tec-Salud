"use client"

import { useRecording } from "@/hooks/use-recording"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Mic, Pause, Play, Square, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"

/**
 * Floating pill widget that shows recording status
 * Features dramatic entrance animation when recording starts
 */
export default function RecordingPill() {
  const {
    status,
    session,
    elapsedTime,
    isRecordingActive,
    isPillExpanded,
    togglePillExpanded,
    pauseRecording,
    resumeRecording,
    stopRecording,
    formatTime,
  } = useRecording()

  const pathname = usePathname()

  // Don't show the pill on consultation pages - they have their own recording UI
  const isOnConsultationPage = pathname?.startsWith("/consultas/")

  // Track if this is a fresh recording start for entrance animation
  const [isNewRecording, setIsNewRecording] = useState(false)
  const [showAttentionPulse, setShowAttentionPulse] = useState(false)

  // Detect when recording just started
  useEffect(() => {
    if (isRecordingActive && elapsedTime < 2) {
      setIsNewRecording(true)
      setShowAttentionPulse(true)

      // Stop the attention pulse after 3 seconds
      const timer = setTimeout(() => {
        setShowAttentionPulse(false)
      }, 3000)

      return () => clearTimeout(timer)
    }

    if (!isRecordingActive) {
      setIsNewRecording(false)
      setShowAttentionPulse(false)
    }
  }, [isRecordingActive, elapsedTime])

  // Don't show if:
  // 1. No active recording and not processing
  // 2. User is on a consultation page (those have their own recording UI)
  if ((!isRecordingActive && status !== "processing") || isOnConsultationPage) {
    return null
  }

  const isPaused = status === "paused"
  const isProcessing = status === "processing"

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence mode="wait">
        {isPillExpanded ? (
          // Expanded State
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 30 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
            className="bg-white rounded-2xl shadow-2xl border-2 border-red-200 p-5 min-w-[320px]"
          >
            {/* Header with collapse button */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    isPaused ? "bg-yellow-100" : "bg-red-100"
                  )}>
                    <Mic
                      className={cn(
                        "h-5 w-5",
                        isPaused ? "text-yellow-600" : "text-red-600"
                      )}
                    />
                  </div>
                  {!isPaused && !isProcessing && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>
                <div>
                  <span className="text-base font-semibold text-gray-900 block">
                    {isProcessing
                      ? "Procesando..."
                      : isPaused
                        ? "Pausado"
                        : "Grabando Consulta"}
                  </span>
                  {session && (
                    <span className="text-xs text-gray-500">
                      {session.patientName}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePillExpanded}
                className="h-8 w-8 p-0"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Timer - larger */}
            <div className="text-center mb-5 py-3 bg-gray-50 rounded-xl">
              <div className="text-4xl font-mono font-bold text-gray-900">
                {formatTime(elapsedTime)}
              </div>
              <div className="flex items-center justify-center gap-2 mt-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isProcessing
                    ? "bg-orange-500 animate-pulse"
                    : isPaused
                      ? "bg-yellow-500"
                      : "bg-red-500 animate-pulse"
                )} />
                <span className="text-xs text-gray-500">
                  {isProcessing
                    ? "Procesando audio"
                    : isPaused
                      ? "Grabación pausada"
                      : "Grabación activa"}
                </span>
              </div>
            </div>

            {/* Controls - larger buttons */}
            {!isProcessing ? (
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  className="flex items-center gap-2 h-11 px-5"
                >
                  {isPaused ? (
                    <>
                      <Play className="h-5 w-5" />
                      Reanudar
                    </>
                  ) : (
                    <>
                      <Pause className="h-5 w-5" />
                      Pausar
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={stopRecording}
                  className="flex items-center gap-2 h-11 px-5 bg-red-600 hover:bg-red-700"
                >
                  <Square className="h-5 w-5" />
                  Detener
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-orange-600 py-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Transcribiendo con IA...</span>
              </div>
            )}
          </motion.div>
        ) : (
          // Minimized State (Pill) - LARGER and more visible
          <motion.button
            key="minimized"
            initial={isNewRecording ? {
              // Dramatic entrance from center-top of screen
              opacity: 0,
              scale: 2,
              x: "-50vw",
              y: "-50vh",
            } : {
              opacity: 0,
              scale: 0.8,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              x: 0,
              y: 0,
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={isNewRecording ? {
              type: "spring",
              duration: 0.8,
              bounce: 0.4,
            } : {
              duration: 0.2,
            }}
            onClick={togglePillExpanded}
            className={cn(
              "flex items-center gap-4 px-5 py-3 rounded-full shadow-2xl border-2",
              "bg-white hover:bg-gray-50 transition-all duration-200",
              "cursor-pointer",
              // Attention-grabbing border when new
              showAttentionPulse
                ? "border-red-500 animate-[pulse_0.5s_ease-in-out_6]"
                : "border-red-200"
            )}
          >
            {/* Recording indicator circle - LARGER */}
            <div className="relative">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                isProcessing
                  ? "bg-orange-100"
                  : isPaused
                    ? "bg-yellow-100"
                    : "bg-red-100"
              )}>
                {isProcessing ? (
                  <Loader2 className="h-6 w-6 text-orange-600 animate-spin" />
                ) : (
                  <Mic
                    className={cn(
                      "h-6 w-6",
                      isPaused ? "text-yellow-600" : "text-red-600"
                    )}
                  />
                )}
              </div>
              {!isPaused && !isProcessing && (
                <motion.div
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [1, 0.7, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              )}
            </div>

            {/* Timer - LARGER */}
            <div className="flex flex-col">
              <span className="font-mono font-bold text-xl text-gray-900">
                {formatTime(elapsedTime)}
              </span>
              <span className="text-xs text-gray-500">
                {isProcessing ? "Procesando..." : isPaused ? "Pausado" : "REC"}
              </span>
            </div>

            {/* Expand icon */}
            <ChevronUp className="h-5 w-5 text-gray-400" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Extra attention ring animation when new */}
      {showAttentionPulse && !isPillExpanded && (
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-red-400 pointer-events-none"
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{
            scale: [1, 1.5, 2],
            opacity: [0.8, 0.4, 0],
          }}
          transition={{
            duration: 1,
            repeat: 3,
            ease: "easeOut",
          }}
        />
      )}
    </div>
  )
}
