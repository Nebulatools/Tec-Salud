// Sidebar base reutilizable para admin y usuario
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Menu, X, ChevronLeft, ChevronRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type NavItem = {
  name: string
  href: string
  icon: LucideIcon
  matchPrefix?: boolean
}

type BaseSidebarProps = {
  navItems: NavItem[]
  storageKey: string
  logoSlot: React.ReactNode
  footerSlot?: React.ReactNode
  onCollapseChange?: (collapsed: boolean) => void
}

export function BaseSidebar({ navItems, storageKey, logoSlot, footerSlot, onCollapseChange }: BaseSidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      const collapsed = JSON.parse(saved)
      setIsCollapsed(collapsed)
      onCollapseChange?.(collapsed)
    }
  }, [storageKey, onCollapseChange])

  const toggleCollapsed = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem(storageKey, JSON.stringify(newState))
    onCollapseChange?.(newState)
  }

  const isActive = (item: NavItem) => {
    if (item.matchPrefix) {
      return pathname.startsWith(item.href)
    }
    return pathname === item.href
  }

  const renderNav = (mobile = false) => (
    <nav className={cn("flex-1 px-2 space-y-1", mobile ? "mt-6" : "mt-4")}>
      {navItems.map((item) => {
        const active = isActive(item)
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative",
              active ? "sidebar-active" : "text-gray-400 hover:bg-white/5 hover:text-white",
              isCollapsed && !mobile && "justify-center px-2",
            )}
            title={isCollapsed && !mobile ? item.name : undefined}
            onClick={() => mobile && setIsOpen(false)}
          >
            <item.icon className={cn("h-5 w-5 flex-shrink-0", active && "text-white")} />
            {(!isCollapsed || mobile) && <span className="truncate">{item.name}</span>}
            {isCollapsed && !mobile && (
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg border border-white/10">
                {item.name}
              </div>
            )}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50 bg-white shadow-md hover:bg-gray-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6 text-gray-900" /> : <Menu className="h-6 w-6 text-gray-900" />}
      </Button>

      <div
        className={cn(
          "hidden md:flex relative bg-gray-900 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64",
        )}
        style={{ backgroundColor: "#141633" }}
      >
        <div className="flex flex-col h-full w-full">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center justify-center w-full">{logoSlot}</div>
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

          {renderNav(false)}

          {!isCollapsed && footerSlot && <div className="p-4">{footerSlot}</div>}
        </div>
      </div>

      <div
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ backgroundColor: "#141633" }}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center p-6 pt-16">{logoSlot}</div>
          {renderNav(true)}
          {footerSlot && <div className="p-4">{footerSlot}</div>}
        </div>
      </div>

      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
