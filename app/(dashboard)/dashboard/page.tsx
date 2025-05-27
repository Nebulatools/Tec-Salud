// Dashboard page within dashboard layout
"use client"

import DashboardStats from "@/components/dashboard/dashboard-stats"
import PendingAppointments from "@/components/dashboard/pending-appointments"
import CalendarWidget from "@/components/dashboard/calendar-widget"

export default function DashboardPage() {
  const currentDate = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
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
