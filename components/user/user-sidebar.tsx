// Sidebar para portal de usuario - mismo estilo que admin
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ZuliLogo, ZuliMark } from "@/components/ui/zuli-logo"
import {
  Home,
  User,
  Stethoscope,
  Upload,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
} from "lucide-react"

const navigation = [
  {
    name: "Mi Portal",
    href: "/user",
    icon: Home,
  },
  {
    name: "Mi Perfil",
    href: "/user/perfil",
    icon: User,
  },
  {
    name: "Especialistas",
    href: "/user/especialistas",
    icon: Stethoscope,
  },
  {
    name: "Laboratorios",
    href: "/user/laboratorios",
    icon: Upload,
  },
]

export default function UserSidebar({
  onCollapseChange,
}: {
  onCollapseChange?: (collapsed: boolean) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  // Auto-close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("user-sidebar-collapsed")
    if (saved) {
      const collapsed = JSON.parse(saved)
      setIsCollapsed(collapsed)
      onCollapseChange?.(collapsed)
    }
  }, [onCollapseChange])

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem("user-sidebar-collapsed", JSON.stringify(newState))
    onCollapseChange?.(newState)
  }

  const isActive = (href: string) => {
    if (href === "/user") {
      return pathname === "/user"
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50 bg-white shadow-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden md:flex relative transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64"
        )}
        style={{ backgroundColor: "#141633" }}
      >
        <div className="flex flex-col h-full w-full">
          {/* Logo and Collapse Button */}
          <div className="flex items-center justify-between p-4">
            {!isCollapsed ? (
              <div className="flex items-center justify-center w-full bg-white rounded-xl p-2 shadow-lg">
                <ZuliLogo size="sm" theme="dark" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <ZuliMark size={32} />
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              className={cn(
                "text-white/80 hover:text-white hover:bg-white/10 transition-colors",
                isCollapsed ? "absolute right-2 top-4" : "ml-2"
              )}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 space-y-1 mt-4">
            {navigation.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                    active
                      ? "sidebar-active"
                      : "text-gray-400 hover:bg-white/5 hover:text-white",
                    isCollapsed && "justify-center px-2"
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className={cn("h-5 w-5 flex-shrink-0", active && "text-white")} />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg border border-white/10">
                      {item.name}
                    </div>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Portal info at bottom */}
          {!isCollapsed && (
            <div className="p-4">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="w-9 h-9 bg-zuli-tricolor rounded-full flex items-center justify-center shadow-md">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400">Portal de Pacientes</p>
                  <p className="text-xs text-zuli-indigo">ZULI</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backgroundColor: "#141633" }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center p-4 pt-16">
            <div className="bg-white rounded-xl p-3 shadow-lg w-full flex items-center justify-center">
              <ZuliLogo size="sm" theme="dark" />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1">
            {navigation.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    active
                      ? "sidebar-active"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className={cn("h-5 w-5", active && "text-white")} />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Portal info */}
          <div className="p-4">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="w-9 h-9 bg-zuli-tricolor rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400">Portal de Pacientes</p>
                <p className="text-xs text-zuli-indigo">ZULI</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
