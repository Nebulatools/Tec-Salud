// Sidebar collapsible que aparece en todas las páginas
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Users, Menu, X, Activity, ChevronLeft, ChevronRight } from "lucide-react"

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
        className="md:hidden fixed top-4 left-4 z-50 bg-white shadow-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden md:flex relative bg-blue-900 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        <div className="flex flex-col h-full w-full">
          {/* Logo and Collapse Button */}
          <div className="flex items-center justify-between p-4">
            {!isCollapsed && (
              <div className="flex items-center justify-center w-full bg-white rounded-3xl p-4 shadow-lg">
                <Image
                  src="/tecsalud.png"
                  alt="TecSalud"
                  width={220}
                  height={90}
                  className="object-contain w-48 xl:w-56 h-auto"
                />
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              className="text-white hover:bg-blue-800 ml-auto"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                    isActive
                      ? "bg-orange-500 text-white shadow-lg"
                      : "text-gray-300 hover:bg-blue-800 hover:text-white",
                    isCollapsed && "justify-center px-2",
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
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
              <div className="flex items-center gap-2 p-3 bg-blue-800 rounded-lg">
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">N</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-300">Versión 1.0.0</p>
                  <p className="text-xs text-gray-400">/ soporte</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-40 w-64 bg-blue-900 transform transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl p-5 shadow-lg w-full flex items-center justify-center">
              <Image
                src="/tecsalud.png"
                alt="TecSalud"
                width={200}
                height={80}
                className="object-contain w-44 h-auto"
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-orange-500 text-white shadow-lg"
                      : "text-gray-300 hover:bg-blue-800 hover:text-white",
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Version info */}
          <div className="p-4">
            <div className="flex items-center gap-2 p-3 bg-blue-800 rounded-lg">
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">N</span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-300">Versión 1.0.0</p>
                <p className="text-xs text-gray-400">/ soporte</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30" onClick={() => setIsOpen(false)} />
      )}
    </>
  )
}
