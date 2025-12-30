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
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { useAppUser } from "@/hooks/use-app-user"
import { useFamilyProfile, relationshipLabels } from "@/hooks/use-family-profile"
import { supabase } from "@/lib/supabase"
import { Bell, LogOut, User, Settings, Heart, Users, ChevronDown, Check, Baby, PersonStanding } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

// Relationship icons mapping
const relationshipIcons: Record<string, typeof User> = {
  self: User,
  spouse: Heart,
  child: Baby,
  parent: PersonStanding,
  sibling: Users,
  grandparent: PersonStanding,
  other: User,
}

export default function UserHeader() {
  const { user } = useAuth()
  const { appUser } = useAppUser()
  const { familyMembers, selectedMember, loading: familyLoading, selectMember } = useFamilyProfile()
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

  const getSelectedMemberInitials = () => {
    if (selectedMember?.profile_data?.name) {
      const parts = selectedMember.profile_data.name.split(" ")
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      }
      return selectedMember.profile_data.name[0].toUpperCase()
    }
    return "?"
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

        {/* Right side - Family selector, Notifications and User */}
        <div className="flex items-center gap-4">
          {/* Family Profile Selector */}
          {familyMembers.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 hover:bg-white/10 text-white px-3 py-2 h-auto"
                  disabled={familyLoading}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zuli-veronica to-zuli-indigo flex items-center justify-center">
                      {selectedMember && (() => {
                        const Icon = relationshipIcons[selectedMember.relationship] || User
                        return <Icon className="h-4 w-4 text-white" />
                      })()}
                    </div>
                    <div className="text-left hidden sm:block">
                      <p className="text-sm font-medium text-white leading-tight">
                        {selectedMember?.profile_data?.name || "Seleccionar"}
                      </p>
                      <p className="text-xs text-zuli-indigo/80">
                        {selectedMember ? relationshipLabels[selectedMember.relationship] || "Familiar" : "Perfil"}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-white/60" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="flex items-center gap-2 text-gray-500">
                  <Users className="h-4 w-4" />
                  Seleccionar Perfil
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {familyMembers.map((member) => {
                  const Icon = relationshipIcons[member.relationship] || User
                  const isSelected = selectedMember?.id === member.id
                  return (
                    <DropdownMenuItem
                      key={member.id}
                      onClick={() => selectMember(member.id)}
                      className={cn(
                        "flex items-center gap-3 cursor-pointer",
                        isSelected && "bg-zuli-veronica/10"
                      )}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          member.is_primary
                            ? "bg-gradient-to-br from-zuli-veronica to-zuli-indigo"
                            : "bg-gray-100"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            member.is_primary ? "text-white" : "text-gray-600"
                          )}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {member.profile_data?.name || "Sin nombre"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {relationshipLabels[member.relationship] || "Familiar"}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-zuli-veronica" />
                      )}
                    </DropdownMenuItem>
                  )
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push("/user/familia")}
                  className="flex items-center gap-2 text-zuli-veronica"
                >
                  <Users className="h-4 w-4" />
                  Administrar Familia
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-white/10"
          >
            <Bell className="h-5 w-5 text-white" />
          </Button>

          {/* Health indicator - only show if single member or no family */}
          {familyMembers.length <= 1 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg border border-white/10">
              <Heart className="h-4 w-4 text-zuli-veronica" />
              <span className="text-sm text-white">Tu Salud</span>
            </div>
          )}

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
