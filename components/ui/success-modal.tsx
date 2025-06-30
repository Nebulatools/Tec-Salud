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
      <DialogContent className="sm:max-w-lg p-0 [&>button]:hidden">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {/* Header con solo una X */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
              <CheckCircle className="h-8 w-8 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 text-base leading-relaxed mb-6">
            {message}
          </p>
          
          <div className="flex justify-center">
            <Button
              onClick={handleButtonClick}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-2"
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}