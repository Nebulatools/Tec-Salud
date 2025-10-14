export interface ConsultationData {
  patientInfo: any | null
  recordingData: any | null
  transcript?: string
  extractionPreview?: {
    patient: { id: string; name: string }
    symptoms: string[]
    diagnoses: string[]
    medications: { name: string; dose?: string; route?: string; frequency?: string; duration?: string }[]
  }
  reportData: {
    reporte?: string
    fecha?: string
    hora?: string
    [key: string]: any
  } | null
  finalReport: any | null
}
