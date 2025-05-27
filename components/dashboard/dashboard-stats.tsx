// Dashboard statistics cards component
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Calendar, Users, FileText, Clock } from "lucide-react"

interface Stats {
  totalPatients: number
  todayAppointments: number
  thisWeekAppointments: number
  totalReports: number
}

export default function DashboardStats() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats>({
    totalPatients: 0,
    todayAppointments: 0,
    thisWeekAppointments: 0,
    totalReports: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return

      try {
        // Get doctor info
        const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user.id).single()

        if (!doctor) return

        // Get total patients
        const { count: patientsCount } = await supabase
          .from("patients")
          .select("*", { count: "exact", head: true })
          .eq("doctor_id", doctor.id)

        // Get today's appointments
        const today = new Date().toISOString().split("T")[0]
        const { count: todayCount } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("doctor_id", doctor.id)
          .eq("appointment_date", today)

        // Get this week's appointments
        const startOfWeek = new Date()
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(endOfWeek.getDate() + 6)

        const { count: weekCount } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("doctor_id", doctor.id)
          .gte("appointment_date", startOfWeek.toISOString().split("T")[0])
          .lte("appointment_date", endOfWeek.toISOString().split("T")[0])

        // Get total reports
        const { count: reportsCount } = await supabase
          .from("medical_reports")
          .select("*", { count: "exact", head: true })
          .eq("doctor_id", doctor.id)

        setStats({
          totalPatients: patientsCount || 0,
          todayAppointments: todayCount || 0,
          thisWeekAppointments: weekCount || 0,
          totalReports: reportsCount || 0,
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user])

  const statCards = [
    {
      title: "Total Pacientes",
      value: stats.totalPatients,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Consultas Hoy",
      value: stats.todayAppointments,
      icon: Calendar,
      color: "text-green-600 dark:text-green-400",
    },
    {
      title: "Esta Semana",
      value: stats.thisWeekAppointments,
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400",
    },
    {
      title: "Reportes",
      value: stats.totalReports,
      icon: FileText,
      color: "text-purple-600 dark:text-purple-400",
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full bg-gray-100 dark:bg-gray-800 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
