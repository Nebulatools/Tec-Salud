"use client"

import { CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
  type: "success" | "error" | "warning"
  title: string
  description: string
}

export default function NotificationModal({
  isOpen,
  onClose,
  type,
  title,
  description
}: NotificationModalProps) {
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
      case "error":
        return <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
      case "warning":
        return <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
    }
  }

  const getColors = () => {
    switch (type) {
      case "success":
        return {
          bg: "bg-green-100 dark:bg-green-900/20",
          border: "border-green-200 dark:border-green-800",
          text: "text-green-800 dark:text-green-200"
        }
      case "error":
        return {
          bg: "bg-red-100 dark:bg-red-900/20",
          border: "border-red-200 dark:border-red-800",
          text: "text-red-800 dark:text-red-200"
        }
      case "warning":
        return {
          bg: "bg-yellow-100 dark:bg-yellow-900/20",
          border: "border-yellow-200 dark:border-yellow-800",
          text: "text-yellow-800 dark:text-yellow-200"
        }
    }
  }

  const colors = getColors()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${colors.bg}`}>
              {getIcon()}
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <DialogDescription className="text-gray-600 dark:text-gray-400 text-base leading-relaxed">
            {description}
          </DialogDescription>
          
          <div className={`mt-4 p-3 rounded-lg border ${colors.bg} ${colors.border}`}>
            <p className={`text-sm font-medium ${colors.text}`}>
              {type === "success" && "✅ Operación completada exitosamente"}
              {type === "error" && "❌ Ocurrió un error durante la operación"}
              {type === "warning" && "⚠️ Advertencia: Revisa la información"}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={onClose}
            className="w-full"
            variant={type === "error" ? "default" : "default"}
          >
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 