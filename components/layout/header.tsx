// Header component that works with collapsible sidebar
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Search, Bell, LogOut, User, Settings } from "lucide-react"
import { useRouter } from "next/navigation"

export default function Header() {
  const { user } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [doctorInfo, setDoctorInfo] = useState<{
    full_name: string
    specialty: string
    avatar_url: string | null
  } | null>(null)

  const fetchDoctorInfo = async () => {
    if (!user) return

    // Get specialty from doctors table
    const { data: doctorData } = await supabase
      .from("doctors")
      .select("specialty")
      .eq("user_id", user.id)
      .single()

    // Get full_name and avatar from app_users
    const { data: appUserData } = await supabase
      .from("app_users")
      .select("full_name, metadata")
      .eq("id", user.id)
      .single()

    const avatarUrl = (appUserData?.metadata as Record<string, unknown>)?.avatar_url as string | null

    setDoctorInfo({
      full_name: appUserData?.full_name || "Doctor",
      specialty: doctorData?.specialty || "General Medicine",
      avatar_url: avatarUrl || null,
    })
  }

  useEffect(() => {
    fetchDoctorInfo()

    // Subscribe to changes on app_users table (name and avatar)
    if (user) {
      const appUserChannel = supabase
        .channel("header-appuser-changes")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "app_users",
            filter: `id=eq.${user.id}`,
          },
          () => fetchDoctorInfo()
        )
        .subscribe()

      return () => {
        supabase.removeChannel(appUserChannel)
      }
    }
  }, [user])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <header className="bg-zuli-space border-b border-white/10 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar pacientes, consultas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/90 border-0 focus:bg-white focus:ring-2 focus:ring-zuli-veronica/30"
            />
          </div>
        </div>

        {/* Right side - Notifications and User */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative hover:bg-white/10">
            <Bell className="h-5 w-5 text-white" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-zuli-veronica rounded-full"></span>
          </Button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/10 text-white">
                <Avatar className="h-8 w-8">
                  {doctorInfo?.avatar_url && (
                    <AvatarImage src={doctorInfo.avatar_url} alt="Foto de perfil" />
                  )}
                  <AvatarFallback className="bg-zuli-tricolor text-white font-medium">
                    {doctorInfo?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "Dr"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium text-white">
                    Dr. {doctorInfo?.full_name || "Doctor"}
                  </p>
                  <p className="text-xs text-zuli-indigo">{doctorInfo?.specialty || "General Medicine"}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => router.push("/perfil")}>
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/configuracion")}>
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </DropdownMenuItem>
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
