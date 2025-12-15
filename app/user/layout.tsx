// Layout para vista de usuario/paciente - mismo estilo que admin
"use client"

import type React from "react"
import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useAppUser } from "@/hooks/use-app-user"
import UserSidebar from "@/components/user/user-sidebar"
import UserHeader from "@/components/user/user-header"
import { cn } from "@/lib/utils"

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { loading: profileLoading } = useAppUser()
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  const handleCollapseChange = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed)
  }, [])

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zuli-mesh">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-zuli-veronica/20 border-t-zuli-veronica mx-auto" />
          <p className="text-gray-500 mt-3">Cargando portal...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-zuli-mesh">
      {/* Sidebar */}
      <UserSidebar onCollapseChange={handleCollapseChange} />

      {/* Main content area */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out",
          "md:ml-0" // Sidebar handles its own width
        )}
      >
        {/* Header */}
        <UserHeader />

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>

        {/* Footer */}
        <footer className="border-t bg-white/80 backdrop-blur-sm py-4 px-6">
          <div className="max-w-7xl mx-auto">
            <p className="text-center text-xs text-gray-400">
              Portal de Pacientes · <span className="text-zuli-veronica font-medium">ZULI</span> · Versión 1.0.0
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
