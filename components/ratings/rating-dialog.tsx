"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Star, Loader2, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface RatingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointmentId: string
  doctorId: string
  doctorName: string
  patientId: string
  onSuccess?: () => void
}

interface RatingCategory {
  key: "overall" | "punctuality" | "communication" | "professionalism"
  label: string
  description: string
}

const ratingCategories: RatingCategory[] = [
  {
    key: "overall",
    label: "Calificación General",
    description: "Tu experiencia general con el doctor",
  },
  {
    key: "punctuality",
    label: "Puntualidad",
    description: "Tiempo de espera y puntualidad",
  },
  {
    key: "communication",
    label: "Comunicación",
    description: "Claridad al explicar diagnóstico y tratamiento",
  },
  {
    key: "professionalism",
    label: "Profesionalismo",
    description: "Trato y atención durante la consulta",
  },
]

export function RatingDialog({
  open,
  onOpenChange,
  appointmentId,
  doctorId,
  doctorName,
  patientId,
  onSuccess,
}: RatingDialogProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({
    overall: 0,
    punctuality: 0,
    communication: 0,
    professionalism: 0,
  })
  const [hoverRatings, setHoverRatings] = useState<Record<string, number>>({})
  const [reviewText, setReviewText] = useState("")
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStarClick = (category: string, rating: number) => {
    setRatings((prev) => ({ ...prev, [category]: rating }))
  }

  const handleStarHover = (category: string, rating: number) => {
    setHoverRatings((prev) => ({ ...prev, [category]: rating }))
  }

  const handleStarLeave = (category: string) => {
    setHoverRatings((prev) => ({ ...prev, [category]: 0 }))
  }

  const canSubmit = ratings.overall > 0

  const handleSubmit = async () => {
    if (!canSubmit) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Create rating
      const { data: ratingData, error: ratingError } = await supabase
        .from("doctor_ratings")
        .insert({
          doctor_id: doctorId,
          patient_id: patientId,
          appointment_id: appointmentId,
          overall_rating: ratings.overall,
          punctuality_rating: ratings.punctuality || null,
          communication_rating: ratings.communication || null,
          professionalism_rating: ratings.professionalism || null,
        })
        .select("id")
        .single()

      if (ratingError) throw ratingError

      // Create review if text provided
      if (reviewText.trim() && ratingData) {
        const { error: reviewError } = await supabase
          .from("doctor_reviews")
          .insert({
            rating_id: ratingData.id,
            doctor_id: doctorId,
            patient_id: patientId,
            review_text: reviewText.trim(),
            is_anonymous: isAnonymous,
            status: "pending", // Will be moderated
          })

        if (reviewError) {
          console.error("Error creating review:", reviewError)
          // Don't fail the whole operation if review fails
        }
      }

      setIsSuccess(true)
      setTimeout(() => {
        onOpenChange(false)
        onSuccess?.()
        // Reset state
        setRatings({ overall: 0, punctuality: 0, communication: 0, professionalism: 0 })
        setReviewText("")
        setIsAnonymous(false)
        setIsSuccess(false)
      }, 1500)
    } catch (err) {
      console.error("Error submitting rating:", err)
      setError("Error al enviar tu calificación. Intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStars = (category: RatingCategory) => {
    const currentRating = hoverRatings[category.key] || ratings[category.key]

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">
              {category.label}
              {category.key === "overall" && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <p className="text-xs text-gray-500">{category.description}</p>
          </div>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleStarClick(category.key, star)}
                onMouseEnter={() => handleStarHover(category.key, star)}
                onMouseLeave={() => handleStarLeave(category.key)}
                className="p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-zuli-veronica rounded transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-6 w-6 transition-colors",
                    star <= currentRating
                      ? "text-amber-400 fill-amber-400"
                      : "text-gray-200 hover:text-amber-200"
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px]">
          <div className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center animate-fadeIn">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              ¡Gracias por tu calificación!
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tu opinión nos ayuda a mejorar
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
            Califica tu Consulta
          </DialogTitle>
          <DialogDescription>
            Cuéntanos cómo fue tu experiencia con Dr. {doctorName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Rating categories */}
          {ratingCategories.map((category) => (
            <div
              key={category.key}
              className={cn(
                "p-3 rounded-lg transition-colors",
                category.key === "overall"
                  ? "bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800"
                  : "bg-gray-50 dark:bg-gray-800/50"
              )}
            >
              {renderStars(category)}
            </div>
          ))}

          {/* Review text */}
          <div className="space-y-2">
            <Label htmlFor="review" className="text-sm font-medium">
              Escribe una reseña (opcional)
            </Label>
            <Textarea
              id="review"
              placeholder="Comparte tu experiencia con otros pacientes..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              Tu reseña será revisada antes de publicarse.
            </p>
          </div>

          {/* Anonymous toggle */}
          {reviewText.trim() && (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div>
                <Label htmlFor="anonymous" className="text-sm font-medium">
                  Publicar como anónimo
                </Label>
                <p className="text-xs text-gray-500">
                  Tu nombre no aparecerá en la reseña
                </p>
              </div>
              <Switch
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="bg-gradient-to-r from-zuli-veronica to-zuli-indigo hover:opacity-90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-2" />
                Enviar Calificación
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
