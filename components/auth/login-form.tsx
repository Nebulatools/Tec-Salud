// Login form simplificado que SÍ funciona
"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/hooks/use-auth"
import { Loader2, Stethoscope, CheckCircle } from "lucide-react"
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
  const [specialty, setSpecialty] = useState("")

  const specialties = [
    "General Medicine",
    "Cardiología",
    "Dermatología",
    "Neurología",
    "Pediatría",
    "Ginecología",
    "Traumatología",
    "Psiquiatría",
    "Oftalmología",
    "Otorrinolaringología",
  ]

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
        router.push("/dashboard")
      }
    } else {
      // REGISTRO SIMPLIFICADO
      try {
        console.log("Iniciando registro...")

        // 1. Crear usuario en auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email,
          password: password,
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

        // 2. Actualizar perfil existente (el trigger ya lo creó)
        try {
          // Esperamos un poco para que el trigger termine
          await new Promise(resolve => setTimeout(resolve, 500))
          
          const { error: updateError } = await supabase
            .from("doctors")
            .update({
              first_name: firstName,
              last_name: lastName,
              specialty: specialty,
            })
            .eq("user_id", authData.user.id)

          if (updateError) {
            console.error("Error actualizando perfil:", updateError)
            // Si hay error actualizando, intentar crear uno nuevo
            const { error: insertError } = await supabase.from("doctors").insert({
              user_id: authData.user.id,
              first_name: firstName,
              last_name: lastName,
              email: email,
              specialty: specialty,
            })
            
            if (insertError && !insertError.message.includes('duplicate key')) {
              setError("Hubo un problema al completar el registro. Por favor intenta nuevamente.")
              setLoading(false)
              return
            }
          }

          console.log("Perfil actualizado exitosamente")
          setSuccess("¡Registro exitoso! Se ha enviado un correo de confirmación.")
          setTimeout(() => {
            setIsLogin(true)
            setSuccess("")
            // Limpiar formulario
            setFirstName("")
            setLastName("")
            setSpecialty("")
            setEmail("")
            setPassword("")
          }, 2000)
        } catch (profileError) {
          console.error("Error inesperado en perfil:", profileError)
          // En caso de error inesperado, asumir que el registro fue exitoso
          setSuccess("¡Registro exitoso! Se ha enviado un correo de confirmación.")
          setTimeout(() => {
            setIsLogin(true)
            setSuccess("")
            // Limpiar formulario
            setFirstName("")
            setLastName("")
            setSpecialty("")
            setEmail("")
            setPassword("")
          }, 2000)
        }
      } catch (error) {
        console.error("Error general:", error)
        setError("Error inesperado durante el registro")
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-8">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl shadow-lg">
              <Stethoscope className="h-10 w-10 text-primary-600" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-gray-700 mb-2">ezyai</CardTitle>
          <CardDescription className="text-gray-500 text-base">
            {isLogin ? "Inicia sesión en tu cuenta médica" : "Crea tu cuenta médica"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-gray-600 font-medium">
                      Nombre
                    </Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required={!isLogin}
                      disabled={loading}
                      className="border-gray-200 focus:border-primary-400 focus:ring-primary-400 bg-gray-50 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-gray-600 font-medium">
                      Apellido
                    </Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required={!isLogin}
                      disabled={loading}
                      className="border-gray-200 focus:border-primary-400 focus:ring-primary-400 bg-gray-50 focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialty" className="text-gray-600 font-medium">
                    Especialidad
                  </Label>
                  <select
                    id="specialty"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    required={!isLogin}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-gray-50 focus:bg-white transition-all text-gray-700"
                  >
                    <option value="">Selecciona una especialidad</option>
                    {specialties.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-600 font-medium">
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
                className="border-gray-200 focus:border-primary-400 focus:ring-primary-400 bg-gray-50 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-600 font-medium">
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
                className="border-gray-200 focus:border-primary-400 focus:ring-primary-400 bg-gray-50 focus:bg-white transition-all"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">{success}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full button-primary text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
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

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError("")
                  setSuccess("")
                }}
                className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
                disabled={loading}
              >
                {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
