// Sidebar para portal de usuario - mismo estilo que admin
"use client"

import { Home, User, Stethoscope, Upload } from "lucide-react"
import { BaseSidebar } from "@/components/layout/base-sidebar"
import { ZuliLogo } from "@/components/ui/zuli-logo"

const navigation = [
  { name: "Mi Portal", href: "/user", icon: Home, matchPrefix: true },
  { name: "Mi Perfil", href: "/user/perfil", icon: User, matchPrefix: true },
  { name: "Especialistas", href: "/user/especialistas", icon: Stethoscope, matchPrefix: true },
  { name: "Laboratorios", href: "/user/laboratorios", icon: Upload, matchPrefix: true },
]

export default function UserSidebar({ onCollapseChange }: { onCollapseChange?: (collapsed: boolean) => void }) {
  return (
    <BaseSidebar
      navItems={navigation}
      storageKey="user-sidebar-collapsed"
      onCollapseChange={onCollapseChange}
      logoSlot={
        <div className="flex items-center justify-center w-full bg-white rounded-xl p-2 shadow-lg">
          <ZuliLogo size="sm" theme="dark" />
        </div>
      }
      footerSlot={
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
          <div className="w-9 h-9 bg-zuli-tricolor rounded-full flex items-center justify-center shadow-md">
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-400">Portal de Pacientes</p>
            <p className="text-xs text-zuli-indigo">ZULI</p>
          </div>
        </div>
      }
    />
  )
}
