// Header para portal de usuario - mismo estilo que admin
"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { useAppUser } from "@/hooks/use-app-user"
import { supabase } from "@/lib/supabase"
import { Bell, LogOut, User, Settings, Heart } from "lucide-react"
import { useRouter } from "next/navigation"

export default function UserHeader() {
  const { user } = useAuth()
  const { appUser } = useAppUser()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const getInitials = () => {
    if (appUser?.full_name) {
      const parts = appUser.full_name.split(" ")
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      }
      return appUser.full_name[0].toUpperCase()
    }
    if (appUser?.email) {
      return appUser.email[0].toUpperCase()
    }
    return "U"
  }

  return (
    <header className="bg-zuli-space border-b border-white/10 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Welcome message */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-white">
              Bienvenido, {appUser?.full_name?.split(" ")[0] ?? "Paciente"}
            </h1>
            <p className="text-sm text-zuli-indigo">Portal de Pacientes ZULI</p>
          </div>
        </div>

        {/* Right side - Notifications and User */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-white/10"
          >
            <Bell className="h-5 w-5 text-white" />
          </Button>

          {/* Health indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg border border-white/10">
            <Heart className="h-4 w-4 text-zuli-veronica" />
            <span className="text-sm text-white">Tu Salud</span>
          </div>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 hover:bg-white/10 text-white"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-zuli-tricolor text-white font-medium">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-white">
                    {appUser?.full_name ?? "Mi Cuenta"}
                  </p>
                  <p className="text-xs text-zuli-indigo">
                    {appUser?.email ?? ""}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => router.push("/user/perfil")}>
                <User className="mr-2 h-4 w-4" />
                Mi Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/user/laboratorios")}>
                <Settings className="mr-2 h-4 w-4" />
                Mis Laboratorios
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
