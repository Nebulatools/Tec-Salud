"use client"

import { CheckCircle, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  onConfirm?: () => void
  confirmText?: string
}

export default function SuccessModal({
  isOpen,
  onClose,
  title,
  message,
  onConfirm,
  confirmText = "Cerrar"
}: SuccessModalProps) {
  const handleButtonClick = () => {
    if (onConfirm) {
      onConfirm()
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </DialogTitle>
            </div>
            <button
              onClick={onClose}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {message}
          </p>
        </div>
        
        <div className="flex justify-center">
          <Button
            onClick={handleButtonClick}
            className="bg-green-600 hover:bg-green-700 px-8"
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}