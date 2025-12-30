// ZULI Login Form - Brand styled authentication
"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ZuliLogo } from "@/components/ui/zuli-logo"
import { useAuth } from "@/hooks/use-auth"
import { Loader2, CheckCircle, Mail } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { signInWithGoogle, resetPassword } from "@/lib/supabase-auth"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const { signIn } = useAuth()
  const router = useRouter()

  const [isLogin, setIsLogin] = useState(true)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    if (isLogin) {
      // LOGIN
      const { error } = await signIn(email, password)
      if (error) {
        setError(error.message)
      } else {
        const { data: userData } = await supabase.auth.getUser()
        const userId = userData?.user?.id
        if (userId) {
          const { data: appUser } = await supabase.from("app_users").select("role").eq("id", userId).maybeSingle()
          const role = appUser?.role ?? "user"
          router.push(role === "user" ? "/user" : "/dashboard")
        } else {
          router.push("/dashboard")
        }
      }
    } else {
      // REGISTRO SIMPLIFICADO
      try {
        console.log("Iniciando registro...")

        // 1. Crear usuario en auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
            }
          }
        })

        if (authError) {
          console.error("Error en auth.signUp:", authError)
          setError(`Error de autenticación: ${authError.message}`)
          setLoading(false)
          return
        }

        if (!authData.user) {
          setError("No se pudo crear el usuario")
          setLoading(false)
          return
        }

        console.log("Usuario creado:", authData.user.id)

        // 2. Asegurar que el perfil del doctor existe
        setSuccess("¡Registro exitoso! Revisa tu correo para confirmar y luego inicia sesión.")
        setTimeout(() => {
          setIsLogin(true)
          setSuccess("")
          setFirstName("")
          setLastName("")
          setEmail("")
          setPassword("")
        }, 1800)
      } catch (error) {
        console.error("Error general:", error)
        setError("Error inesperado durante el registro")
      }
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError("")
    const { error } = await signInWithGoogle()
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
    // Note: successful OAuth redirects away, so no need to setGoogleLoading(false)
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError("Ingresa tu email para restablecer la contraseña")
      return
    }
    setLoading(true)
    setError("")
    const { error } = await resetPassword(email)
    if (error) {
      setError(error.message)
    } else {
      setSuccess("Te enviamos un enlace para restablecer tu contraseña. Revisa tu correo.")
      setTimeout(() => {
        setShowForgotPassword(false)
        setSuccess("")
      }, 5000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zuli-mesh relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-zuli-veronica/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-zuli-cyan/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-zuli-indigo/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center pb-6">
          {/* ZULI Logo */}
          <div className="flex justify-center mb-6">
            <ZuliLogo size="xl" theme="dark" />
          </div>

          {/* Tagline with Brygada 1918 */}
          <p className="text-sm text-gray-600 font-brygada italic mb-2">
            mejores <span className="text-zuli-veronica">doctores</span>, mejores <span className="text-zuli-veronica">pacientes</span>
          </p>

          <CardDescription className="text-gray-500 text-sm mt-4">
            {isLogin ? "Inicia sesión en tu cuenta" : "Crea tu cuenta médica"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-gray-700 font-medium text-sm">
                      Nombre <span className="text-gray-400">(opcional)</span>
                    </Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={loading}
                      className="border-gray-200 focus:border-zuli-veronica focus:ring-zuli-veronica/20 bg-gray-50 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-gray-700 font-medium text-sm">
                      Apellido <span className="text-gray-400">(opcional)</span>
                    </Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={loading}
                      className="border-gray-200 focus:border-zuli-veronica focus:ring-zuli-veronica/20 bg-gray-50 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="border-gray-200 focus:border-zuli-veronica focus:ring-zuli-veronica/20 bg-gray-50 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-700 font-medium text-sm">
                  Contraseña
                </Label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-zuli-veronica hover:text-zuli-veronica-600 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
                className="border-gray-200 focus:border-zuli-veronica focus:ring-zuli-veronica/20 bg-gray-50 focus:bg-white transition-all"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 text-sm">{success}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full btn-zuli-gradient py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] font-semibold"
              disabled={loading || googleLoading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {isLogin ? "Iniciando sesión..." : "Registrando..."}
                </>
              ) : isLogin ? (
                "Iniciar Sesión"
              ) : (
                "Registrarse"
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400">o continúa con</span>
              </div>
            </div>

            {/* Google Login Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
              className="w-full py-3 rounded-xl border-gray-200 hover:bg-gray-50 transition-all duration-300 font-medium"
            >
              {googleLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Continuar con Google
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError("")
                  setSuccess("")
                }}
                className="text-zuli-veronica hover:text-zuli-veronica-600 font-medium transition-colors text-sm"
                disabled={loading || googleLoading}
              >
                {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-zuli-veronica/10 rounded-full">
                  <Mail className="h-6 w-6 text-zuli-veronica" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Restablecer contraseña</h2>
              <CardDescription className="text-gray-500 text-sm mt-2">
                Ingresa tu email y te enviaremos un enlace para crear una nueva contraseña
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-gray-700 font-medium text-sm">
                    Email
                  </Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="border-gray-200 focus:border-zuli-veronica focus:ring-zuli-veronica/20"
                  />
                </div>

                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700 text-sm">{success}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForgotPassword(false)
                      setError("")
                      setSuccess("")
                    }}
                    disabled={loading}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 btn-zuli-gradient"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Enviar enlace"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

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
