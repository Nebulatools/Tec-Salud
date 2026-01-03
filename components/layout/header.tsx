// Header component that works with collapsible sidebar
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Search, Bell, LogOut, User, Settings, Check, X, Clock, UserPlus, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

type LinkRequest = {
  id: string
  patient_user_id: string
  status: "pending" | "accepted" | "rejected" | "revoked"
  requested_by: "doctor" | "patient"
  requested_at: string
  patient?: {
    full_name: string | null
    email: string
  }
}

export default function Header() {
  const { user } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [linkRequests, setLinkRequests] = useState<LinkRequest[]>([])
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [doctorInfo, setDoctorInfo] = useState<{
    full_name: string
    specialty: string
    avatar_url: string | null
  } | null>(null)

  const fetchDoctorInfo = async () => {
    if (!user) return

    // Get specialty and doctor_id from doctors table
    const { data: doctorData } = await supabase
      .from("doctors")
      .select("id, specialty")
      .eq("user_id", user.id)
      .single()

    if (doctorData) {
      setDoctorId(doctorData.id)
    }

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

  // Fetch pending link requests for this doctor
  const fetchLinkRequests = async () => {
    if (!doctorId) return

    const { data } = await supabase
      .from("doctor_patient_links")
      .select(`
        id,
        patient_user_id,
        status,
        requested_by,
        requested_at,
        patient:app_users!doctor_patient_links_patient_user_id_fkey(full_name, email)
      `)
      .eq("doctor_id", doctorId)
      .eq("status", "pending")
      .eq("requested_by", "patient")
      .order("requested_at", { ascending: false })

    if (data) {
      setLinkRequests(data.map((r: any) => ({
        id: r.id,
        patient_user_id: r.patient_user_id,
        status: r.status,
        requested_by: r.requested_by,
        requested_at: r.requested_at,
        patient: r.patient ? {
          full_name: r.patient.full_name,
          email: r.patient.email,
        } : undefined,
      })))
    }
  }

  // Accept or reject a link request
  const updateLinkStatus = async (requestId: string, newStatus: "accepted" | "rejected") => {
    setLoadingAction(requestId)
    const { error } = await supabase
      .from("doctor_patient_links")
      .update({
        status: newStatus,
        responded_at: new Date().toISOString(),
      })
      .eq("id", requestId)

    if (!error) {
      setLinkRequests((prev) => prev.filter((r) => r.id !== requestId))
    }
    setLoadingAction(null)
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

  // Fetch link requests when doctorId is available
  useEffect(() => {
    if (doctorId) {
      fetchLinkRequests()

      // Subscribe to new link requests
      const linkChannel = supabase
        .channel("header-link-requests")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "doctor_patient_links",
            filter: `doctor_id=eq.${doctorId}`,
          },
          () => fetchLinkRequests()
        )
        .subscribe()

      return () => {
        supabase.removeChannel(linkChannel)
      }
    }
  }, [doctorId])

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
          {/* Notifications / Link Requests */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative hover:bg-white/10">
                <Bell className="h-5 w-5 text-white" />
                {linkRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-zuli-veronica rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                    {linkRequests.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Solicitudes de Vinculación
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {linkRequests.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  No hay solicitudes pendientes
                </div>
              ) : (
                linkRequests.map((request) => (
                  <div key={request.id} className="p-3 border-b last:border-b-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {request.patient?.full_name || "Paciente"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {request.patient?.email}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {new Date(request.requested_at).toLocaleDateString("es-MX", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 hover:text-green-700"
                          onClick={() => updateLinkStatus(request.id, "accepted")}
                          disabled={loadingAction === request.id}
                        >
                          {loadingAction === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => updateLinkStatus(request.id, "rejected")}
                          disabled={loadingAction === request.id}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

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
