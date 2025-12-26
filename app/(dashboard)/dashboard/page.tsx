// Dashboard page within dashboard layout
"use client"

import DashboardStats from "@/components/dashboard/dashboard-stats"
import PendingAppointments from "@/components/dashboard/pending-appointments"
import CalendarWidget from "@/components/dashboard/calendar-widget"

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return "Buenos días"
  if (hour >= 12 && hour < 19) return "Buenas tardes"
  return "Buenas noches"
}

export default function DashboardPage() {
  const currentDate = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const greeting = getTimeBasedGreeting()

  return (
    <div className="space-y-6">
      {/* Header with greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between animate-fadeIn">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{greeting}</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 capitalize">{currentDate}</p>
        </div>
      </div>

      {/* Stats */}
      <DashboardStats />

      {/* Calendar Widget */}
      <CalendarWidget />

      {/* Pending Appointments */}
      <PendingAppointments />
    </div>
  )
}
