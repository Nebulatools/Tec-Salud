"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle } from "lucide-react"

interface ConfirmCancelModalProps {
  isOpen: boolean
  onConfirm: () => void
  onClose: () => void
  title?: string
  description?: string
}

export default function ConfirmCancelModal({
  isOpen,
  onConfirm,
  onClose,
  title = "¿Cancelar y descartar cambios?",
  description = "Si cancelas ahora, se perderá la información no guardada."
}: ConfirmCancelModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription className="text-gray-600 dark:text-gray-400 text-base">
          {description}
        </DialogDescription>
        <DialogFooter className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Continuar editando
          </Button>
          <Button variant="destructive" onClick={onConfirm} className="flex-1">
            Cancelar sin guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

