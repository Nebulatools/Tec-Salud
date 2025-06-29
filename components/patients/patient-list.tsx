// Patient list component matching the design from images
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Search, Plus, User, Trash2, Edit, MoreVertical, FileText, Calendar } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import AddPatientForm from "./add-patient-form"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import EditPatientForm from "./edit-patient-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ReportViewerModal from "@/components/reports/report-viewer-modal"
import ConfirmDeleteModal from "@/components/ui/confirm-delete-modal"
import NotificationModal from "@/components/ui/notification-modal"

interface Patient {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: "Masculino" | "Femenino" | "Otro"
  phone: string | null
  email: string | null
  address: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  medical_history: string | null
  allergies: string | null
  current_medications: string | null
}

interface MedicalReport {
  id: string
  title: string
  report_type: string
  content: string
  created_at: string
  doctors: {
    first_name: string
    last_name: string
  }[]
  compliance_status: boolean
  ai_suggestions: string[]
  original_transcript: string
}

export default function PatientList() {
  const { user } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null)
  const [patientReports, setPatientReports] = useState<MedicalReport[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  
  // Estados para los modales elegantes
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [notificationData, setNotificationData] = useState<{
    type: "success" | "error" | "warning"
    title: string
    description: string
  } | null>(null)

  useEffect(() => {
    fetchPatients()
  }, [user])

  useEffect(() => {
    const filtered = patients.filter((patient) =>
      `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredPatients(filtered)
  }, [patients, searchTerm])

  useEffect(() => {
    if (selectedPatient) {
      fetchPatientReports(selectedPatient.id)
    }
  }, [selectedPatient])

  const fetchPatients = async () => {
    if (!user) return

    try {
      const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user.id).single()

      if (!doctor) return

      const { data } = await supabase
        .from("patients")
        .select("*")
        .eq("doctor_id", doctor.id)
        .order("first_name", { ascending: true })

      if (data) {
        setPatients(data)
      }
    } catch (error) {
      console.error("Error fetching patients:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPatientReports = async (patientId: string) => {
    setLoadingReports(true)
    try {
      // Obtener el doctor actual
      const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user?.id).single()
      if (!doctor) return

      const { data, error } = await supabase
        .from("medical_reports")
        .select(`
          id,
          title,
          report_type,
          content,
          created_at,
          doctors (
            first_name,
            last_name
          ),
          compliance_status,
          ai_suggestions,
          original_transcript
        `)
        .eq("patient_id", patientId)
        .eq("doctor_id", doctor.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching reports:", error)
        setPatientReports([])
      } else {
        setPatientReports(data || [])
      }
    } catch (error) {
      console.error("Error fetching patient reports:", error)
      setPatientReports([])
    } finally {
      setLoadingReports(false)
    }
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }

    return age
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
      "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
      "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  const handleDeleteClick = (patient: Patient) => {
    setPatientToDelete(patient)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!patientToDelete) return

    setIsDeleting(true)
    setShowDeleteModal(false)

    try {
      const { error } = await supabase.from("patients").delete().eq("id", patientToDelete.id)
      if (error) throw error

      // Clear selection if deleted patient was selected
      if (selectedPatient?.id === patientToDelete.id) {
        setSelectedPatient(null)
      }

      fetchPatients()
      
      setNotificationData({
        type: "success",
        title: "Paciente eliminado",
        description: `El paciente ${patientToDelete.first_name} ${patientToDelete.last_name} ha sido eliminado exitosamente.`
      })
      setShowNotificationModal(true)
    } catch (error) {
      console.error("Error deleting patient:", error)
      setNotificationData({
        type: "error",
        title: "Error al eliminar",
        description: `No se pudo eliminar el paciente ${patientToDelete.first_name} ${patientToDelete.last_name}. Por favor, inténtalo de nuevo.`
      })
      setShowNotificationModal(true)
    } finally {
      setIsDeleting(false)
      setPatientToDelete(null)
    }
  }

  const handleViewReport = (report: MedicalReport) => {
    setSelectedReport(report)
    setIsReportModalOpen(true)
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
        <div></div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar paciente"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Paciente</DialogTitle>
              </DialogHeader>
              <div className="max-h-[80vh] overflow-y-auto p-1">
                <AddPatientForm
                  onSuccess={() => {
                    setIsAddDialogOpen(false)
                    fetchPatients()
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto p-1">
              <DialogHeader>
                <DialogTitle>Editar Paciente</DialogTitle>
              </DialogHeader>
              {patientToEdit && (
                <div className="max-h-[80vh] overflow-y-auto p-1">
                  <EditPatientForm
                    patient={patientToEdit}
                    onSuccess={() => {
                      setIsEditDialogOpen(false)
                      setPatientToEdit(null)
                      fetchPatients()
                      // Update selected patient if it's the one being edited
                      if (selectedPatient?.id === patientToEdit.id) {
                        setSelectedPatient(null)
                      }
                    }}
                  />
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Patient List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side - Patient list */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lista de pacientes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredPatients.length === 0 ? (
                <div className="text-center py-8">
                  <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchTerm ? "No se encontraron pacientes" : "No hay pacientes registrados"}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredPatients.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => setSelectedPatient(patient)}
                      className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-l-4 ${
                        selectedPatient?.id === patient.id
                          ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                          : "border-transparent"
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={getAvatarColor(patient.first_name)}>
                          {getInitials(patient.first_name, patient.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {patient.first_name} {patient.last_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {calculateAge(patient.date_of_birth)} años • {patient.gender}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right side - Patient details */}
        <div className="lg:col-span-2">
          {selectedPatient ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className={getAvatarColor(selectedPatient.first_name)}>
                        {getInitials(selectedPatient.first_name, selectedPatient.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedPatient.first_name} {selectedPatient.last_name}
                      </h2>
                      <p className="text-gray-500 dark:text-gray-400">
                        {calculateAge(selectedPatient.date_of_birth)} años • {selectedPatient.gender}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setPatientToEdit(selectedPatient)
                          setIsEditDialogOpen(true)
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(selectedPatient)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="info" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Información Personal
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Reportes Médicos ({patientReports.length})
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="info" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white mb-3">Información Personal</h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Fecha de nacimiento:</span>
                            <span className="text-gray-900 dark:text-white">
                              {new Date(selectedPatient.date_of_birth).toLocaleDateString("es-ES")}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Teléfono:</span>
                            <span className="text-gray-900 dark:text-white">
                              {selectedPatient.phone || "No registrado"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Email:</span>
                            <span className="text-gray-900 dark:text-white">
                              {selectedPatient.email || "No registrado"}
                            </span>
                          </div>
                          {selectedPatient.address && (
                            <div className="pt-2">
                              <span className="text-gray-500 dark:text-gray-400 block mb-1">Dirección:</span>
                              <span className="text-gray-900 dark:text-white text-xs leading-relaxed">
                                {selectedPatient.address}
                              </span>
                            </div>
                          )}
                          {(selectedPatient.emergency_contact_name || selectedPatient.emergency_contact_phone) && (
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                              <span className="text-gray-500 dark:text-gray-400 block mb-2 font-medium">
                                Contacto de Emergencia:
                              </span>
                              {selectedPatient.emergency_contact_name && (
                                <div className="flex justify-between mb-1">
                                  <span className="text-gray-500 dark:text-gray-400">Nombre:</span>
                                  <span className="text-gray-900 dark:text-white">
                                    {selectedPatient.emergency_contact_name}
                                  </span>
                                </div>
                              )}
                              {selectedPatient.emergency_contact_phone && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-400">Teléfono:</span>
                                  <span className="text-gray-900 dark:text-white">
                                    {selectedPatient.emergency_contact_phone}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white mb-3">Historial Médico</h3>
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alergias:</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {selectedPatient.allergies || "Sin alergias conocidas"}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Medicamentos Actuales:</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {selectedPatient.current_medications || "Sin medicamentos actuales"}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Historial Médico:</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {selectedPatient.medical_history || "Sin historial médico registrado"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="reports" className="mt-6">
                    {loadingReports ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                      </div>
                    ) : patientReports.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">
                          No hay reportes médicos para este paciente
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {patientReports.map((report) => (
                          <Card key={report.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <FileText className="h-4 w-4 text-teal-600" />
                                  <h4 className="font-medium text-gray-900 dark:text-white">
                                    {report.title}
                                  </h4>
                                  <Badge variant="outline" className="text-xs">
                                    {report.report_type}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {new Date(report.created_at).toLocaleDateString("es-ES", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    })}
                                  </span>
                                                                      <span>•</span>
                                    <span>
                                      Dr. {report.doctors[0]?.first_name} {report.doctors[0]?.last_name}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                                  {report.content.slice(0, 200)}...
                                </div>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="ml-4"
                                onClick={() => handleViewReport(report)}
                              >
                                Ver completo
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center">
                  <User className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg">
                    Selecciona un paciente para ver los detalles
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Report Viewer Modal */}
      <ReportViewerModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false)
          setSelectedReport(null)
        }}
        report={selectedReport}
      />

      {/* Modales elegantes */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Paciente"
        description="¿Estás seguro de que quieres eliminar este paciente? Toda la información y reportes médicos asociados se perderán permanentemente."
        itemName={patientToDelete ? `${patientToDelete.first_name} ${patientToDelete.last_name}` : undefined}
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
