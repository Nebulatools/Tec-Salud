// Dashboard layout que incluye el sidebar en TODAS las páginas
"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useAppUser } from "@/hooks/use-app-user"
import Sidebar from "@/components/layout/sidebar"
import Header from "@/components/layout/header"
import { RecordingProvider } from "@/contexts/recording-context"
import RecordingPill from "@/components/recording/recording-pill"
import StopRecordingModal from "@/components/recording/stop-recording-modal"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const { role, loading: profileLoading } = useAppUser()
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!profileLoading && role === "user") {
      router.push("/user")
    }
  }, [profileLoading, role, router])

  // Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved) {
      setSidebarCollapsed(JSON.parse(saved))
    }
  }, [])

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zuli-mesh">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-zuli-veronica/20 border-t-zuli-veronica"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <RecordingProvider>
      <div className="min-h-screen bg-zuli-mesh flex">
        <Sidebar onCollapseChange={setSidebarCollapsed} />

        {/* Main content area that takes remaining space */}
        <div className="flex-1 transition-all duration-300 ease-in-out">
          <Header />
          <main className="p-6">{children}</main>
        </div>

        {/* Global recording components - persist across navigation */}
        <RecordingPill />
        <StopRecordingModal />
      </div>
    </RecordingProvider>
  )
}
