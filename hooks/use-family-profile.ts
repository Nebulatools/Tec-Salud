"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"

export interface FamilyMember {
  id: string
  relationship: string
  profile_data: {
    name?: string
    date_of_birth?: string
  }
  is_primary: boolean
  user_id?: string | null
}

interface UseFamilyProfileReturn {
  familyMembers: FamilyMember[]
  selectedMember: FamilyMember | null
  loading: boolean
  error: string | null
  selectMember: (memberId: string) => void
  refreshMembers: () => Promise<void>
}

const STORAGE_KEY = "zuli_selected_family_member"

export function useFamilyProfile(): UseFamilyProfileReturn {
  const { user } = useAuth()
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load family members
  const loadMembers = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setError(null)

      // Get or create family group
      const { data: groups } = await supabase
        .from("family_groups")
        .select("id")
        .eq("owner_user_id", user.id)
        .limit(1)

      let group = groups?.[0] || null

      if (!group) {
        // Create family group and self member
        const { data: newGroup, error: createError } = await supabase
          .from("family_groups")
          .insert({
            owner_user_id: user.id,
            group_name: "Mi Familia",
          })
          .select("id")
          .single()

        if (createError) throw createError
        group = newGroup

        // Add self as primary member
        await supabase.from("family_members").insert({
          group_id: newGroup.id,
          user_id: user.id,
          relationship: "self",
          profile_data: { name: user.email?.split("@")[0] || "Yo" },
          is_primary: true,
        })
      }

      // Fetch all family members
      const { data: members, error: membersError } = await supabase
        .from("family_members")
        .select("id, relationship, profile_data, is_primary, user_id")
        .eq("group_id", group.id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true })

      if (membersError) throw membersError

      setFamilyMembers(members || [])

      // Restore selected member from storage or default to primary
      const storedId = localStorage.getItem(STORAGE_KEY)
      const validStoredMember = members?.find((m) => m.id === storedId)

      if (validStoredMember) {
        setSelectedMemberId(storedId)
      } else {
        // Default to primary (self)
        const primaryMember = members?.find((m) => m.is_primary)
        if (primaryMember) {
          setSelectedMemberId(primaryMember.id)
          localStorage.setItem(STORAGE_KEY, primaryMember.id)
        }
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      console.error("Error loading family members:", error.message || err)
      setError("No se pudo cargar los perfiles familiares")
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const selectMember = useCallback((memberId: string) => {
    const member = familyMembers.find((m) => m.id === memberId)
    if (member) {
      setSelectedMemberId(memberId)
      localStorage.setItem(STORAGE_KEY, memberId)
    }
  }, [familyMembers])

  const selectedMember = familyMembers.find((m) => m.id === selectedMemberId) || null

  return {
    familyMembers,
    selectedMember,
    loading,
    error,
    selectMember,
    refreshMembers: loadMembers,
  }
}

// Relationship labels for display
export const relationshipLabels: Record<string, string> = {
  self: "Yo",
  spouse: "Cónyuge",
  child: "Hijo(a)",
  parent: "Padre/Madre",
  sibling: "Hermano(a)",
  grandparent: "Abuelo(a)",
  other: "Otro",
}
