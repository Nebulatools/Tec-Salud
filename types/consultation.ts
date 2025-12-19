export interface PatientInfo {
  id?: string
  name?: string
  first_name?: string
  last_name?: string
  nombre?: string
  age?: number
  gender?: string
  date_of_birth?: string
  phone?: string
  email?: string
  medical_history?: string | null
  allergies?: string | null
  current_medications?: string | null
  [key: string]: unknown
}

export interface AppointmentDetails {
  appointment_date?: string
  start_time?: string
  end_time?: string
  notes?: string | null
}

export interface RecordingData {
  audioBlob?: Blob
  duration?: number
  startTime?: string
  startedAt?: string
  processedTranscript?: string
  transcript?: string
  isManualTranscript?: boolean
  [key: string]: unknown
}

export interface ReportData {
  reporte?: string
  aiGeneratedReport?: string
  fecha?: string
  hora?: string
  suggestions?: string[]
  isCompliant?: boolean
  complianceData?: unknown
  [key: string]: unknown
}

export interface FinalReport {
  id?: string
  content?: string
  generatedAt?: string
  reportSaved?: boolean
  savedAt?: string
  reportId?: string
  [key: string]: unknown
}

export interface ConsultationData {
  patientInfo: PatientInfo | null
  recordingData: RecordingData | null
  transcript?: string
  extractionPreview?: {
    patient: { id: string; name: string }
    symptoms: string[]
    diagnoses: string[]
    medications: { name: string; dose?: string; route?: string; frequency?: string; duration?: string }[]
  }
  reportData: ReportData | null
  finalReport: FinalReport | null
  appointmentDetails?: AppointmentDetails
  onsetDate?: string
  recordedDate?: string
  reactionType?: string
  facilityName?: string
  doctorId?: string
  previousNotes?: string
  patientSummary?: string
  contextFiles?: File[]
}
