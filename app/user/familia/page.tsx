"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  Plus,
  User,
  Heart,
  Baby,
  PersonStanding,
  Loader2,
  CheckCircle,
} from "lucide-react"

interface FamilyMember {
  id: string
  relationship: string
  profile_data: {
    name?: string
    date_of_birth?: string
  }
  is_primary: boolean
  created_at: string
}

interface FamilyGroup {
  id: string
  group_name: string
}

const relationshipConfig: Record<string, { label: string; icon: typeof User; color: string }> = {
  self: { label: "Yo", icon: User, color: "bg-zuli-veronica text-white" },
  spouse: { label: "Cónyuge", icon: Heart, color: "bg-pink-500 text-white" },
  child: { label: "Hijo(a)", icon: Baby, color: "bg-blue-500 text-white" },
  parent: { label: "Padre/Madre", icon: PersonStanding, color: "bg-amber-500 text-white" },
  sibling: { label: "Hermano(a)", icon: Users, color: "bg-green-500 text-white" },
  grandparent: { label: "Abuelo(a)", icon: PersonStanding, color: "bg-purple-500 text-white" },
  other: { label: "Otro", icon: User, color: "bg-gray-500 text-white" },
}

const relationshipOptions = [
  { value: "child", label: "Hijo(a)" },
  { value: "spouse", label: "Cónyuge" },
  { value: "parent", label: "Padre/Madre" },
  { value: "sibling", label: "Hermano(a)" },
  { value: "grandparent", label: "Abuelo(a)" },
  { value: "other", label: "Otro" },
]

export default function FamiliaPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState<FamilyGroup | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addSuccess, setAddSuccess] = useState(false)
  const [newMemberName, setNewMemberName] = useState("")
  const [newMemberRelationship, setNewMemberRelationship] = useState("")
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    async function loadFamily() {
      if (!user) return

      try {
        // First, check if user has a family group
        const { data: groups, error: groupError } = await supabase
          .from("family_groups")
          .select("id, group_name")
          .eq("owner_user_id", user.id)
          .limit(1)

        let existingGroup = groups?.[0] || null

        if (groupError) throw groupError

        // If no group exists, create one
        if (!existingGroup) {
          const { data: newGroup, error: createError } = await supabase
            .from("family_groups")
            .insert({
              owner_user_id: user.id,
              group_name: "Mi Familia",
            })
            .select("id, group_name")
            .single()

          if (createError) throw createError
          existingGroup = newGroup

          // Also add the user as "self" member
          await supabase.from("family_members").insert({
            group_id: newGroup.id,
            user_id: user.id,
            relationship: "self",
            profile_data: { name: user.email?.split("@")[0] || "Yo" },
            is_primary: true,
          })
        }

        setGroup(existingGroup)

        // Fetch all family members
        const { data: membersData, error: membersError } = await supabase
          .from("family_members")
          .select("id, relationship, profile_data, is_primary, created_at")
          .eq("group_id", existingGroup.id)
          .order("is_primary", { ascending: false })
          .order("created_at", { ascending: true })

        if (membersError) throw membersError

        setMembers(membersData || [])
      } catch (err: unknown) {
        const error = err as { message?: string }
        console.error("Error loading family:", error.message || err)
        setError("No se pudo cargar la información familiar")
      } finally {
        setLoading(false)
      }
    }

    loadFamily()
  }, [user])

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!group || !newMemberName.trim() || !newMemberRelationship) return

    setAdding(true)
    setAddError(null)
    setAddSuccess(false)

    try {
      const { data: newMember, error: insertError } = await supabase
        .from("family_members")
        .insert({
          group_id: group.id,
          relationship: newMemberRelationship,
          profile_data: { name: newMemberName.trim() },
          is_primary: false,
        })
        .select("id, relationship, profile_data, is_primary, created_at")
        .single()

      if (insertError) throw insertError

      setMembers((prev) => [...prev, newMember])
      setAddSuccess(true)

      // Reset form after success
      setTimeout(() => {
        setIsModalOpen(false)
        setNewMemberName("")
        setNewMemberRelationship("")
        setAddSuccess(false)
      }, 1500)
    } catch (err: unknown) {
      const error = err as { message?: string }
      console.error("Error adding member:", error.message || err)
      setAddError("No se pudo agregar el familiar")
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-zuli-veronica/20 border-t-zuli-veronica mx-auto" />
          <p className="text-gray-500 mt-3">Cargando familia...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mi Familia</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestiona los perfiles de tus familiares para agendar citas
          </p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="btn-zuli-gradient">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Familiar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-zuli-veronica" />
                Agregar Familiar
              </DialogTitle>
              <DialogDescription>
                Agrega un familiar para poder agendar citas a su nombre
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddMember} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Nombre completo"
                  required
                  disabled={adding}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="relationship">Parentesco *</Label>
                <Select
                  value={newMemberRelationship}
                  onValueChange={setNewMemberRelationship}
                  disabled={adding}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el parentesco" />
                  </SelectTrigger>
                  <SelectContent>
                    {relationshipOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {addError && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">{addError}</AlertDescription>
                </Alert>
              )}

              {addSuccess && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    Familiar agregado exitosamente
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={adding}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={!newMemberName.trim() || !newMemberRelationship || adding}
                  className="flex-1 btn-zuli-gradient"
                >
                  {adding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Agregando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-zuli-veronica/10 to-zuli-indigo/10 border-0">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Users className="h-5 w-5 text-zuli-veronica" />
            </div>
            <div>
              <p className="text-sm text-gray-700">
                <strong>Tip:</strong> Agrega a tus familiares para poder agendar citas médicas a su nombre.
                Podrás seleccionar el paciente al momento de reservar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Family Members Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => {
          const config = relationshipConfig[member.relationship] || relationshipConfig.other
          const Icon = config.icon
          const name = member.profile_data?.name || "Sin nombre"

          return (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-3 rounded-xl ${config.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {name}
                      </h3>
                      {member.is_primary && (
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          Principal
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{config.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {members.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-zuli-veronica/10 to-zuli-indigo/10 flex items-center justify-center">
              <Users className="h-8 w-8 text-zuli-veronica" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Sin familiares registrados
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
              Agrega a tus familiares para poder agendar citas a su nombre.
            </p>
            <Button className="btn-zuli-gradient" onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar primer familiar
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
