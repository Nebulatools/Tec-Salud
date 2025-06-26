export interface ConsultationData {
  patientInfo: any | null
  recordingData: any | null
  transcript?: string
  reportData: {
    reporte?: string
    fecha?: string
    hora?: string
    [key: string]: any
  } | null
  finalReport: any | null
}