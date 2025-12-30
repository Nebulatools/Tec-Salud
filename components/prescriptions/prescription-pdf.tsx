'use client'

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  PDFViewer,
  pdf,
} from '@react-pdf/renderer'
import type { MedicationType } from '@/lib/schemas/prescription'

// Track if fonts have been registered to avoid duplicate registration
let fontsRegistered = false

// Register fonts for better rendering - using system fonts as primary for reliability
function registerFonts() {
  if (fontsRegistered) return

  try {
    Font.register({
      family: 'Inter',
      fonts: [
        {
          src: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf',
          fontWeight: 400,
        },
        {
          src: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-600-normal.ttf',
          fontWeight: 'bold',
        },
        {
          src: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf',
          fontWeight: 'bold',
        },
      ],
    })
    fontsRegistered = true
  } catch {
    // Font registration failed, will use fallback
    console.warn('Failed to register Inter font, using Helvetica fallback')
  }
}

// Initialize fonts
registerFonts()

// Disable hyphenation to avoid font issues
Font.registerHyphenationCallback((word) => [word])

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica', // Use system font for reliability
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #0066CC',
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#666666',
  },
  doctorInfo: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  doctorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
  },
  doctorDetails: {
    fontSize: 9,
    color: '#666666',
    marginTop: 2,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  patientRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  patientLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333333',
    width: 80,
  },
  patientValue: {
    fontSize: 10,
    color: '#333333',
  },
  diagnosisText: {
    fontSize: 11,
    color: '#333333',
    lineHeight: 1.5,
  },
  medicationCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    borderLeft: '3px solid #0066CC',
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  medicationName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333333',
  },
  medicationGeneric: {
    fontSize: 10,
    color: '#666666',
  },
  medicationDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginTop: 6,
  },
  medicationDetail: {
    flexDirection: 'row',
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#666666',
    marginRight: 4,
  },
  detailValue: {
    fontSize: 9,
    color: '#333333',
  },
  instructions: {
    marginTop: 6,
    paddingTop: 6,
    borderTop: '1px solid #E2E8F0',
  },
  instructionsText: {
    fontSize: 9,
    color: '#666666',
  },
  notesSection: {
    backgroundColor: '#FFFBEB',
    borderRadius: 6,
    padding: 12,
    marginTop: 10,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 10,
    color: '#78350F',
    lineHeight: 1.4,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
    borderTop: '1px solid #E2E8F0',
  },
  signatureArea: {
    alignItems: 'center',
    marginTop: 30,
  },
  signatureLine: {
    width: 200,
    borderBottom: '1px solid #333333',
    marginBottom: 5,
  },
  signatureText: {
    fontSize: 10,
    color: '#666666',
  },
  validityInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  validityText: {
    fontSize: 8,
    color: '#999999',
  },
  prescriptionId: {
    fontSize: 8,
    color: '#999999',
  },
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-45deg)',
    fontSize: 60,
    color: '#F0F0F0',
    fontWeight: 'bold',
  },
})

export interface PrescriptionPDFData {
  id: string
  doctor: {
    first_name: string
    last_name: string
    specialty?: string
    license_number?: string
    phone?: string
    email?: string
  }
  patient: {
    first_name: string
    last_name: string
    date_of_birth?: string
  }
  medications: MedicationType[]
  diagnosis?: string
  notes?: string
  status: 'draft' | 'signed' | 'delivered' | 'cancelled'
  signed_at?: string
  valid_until?: string
  created_at: string
}

interface PrescriptionDocumentProps {
  data: PrescriptionPDFData
}

