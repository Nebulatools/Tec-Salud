"use client"

import { useRecordingContext } from "@/contexts/recording-context"
import { useRouter } from "next/navigation"
import { useCallback } from "react"

/**
 * Hook for consuming the global recording context
 * Adds navigation helpers and time formatting utilities
 */
export function useRecording() {
  const context = useRecordingContext()
  const router = useRouter()

  /**
   * Navigate to the consultation page for the current recording session
   * Goes directly to step 2 (recording/transcript) with the completed transcript
   * Closes the stop modal and redirects to the appointment
   */
  const navigateToConsultation = useCallback(() => {
    if (context.session?.appointmentId) {
      // Navigate to step 2 (Grabación de Consulta) where the transcript is shown
      router.push(`/consultas/${context.session.appointmentId}?step=2`)
    }
    context.setShowStopModal(false)
  }, [context, router])

  /**
   * Close the stop modal without navigating
   * User can continue working on other pages
   */
  const continueWorking = useCallback(() => {
    context.setShowStopModal(false)
  }, [context])

  /**
   * Format elapsed seconds as MM:SS
   */
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }, [])

  /**
   * Format elapsed time as human-readable string
   * e.g., "5 min 30 seg" or "1 hr 15 min"
   */
  const formatTimeVerbose = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours} hr ${mins} min`
    }
    if (mins > 0) {
      return `${mins} min ${secs} seg`
    }
    return `${secs} seg`
  }, [])

  return {
    ...context,
    navigateToConsultation,
    continueWorking,
    formatTime,
    formatTimeVerbose,
  }
}
