// Header component that works with collapsible sidebar
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Search, Bell, LogOut, User, Settings } from "lucide-react"
import { useRouter } from "next/navigation"

export default function Header() {
  const { user } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
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
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-100 border-0 focus:bg-white focus:ring-2 focus:ring-primary-400"
            />
          </div>
        </div>

        {/* Right side - Notifications and User */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
          </Button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 hover:bg-gray-100">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary-400 text-white">
                    {doctorInfo ? `${doctorInfo.first_name?.[0]}${doctorInfo.last_name?.[0]}` : 'Dr'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {doctorInfo ? `Dr. ${doctorInfo.first_name} ${doctorInfo.last_name}` : 'Dr.'}
                  </p>
                  <p className="text-xs text-gray-500">{doctorInfo?.specialty || 'Cargando...'}</p>
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
