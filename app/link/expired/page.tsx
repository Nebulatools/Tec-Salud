'use client'

import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function ExpiredLinkPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertCircle className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle className="text-xl">Enlace Expirado</CardTitle>
          <CardDescription>
            Este código QR ya no es válido. Por favor, solicita un nuevo enlace a tu médico.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button asChild className="w-full">
            <Link href="/login">Iniciar Sesión</Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/register">Crear Cuenta</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
