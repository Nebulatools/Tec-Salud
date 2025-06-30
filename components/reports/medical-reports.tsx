// Medical reports component matching the design
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { FileText, Plus, Search, Download, Calendar, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import AddReportForm from "./add-report-form"
import ConfirmDeleteModal from "@/components/ui/confirm-delete-modal"
import NotificationModal from "@/components/ui/notification-modal"

interface MedicalReport {
  id: string
  report_type: string
  title: string
  content: string
  original_transcript?: string
  ai_suggestions?: string[]
  compliance_status?: boolean
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
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Estados para los modales elegantes
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<MedicalReport | null>(null)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [notificationData, setNotificationData] = useState<{
    type: "success" | "error" | "warning"
    title: string
    description: string
  } | null>(null)

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
    if (!user) {
      console.log("No user found")
      return
    }

    try {
      // Obtener el doctor actual
      console.log("Fetching doctor for user:", user.id)
      const { data: doctor, error: doctorError } = await supabase.from("doctors").select("id").eq("user_id", user.id).single()
      
      if (doctorError) {
        console.error("Error fetching doctor:", doctorError)
        console.log("Doctor error code:", doctorError.code)
        console.log("Doctor error details:", doctorError.details)
        return
      }
      
      if (!doctor) {
        console.log("No doctor found for user")
        return
      }
      
      console.log("Doctor found:", doctor.id)

      // Primero obtener los pacientes del doctor
      const { data: patients, error: patientsError } = await supabase
        .from("patients")
        .select("id")
        .eq("doctor_id", doctor.id)
      
      if (patientsError) {
        console.error("Error fetching patients:", patientsError)
        return
      }

      if (!patients || patients.length === 0) {
        console.log("No patients found for doctor")
        setReports([])
        return
      }

      console.log(`Found ${patients.length} patients for doctor`)

      // Ahora obtener TODOS los reportes de los pacientes del doctor
      const patientIds = patients.map(p => p.id)
      
      // Fetch all reports for the doctor's patients
      const { data: reportsData, error: reportsError } = await supabase
        .from('medical_reports')
        .select(`
          *,
          patient:patients (
            first_name,
            last_name
          )
        `)
        .in('patient_id', patientIds)
        .order('created_at', { ascending: false })

      if (reportsError) {
        console.error("Error fetching reports:", reportsError)
        return
      }

      console.log("Reports received:", reportsData?.length || 0)
      
      if (reportsData) {
        setReports(reportsData)
        console.log("Reports set in state:", reportsData.length)
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

  const handleDeleteClick = (report: MedicalReport) => {
    setReportToDelete(report)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!reportToDelete) return

    setIsDeleting(true)
    setShowDeleteModal(false)

    try {
      const { error } = await supabase
        .from('medical_reports')
        .delete()
        .eq('id', reportToDelete.id)

      if (error) {
        console.error('Error deleting report:', error)
        setNotificationData({
          type: "error",
          title: "Error al eliminar",
          description: `No se pudo eliminar el reporte "${reportToDelete.title}". Por favor, inténtalo de nuevo.`
        })
        setShowNotificationModal(true)
        return
      }

      // Refresh the reports list
      fetchReports()
      
      // Clear selection if deleted report was selected
      if (selectedReport?.id === reportToDelete.id) {
        setSelectedReport(null)
      }

      setNotificationData({
        type: "success",
        title: "Reporte eliminado",
        description: `El reporte "${reportToDelete.title}" ha sido eliminado exitosamente.`
      })
      setShowNotificationModal(true)
    } catch (error) {
      console.error('Error deleting report:', error)
      setNotificationData({
        type: "error",
        title: "Error inesperado",
        description: "Ocurrió un error inesperado al eliminar el reporte. Por favor, inténtalo de nuevo."
      })
      setShowNotificationModal(true)
    } finally {
      setIsDeleting(false)
      setReportToDelete(null)
    }
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
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">
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
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {report.patient.first_name} {report.patient.last_name}
                            </p>

                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{report.title}</p>
                                                      {(() => {
                              const suggestions = (report.ai_suggestions as any)?.consultationData?.reportData?.suggestions || report.ai_suggestions;
                              if (!Array.isArray(suggestions) || suggestions.length === 0) return null;
                              
                              return (
                                <div className="mt-2 space-y-1">
                                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                    🤖 {suggestions.length} sugerencias de IA:
                                  </p>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                    {suggestions.slice(0, 2).map((suggestion: string, index: number) => (
                                      <p key={index} className="truncate">
                                        • {suggestion}
                                      </p>
                                    ))}
                                    {suggestions.length > 2 && (
                                      <p className="text-blue-500 font-medium">
                                        +{suggestions.length - 2} más...
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
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
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteClick(selectedReport)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {isDeleting ? 'Eliminando...' : 'Eliminar'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Calendar className="h-4 w-4" />
                  Creado el {formatDate(selectedReport.created_at)}
                  {selectedReport.compliance_status && (
                    <Badge variant="success" className="ml-2">
                      ✓ Cumple Normativa
                    </Badge>
                  )}
                </div>

                {/* Reporte Principal */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Reporte Médico</h3>
                  <div className="prose dark:prose-invert max-w-none">
                    <div 
                      className="whitespace-pre-wrap text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 p-4 rounded-lg"
                      dangerouslySetInnerHTML={{ 
                        __html: selectedReport.content
                          .replace(/### 🤖 Sugerencias Clínicas de IA/g, '<h3 class="text-lg font-bold mt-4 mb-2">🤖 Sugerencias Clínicas de IA</h3>')
                          .replace(/### /g, '<h3 class="text-lg font-bold mt-4 mb-2">')
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br />')
                      }}
                    />
                  </div>
                </div>

                {/* Transcript Original */}
                {selectedReport.original_transcript && (
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Transcripción Original</h3>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {selectedReport.original_transcript}
                      </p>
                    </div>
                  </div>
                )}

                {/* Sugerencias de IA */}
                {(() => {
                  // Acceder a las sugerencias en la ruta correcta
                  const suggestions = (selectedReport.ai_suggestions as any)?.consultationData?.reportData?.suggestions || selectedReport.ai_suggestions;
                  const isValidArray = Array.isArray(suggestions) && suggestions.length > 0;
                  
                  return isValidArray ? (
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        🤖 Sugerencias Clínicas de IA
                      </h3>
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                        <ul className="space-y-2">
                          {suggestions.map((suggestion: string, index: number) => (
                            <li key={index} className="text-sm text-green-800 dark:text-green-200 flex items-start gap-2">
                              <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : null;
                })()}
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

      {/* Modales elegantes */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Reporte Médico"
        description="¿Estás seguro de que quieres eliminar este reporte médico? Toda la información se perderá permanentemente."
        itemName={reportToDelete?.title}
        isLoading={isDeleting}
      />

      <NotificationModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        type={notificationData?.type || "success"}
        title={notificationData?.title || ""}
        description={notificationData?.description || ""}
      />
    </div>
  )
}
