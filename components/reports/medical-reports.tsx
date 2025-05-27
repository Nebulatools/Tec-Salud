// Medical reports component matching the design
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { FileText, Plus, Search, Download, Calendar } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import AddReportForm from "./add-report-form"

interface MedicalReport {
  id: string
  report_type: string
  title: string
  content: string
  created_at: string
  patient: {
    first_name: string
    last_name: string
  }
}

export default function MedicalReports() {
  const { user } = useAuth()
  const [reports, setReports] = useState<MedicalReport[]>([])
  const [filteredReports, setFilteredReports] = useState<MedicalReport[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedReport, setSelectedReport] = useState<MedicalReport | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  useEffect(() => {
    fetchReports()
  }, [user])

  useEffect(() => {
    const filtered = reports.filter(
      (report) =>
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${report.patient.first_name} ${report.patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredReports(filtered)
  }, [reports, searchTerm])

  const fetchReports = async () => {
    if (!user) return

    try {
      const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user.id).single()
      if (!doctor) return

      const { data } = await supabase
        .from("medical_reports")
        .select(`
          id,
          report_type,
          title,
          content,
          created_at,
          patients!inner (
            first_name,
            last_name
          )
        `)
        .eq("doctor_id", doctor.id)
        .order("created_at", { ascending: false })

      if (data) {
        const formattedReports = data.map((report) => ({
          ...report,
          patient: report.patients,
        }))
        setReports(formattedReports)
      }
    } catch (error) {
      console.error("Error fetching reports:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expedientes</h1>
          <div className="flex gap-4 mt-2">
            <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
              Pacientes
            </button>
            <button className="text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 pb-1 font-medium">
              Reportes
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar reporte"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Reporte
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Reporte Médico</DialogTitle>
              </DialogHeader>
              <AddReportForm
                onSuccess={() => {
                  setIsAddDialogOpen(false)
                  fetchReports()
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Reports Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left side - Reports Generated */}
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Reportes Generados</CardTitle>
              <Button variant="ghost" size="sm" className="text-teal-600 dark:text-teal-400">
                Ver todos
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {filteredReports.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchTerm ? "No se encontraron reportes" : "No hay reportes generados"}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredReports.slice(0, 10).map((report) => (
                    <div
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-l-4 ${
                        selectedReport?.id === report.id
                          ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                          : "border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {report.patient.first_name} {report.patient.last_name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{report.title}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(report.created_at)}</p>
                          <Badge variant="secondary" className="mt-1">
                            {report.report_type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right side - Report details or placeholder */}
        <div>
          {selectedReport ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedReport.title}</h2>
                    <p className="text-gray-500 dark:text-gray-400">
                      {selectedReport.patient.first_name} {selectedReport.patient.last_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{selectedReport.report_type}</Badge>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Descargar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Calendar className="h-4 w-4" />
                  Creado el {formatDate(selectedReport.created_at)}
                </div>

                <div className="prose dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-gray-900 dark:text-white">{selectedReport.content}</div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center">
                  <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg">
                    Selecciona un reporte para ver los detalles
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
