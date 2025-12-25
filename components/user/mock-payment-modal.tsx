// Modal de pago simulado para vinculación con especialista
"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Lock, CheckCircle2, Shield, Calendar, User } from "lucide-react"
import { cn } from "@/lib/utils"

type Doctor = {
  id: string
  full_name: string
  specialty?: {
    name: string
  } | null
}

type MockPaymentModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctor: Doctor
  consultationFee?: number
  onPaymentSuccess: () => void
}

export function MockPaymentModal({
  open,
  onOpenChange,
  doctor,
  consultationFee = 500,
  onPaymentSuccess,
}: MockPaymentModalProps) {
  const [step, setStep] = useState<"details" | "processing" | "success">("details")
  const [cardNumber, setCardNumber] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvv, setCvv] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStep("processing")

    // Simular procesamiento de pago
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setStep("success")

    // Esperar un momento antes de cerrar y notificar éxito
    setTimeout(() => {
      onPaymentSuccess()
      // Reset para próximo uso
      setStep("details")
      setCardNumber("")
      setExpiry("")
      setCvv("")
    }, 1500)
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s/g, "").replace(/\D/g, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    return parts.length ? parts.join(" ") : value
  }

  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, "")
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4)
    }
    return v
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-zuli-indigo" />
            Solicitar Cita
          </DialogTitle>
          <DialogDescription>
            Reserva tu consulta con el especialista
          </DialogDescription>
        </DialogHeader>

        {step === "details" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Resumen de la cita */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zuli-tricolor rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{doctor.full_name}</p>
                  <p className="text-sm text-gray-500">{doctor.specialty?.name || "Especialista"}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-gray-600">Costo de consulta</span>
                <span className="text-lg font-semibold text-zuli-indigo">
                  ${consultationFee.toFixed(2)} MXN
                </span>
              </div>
            </div>

            {/* Formulario de tarjeta */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Número de tarjeta</Label>
                <div className="relative">
                  <Input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    maxLength={19}
                    className="pl-10"
                    required
                  />
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiración</Label>
                  <Input
                    id="expiry"
                    placeholder="MM/AA"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    maxLength={5}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <div className="relative">
                    <Input
                      id="cvv"
                      placeholder="123"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").substring(0, 4))}
                      maxLength={4}
                      type="password"
                      required
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Badge de seguridad */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <Shield className="h-4 w-4 text-green-500" />
              <span>Pago seguro con encriptación SSL</span>
            </div>

            {/* Nota de prueba */}
            <Badge variant="outline" className="w-full justify-center text-amber-600 border-amber-300 bg-amber-50">
              Modo de prueba - No se realizará ningún cargo real
            </Badge>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="btn-zuli-gradient">
                <Calendar className="h-4 w-4 mr-2" />
                Pagar y Reservar
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "processing" && (
          <div className="py-12 text-center space-y-4">
            <div className="mx-auto w-16 h-16 relative">
              <div className="absolute inset-0 rounded-full border-4 border-zuli-veronica/20" />
              <div className="absolute inset-0 rounded-full border-4 border-zuli-veronica border-t-transparent animate-spin" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Procesando pago...</p>
              <p className="text-sm text-gray-500">Por favor no cierres esta ventana</p>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="py-12 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <div>
              <p className="font-medium text-gray-900 text-lg">¡Pago exitoso!</p>
              <p className="text-sm text-gray-500">Tu cita ha sido reservada</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
