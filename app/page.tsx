// Home page that redirects to dashboard or login
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const routeByRole = async () => {
      if (!user) {
        router.push("/login")
        return
      }

      const { data: appUser } = await supabase.from("app_users").select("role").eq("id", user.id).maybeSingle()
      if (appUser?.role === "user") {
        router.push("/user")
      } else {
        router.push("/dashboard")
      }
    }

    if (!loading) {
      routeByRole()
    }
  }, [user, loading, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
    </div>
  )
}
