// ZULI Sidebar - Collapsible navigation with brand styling
"use client"

import { LayoutDashboard, Users, Activity, FileText, User as UserIcon, QrCode, Building2, ShieldCheck, FolderOpen } from "lucide-react"
import { BaseSidebar } from "@/components/layout/base-sidebar"
import { ZuliLogo } from "@/components/ui/zuli-logo"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Consulta", href: "/consultas", icon: Activity, matchPrefix: true },
  { name: "Expedientes", href: "/expedientes", icon: FolderOpen, matchPrefix: true },
  { name: "Recetas", href: "/recetas", icon: FileText, matchPrefix: true },
  { name: "QR Codes", href: "/qr-codes", icon: QrCode, matchPrefix: true },
  { name: "Consultorios", href: "/consultorios", icon: Building2, matchPrefix: true },
  { name: "Verificación", href: "/verificacion", icon: ShieldCheck },
  { name: "Perfil", href: "/perfil", icon: UserIcon },
]

export default function Sidebar({ onCollapseChange }: { onCollapseChange?: (collapsed: boolean) => void }) {
  return (
    <BaseSidebar
      navItems={navigation}
      storageKey="sidebar-collapsed"
      onCollapseChange={onCollapseChange}
      logoSlot={
        <div className="flex items-center justify-center w-full bg-white rounded-xl p-2 shadow-lg">
          <ZuliLogo size="sm" theme="dark" />
        </div>
      }
      footerSlot={
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
          <div className="w-9 h-9 bg-zuli-tricolor rounded-full flex items-center justify-center shadow-md">
            <span className="text-white text-sm font-bold">Z</span>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-400">Versión 1.0.0</p>
            <p className="text-xs text-zuli-indigo hover:text-zuli-cyan transition-colors cursor-pointer">
              / soporte
            </p>
          </div>
        </div>
      }
    />
  )
}