function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function PrescriptionDocument({ data }: PrescriptionDocumentProps) {
  const isDraft = data.status === 'draft'
  const patientAge = data.patient.date_of_birth
    ? calculateAge(data.patient.date_of_birth)
    : null

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {isDraft && <Text style={styles.watermark}>BORRADOR</Text>}

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Receta Médica</Text>
          <Text style={styles.headerSubtitle}>
            Documento generado electrónicamente
          </Text>
          <View style={styles.doctorInfo}>
            <View>
              <Text style={styles.doctorName}>
                Dr. {data.doctor.first_name} {data.doctor.last_name}
              </Text>
              {data.doctor.specialty && (
                <Text style={styles.doctorDetails}>{data.doctor.specialty}</Text>
              )}
              {data.doctor.license_number && (
                <Text style={styles.doctorDetails}>
                  Cédula Profesional: {data.doctor.license_number}
                </Text>
              )}
            </View>
            <View>
              {data.doctor.phone && (
                <Text style={styles.doctorDetails}>Tel: {data.doctor.phone}</Text>
              )}
              {data.doctor.email && (
                <Text style={styles.doctorDetails}>{data.doctor.email}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Patient Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del Paciente</Text>
          <View style={styles.patientRow}>
            <Text style={styles.patientLabel}>Nombre:</Text>
            <Text style={styles.patientValue}>
              {data.patient.first_name} {data.patient.last_name}
            </Text>
          </View>
          {patientAge !== null && (
            <View style={styles.patientRow}>
              <Text style={styles.patientLabel}>Edad:</Text>
              <Text style={styles.patientValue}>{patientAge} años</Text>
            </View>
          )}
          <View style={styles.patientRow}>
            <Text style={styles.patientLabel}>Fecha:</Text>
            <Text style={styles.patientValue}>{formatDate(data.created_at)}</Text>
          </View>
        </View>

        {/* Diagnosis */}
        {data.diagnosis && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Diagnóstico</Text>
            <Text style={styles.diagnosisText}>{data.diagnosis}</Text>
          </View>
        )}

        {/* Medications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medicamentos</Text>
          {data.medications.map((med, index) => (
            <View key={index} style={styles.medicationCard}>
              <View style={styles.medicationHeader}>
                <View>
                  <Text style={styles.medicationName}>
                    {index + 1}. {med.brand_name}
                  </Text>
                  <Text style={styles.medicationGeneric}>({med.generic_name})</Text>
                </View>
                {med.quantity && (
                  <Text style={styles.detailValue}>Cantidad: {med.quantity}</Text>
                )}
              </View>
              <View style={styles.medicationDetails}>
                <View style={styles.medicationDetail}>
                  <Text style={styles.detailLabel}>Dosis:</Text>
                  <Text style={styles.detailValue}>{med.dosage}</Text>
                </View>
                <View style={styles.medicationDetail}>
                  <Text style={styles.detailLabel}>Frecuencia:</Text>
                  <Text style={styles.detailValue}>{med.frequency}</Text>
                </View>
                <View style={styles.medicationDetail}>
                  <Text style={styles.detailLabel}>Duración:</Text>
                  <Text style={styles.detailValue}>{med.duration}</Text>
                </View>
              </View>
              {med.instructions && (
                <View style={styles.instructions}>
                  <Text style={styles.instructionsText}>
                    Indicaciones: {med.instructions}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Indicaciones Adicionales</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.signatureArea}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureText}>
              Firma del Médico
              {data.signed_at && ` - Firmado: ${formatDate(data.signed_at)}`}
            </Text>
          </View>
          <View style={styles.validityInfo}>
            <Text style={styles.validityText}>
              {data.valid_until
                ? `Válida hasta: ${formatDate(data.valid_until)}`
                : 'Sin fecha de expiración'}
            </Text>
            <Text style={styles.prescriptionId}>ID: {data.id.slice(0, 8)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

// PDF Viewer component for preview
interface PrescriptionPDFViewerProps {
  data: PrescriptionPDFData
  className?: string
}

export function PrescriptionPDFViewer({
  data,
  className,
}: PrescriptionPDFViewerProps) {
  return (
    <PDFViewer className={className} style={{ width: '100%', height: '100%' }}>
      <PrescriptionDocument data={data} />
    </PDFViewer>
  )
}

// Generate PDF blob for download/upload
export async function generatePrescriptionPDF(
  data: PrescriptionPDFData
): Promise<Blob> {
  // Ensure fonts are registered
  registerFonts()

  // Sanitize data to prevent rendering issues
  const sanitizedData: PrescriptionPDFData = {
    ...data,
    doctor: {
      first_name: data.doctor.first_name || 'Doctor',
      last_name: data.doctor.last_name || '',
      specialty: data.doctor.specialty || undefined,
      license_number: data.doctor.license_number || undefined,
      phone: data.doctor.phone || undefined,
      email: data.doctor.email || undefined,
    },
    patient: {
      first_name: data.patient.first_name || 'Paciente',
      last_name: data.patient.last_name || '',
      date_of_birth: data.patient.date_of_birth || undefined,
    },
    medications: data.medications.map((med) => ({
      brand_name: med.brand_name || 'Medicamento',
      generic_name: med.generic_name || '',
      dosage: med.dosage || 'No especificada',
      frequency: med.frequency || 'No especificada',
      duration: med.duration || 'No especificada',
      instructions: med.instructions || undefined,
      quantity: med.quantity || undefined,
    })),
    diagnosis: data.diagnosis || undefined,
    notes: data.notes || undefined,
  }

  try {
    return await pdf(<PrescriptionDocument data={sanitizedData} />).toBlob()
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('No se pudo generar el PDF. Intenta de nuevo.')
  }
}

// Generate PDF and trigger download
export async function downloadPrescriptionPDF(
  data: PrescriptionPDFData,
  filename?: string
): Promise<void> {
  const blob = await generatePrescriptionPDF(data)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download =
    filename ||
    `receta-${data.patient.last_name}-${data.id.slice(0, 8)}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
