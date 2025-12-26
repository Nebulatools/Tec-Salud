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
      color: "text-zuli-veronica",
      bgColor: "bg-zuli-veronica/10",
    },
    {
      title: "Consultas Hoy",
      value: stats.todayAppointments,
      icon: Calendar,
      color: "text-zuli-indigo",
      bgColor: "bg-zuli-indigo/10",
    },
    {
      title: "Esta Semana",
      value: stats.thisWeekAppointments,
      icon: Clock,
      color: "text-zuli-cyan-600",
      bgColor: "bg-zuli-cyan/10",
    },
    {
      title: "Reportes",
      value: stats.totalReports,
      icon: FileText,
      color: "text-zuli-space",
      bgColor: "bg-zuli-space/10",
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-3 flex-1">
                  <div className="h-4 w-24 rounded animate-shimmer" />
                  <div className="h-8 w-16 rounded animate-shimmer" style={{ animationDelay: '0.1s' }} />
                </div>
                <div className="h-14 w-14 rounded-2xl animate-shimmer" style={{ animationDelay: '0.2s' }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <Card
          key={index}
          className="group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 border-transparent hover:border-zuli-veronica/20 overflow-hidden animate-fadeInUp"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <CardContent className="p-6 relative">
            {/* Gradient accent on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-zuli-veronica/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Content with improved spacing */}
            <div className="relative flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 tracking-wide uppercase">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                  {stat.value}
                </p>
              </div>
              <div className={`p-4 rounded-2xl ${stat.bgColor} ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
