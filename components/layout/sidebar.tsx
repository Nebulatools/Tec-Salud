// ZULI Sidebar - Collapsible navigation with brand styling
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ZuliLogo, ZuliMark } from "@/components/ui/zuli-logo"
import { LayoutDashboard, Users, Menu, X, Activity, ChevronLeft, ChevronRight, Stethoscope } from "lucide-react"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Consulta",
    href: "/consultas",
    icon: Activity,
  },
  {
    name: "Expedientes",
    href: "/expedientes",
    icon: Users,
  },
  {
    name: "Especialistas",
    href: "/especialistas",
    icon: Stethoscope,
  },
]

export default function Sidebar({ onCollapseChange }: { onCollapseChange?: (collapsed: boolean) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  // Auto-close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
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
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newState))
    onCollapseChange?.(newState)
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50 bg-white shadow-md hover:bg-gray-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6 text-gray-900" /> : <Menu className="h-6 w-6 text-gray-900" />}
      </Button>

      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden md:flex relative bg-gray-900 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64",
        )}
        style={{ backgroundColor: "#141633" }}
      >
        <div className="flex flex-col h-full w-full">
          {/* Logo and Collapse Button */}
          <div className="flex items-center justify-between p-4">
            {!isCollapsed ? (
              <div className="flex items-center justify-center w-full bg-white rounded-2xl p-4 shadow-lg">
                <ZuliLogo size="lg" theme="dark" />
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
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 space-y-1 mt-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                    isActive
                      ? "sidebar-active"
                      : "text-gray-400 hover:bg-white/5 hover:text-white",
                    isCollapsed && "justify-center px-2",
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-white")} />
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

          {/* User info at bottom */}
          {!isCollapsed && (
            <div className="p-4">
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
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ backgroundColor: "#141633" }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center p-6 pt-16">
            <div className="bg-white rounded-2xl p-5 shadow-lg w-full flex items-center justify-center">
              <ZuliLogo size="lg" theme="dark" />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "sidebar-active"
                      : "text-gray-400 hover:bg-white/5 hover:text-white",
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className={cn("h-5 w-5", isActive && "text-white")} />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Version info */}
          <div className="p-4">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="w-9 h-9 bg-zuli-tricolor rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">Z</span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400">Versión 1.0.0</p>
                <p className="text-xs text-zuli-indigo">/ soporte</p>
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
