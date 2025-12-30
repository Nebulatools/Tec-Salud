"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ZuliLogo } from "@/components/ui/zuli-logo"
import { Loader2, CheckCircle, Lock } from "lucide-react"
import { updatePassword } from "@/lib/supabase-auth"
import { supabase } from "@/lib/supabase"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsValidSession(!!session)
    }
    checkSession()

    // Listen for auth state changes (recovery link sets a session)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      return
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    setLoading(true)

    const { error } = await updatePassword(password)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)

    // Redirect to login after 3 seconds
    setTimeout(() => {
      router.push("/login")
    }, 3000)
  }

  // Show loading while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zuli-mesh">
        <Loader2 className="h-8 w-8 animate-spin text-zuli-veronica" />
      </div>
    )
  }

  // Show error if no valid session
  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zuli-mesh">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-6">
              <ZuliLogo size="xl" theme="dark" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Enlace inválido o expirado</h2>
            <CardDescription className="text-gray-500 text-sm mt-2">
              El enlace para restablecer la contraseña ha expirado o es inválido.
              Por favor, solicita uno nuevo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push("/login")}
              className="w-full btn-zuli-gradient py-3 rounded-xl"
            >
              Volver al inicio de sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zuli-mesh relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-zuli-veronica/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-zuli-cyan/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-6">
            <ZuliLogo size="xl" theme="dark" />
          </div>

          {success ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">¡Contraseña actualizada!</h2>
              <CardDescription className="text-gray-500 text-sm mt-2">
                Tu contraseña ha sido cambiada exitosamente. Serás redirigido al inicio de sesión...
              </CardDescription>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-zuli-veronica/10 rounded-full">
                  <Lock className="h-6 w-6 text-zuli-veronica" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Nueva contraseña</h2>
              <CardDescription className="text-gray-500 text-sm mt-2">
                Ingresa tu nueva contraseña. Debe tener al menos 8 caracteres.
              </CardDescription>
            </>
          )}
        </CardHeader>

        {!success && (
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium text-sm">
                  Nueva contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={8}
                  className="border-gray-200 focus:border-zuli-veronica focus:ring-zuli-veronica/20 bg-gray-50 focus:bg-white transition-all"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700 font-medium text-sm">
                  Confirmar contraseña
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={8}
                  className="border-gray-200 focus:border-zuli-veronica focus:ring-zuli-veronica/20 bg-gray-50 focus:bg-white transition-all"
                  placeholder="Repite la contraseña"
                />
              </div>

              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full btn-zuli-gradient py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  "Actualizar contraseña"
                )}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="text-zuli-veronica hover:text-zuli-veronica-600 font-medium transition-colors text-sm"
                  disabled={loading}
                >
                  Volver al inicio de sesión
                </button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Footer */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
        <p className="text-xs text-gray-400">
          © 2025 ZULI. La plataforma de IA para decisiones clínicas{" "}
          <span className="font-brygada italic text-zuli-indigo">confiables</span>.
        </p>
      </div>
    </div>
  )
}
