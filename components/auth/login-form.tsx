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
import { Loader2, CheckCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"

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
              <Label htmlFor="password" className="text-gray-700 font-medium text-sm">
                Contraseña
              </Label>
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
              disabled={loading}
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

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError("")
                  setSuccess("")
                }}
                className="text-zuli-veronica hover:text-zuli-veronica-600 font-medium transition-colors text-sm"
                disabled={loading}
              >
                {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
              </button>
            </div>
          </form>
        </CardContent>
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
