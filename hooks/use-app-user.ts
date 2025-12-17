// Hook to fetch app_users and doctor info (role-aware)
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "./use-auth"

export type AppUser = {
  id: string
  email: string
  role: "user" | "doctor_admin"
  full_name: string | null
  phone: string | null
  metadata: Record<string, unknown>
}

export function useAppUser() {
  const { user, loading: authLoading } = useAuth()
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [provisioningDoctor, setProvisioningDoctor] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setAppUser(null)
        setDoctorId(null)
        setIsLoading(false)
        return
      }

      const { data: appUserData } = await supabase
        .from("app_users")
        .select("id, email, role, full_name, phone, metadata")
        .eq("id", user.id)
        .maybeSingle()

      setAppUser(appUserData ?? null)

      const { data: doctor } = await supabase.from("doctors").select("id, is_specialist").eq("user_id", user.id).maybeSingle()
      setDoctorId(doctor?.id ?? null)

      setIsLoading(false)
    }

    if (!authLoading) {
      load()
    }
  }, [user, authLoading])

  // Auto-provision doctor row for admins if missing to avoid frontend errors
  useEffect(() => {
    const ensureDoctor = async () => {
      if (!user || !appUser) return
      if (appUser.role !== "doctor_admin") return
      if (doctorId || provisioningDoctor) return

      setProvisioningDoctor(true)
      setIsLoading(true)
      const firstName = (appUser.metadata?.first_name as string | undefined) || appUser.full_name?.split(" ")[0] || "Admin"
      const lastName = (appUser.metadata?.last_name as string | undefined) || "User"
      const specialty = (appUser.metadata?.specialty as string | undefined) || "General Medicine"

      const { data, error } = await supabase
        .from("doctors")
        .upsert(
          {
            user_id: user.id,
            email: appUser.email,
            first_name: firstName,
            last_name: lastName,
            specialty,
            doctor_role: "admin",
            is_specialist: true,
            profile_id: user.id,
          },
          { onConflict: "user_id" },
        )
        .select("id")
        .maybeSingle()

      if (!error && data?.id) {
        setDoctorId(data.id)
      }
      setProvisioningDoctor(false)
      setIsLoading(false)
    }

    ensureDoctor()
  }, [appUser, doctorId, provisioningDoctor, user])

  const role = appUser?.role ?? "user"
  const isDoctor = role === "doctor_admin"
  const isSpecialist = false

  return {
    appUser,
    role,
    isDoctor,
    isSpecialist,
    doctorId,
    loading: isLoading || authLoading,
  }
}
