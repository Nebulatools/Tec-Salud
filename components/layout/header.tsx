// Header component that works with collapsible sidebar
"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Search, Bell, LogOut, User, Settings } from "lucide-react"
import { useRouter } from "next/navigation"

interface HeaderProps {
  onSearchClick?: () => void
}

export default function Header({ onSearchClick }: HeaderProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [doctorInfo, setDoctorInfo] = useState<{ first_name: string; last_name: string; specialty: string } | null>(null)

  useEffect(() => {
    const fetchDoctorInfo = async () => {
      if (user) {
        const { data, error } = await supabase
          .from("doctors")
          .select("first_name, last_name, specialty")
          .eq("user_id", user.id)
          .single()
        
        if (data && !error) {
          setDoctorInfo(data)
        }
      }
    }
    
    fetchDoctorInfo()
  }, [user])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <header className="bg-zuli-space border-b border-white/10 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Search Bar - Opens Command Palette */}
        <div className="flex-1 max-w-md mx-8">
          <button
            onClick={onSearchClick}
            className="w-full relative flex items-center bg-white/90 hover:bg-white rounded-md px-3 py-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-zuli-veronica/30"
          >
            <Search className="h-4 w-4 text-gray-400 mr-3" />
            <span className="flex-1 text-gray-400 text-sm">Buscar pacientes, consultas...</span>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded border border-gray-200">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
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
                  <AvatarFallback className="bg-zuli-tricolor text-white font-medium">
                    {doctorInfo ? `${doctorInfo.first_name?.[0]}${doctorInfo.last_name?.[0]}` : 'Dr'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium text-white">
                    {doctorInfo ? `Dr. ${doctorInfo.first_name} ${doctorInfo.last_name}` : 'Dr.'}
                  </p>
                  <p className="text-xs text-zuli-indigo">{doctorInfo?.specialty || 'General Medicine'}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem>
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
