/**
 * Structured Clinical Report Schema
 *
 * This is the SOURCE OF TRUTH for medical consultation data.
 * - AI extracts data from transcript → populates this structure
 * - Markdown report is RENDERED from this structure (not vice versa)
 * - Doctor edits update THIS structure, not the markdown
 * - Compliance is checked against THIS structure (no regex parsing)
 */

import { z } from 'zod'

// ============================================
// PATIENT DEMOGRAPHICS
// ============================================

export const PatientDemographicsSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().min(1),
  edad: z.number().int().positive().optional(),
  sexo: z.enum(['Masculino', 'Femenino', 'Otro']).optional(),
  fecha_nacimiento: z.string().optional(), // ISO date
})

// ============================================
// VITAL SIGNS
// ============================================

export const VitalSignsSchema = z.object({
  presion_arterial: z.object({
    sistolica: z.number().int().positive().optional(),
    diastolica: z.number().int().positive().optional(),
    raw: z.string().optional(), // "120/80" for display
  }).optional(),
  frecuencia_cardiaca: z.number().int().positive().optional(), // bpm
  frecuencia_respiratoria: z.number().int().positive().optional(), // rpm
  temperatura: z.number().positive().optional(), // Celsius
  saturacion_oxigeno: z.number().int().min(0).max(100).optional(), // %
  peso: z.number().positive().optional(), // kg
  talla: z.number().positive().optional(), // cm
  imc: z.number().positive().optional(),
})

// ============================================
// CLINICAL DATA
// ============================================

export const MedicationSchema = z.object({
  nombre: z.string().min(1),
  dosis: z.string().optional(),
  via: z.string().optional(), // oral, IV, IM, etc.
  frecuencia: z.string().optional(), // cada 8 horas, etc.
  duracion: z.string().optional(), // 7 días, etc.
  indicaciones: z.string().optional(),
})

export const DiagnosisSchema = z.object({
  descripcion: z.string().min(1),
  codigo_icd: z.string().optional(), // ICD-10/11 code
  tipo: z.enum(['principal', 'secundario', 'diferencial']).default('principal'),
})

export const LabResultSchema = z.object({
  estudio: z.string().min(1),
  resultado: z.string().optional(),
  valor: z.number().optional(),
  unidad: z.string().optional(),
  rango_normal: z.string().optional(),
  interpretacion: z.string().optional(),
})

// ============================================
// MAIN CLINICAL REPORT STRUCTURE
// ============================================

export const ClinicalReportDataSchema = z.object({
  // Metadata
  id: z.string().uuid().optional(),
  appointment_id: z.string().uuid().optional(),
  doctor_id: z.string().uuid().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),

  // Patient
  paciente: PatientDemographicsSchema,

  // Doctor info
  medico: z.object({
    nombre: z.string().min(1),
    especialidad: z.string().optional(),
    cedula_profesional: z.string().optional(),
  }).optional(),

  // Consultation metadata
  consulta: z.object({
    fecha: z.string(), // ISO date
    hora: z.string().optional(),
    tipo: z.enum(['primera_vez', 'seguimiento', 'urgencia']).default('primera_vez'),
    duracion_minutos: z.number().int().positive().optional(),
  }),

  // ============================================
  // CRITICAL FIELDS (Required by compliance)
  // ============================================

  /** Motivo de Consulta - CRITICAL */
  motivo_consulta: z.string().min(1),

  /** Diagnóstico(s) - CRITICAL */
  diagnosticos: z.array(DiagnosisSchema).min(1),

  /** Signos Vitales - CRITICAL */
  signos_vitales: VitalSignsSchema.optional(),

  /** Exploración Física - CRITICAL */
  exploracion_fisica: z.string().optional(),

  // ============================================
  // IMPORTANT FIELDS (Highly recommended)
  // ============================================

  /** Plan de Tratamiento - IMPORTANT */
  plan_tratamiento: z.object({
    medicamentos: z.array(MedicationSchema).optional(),
    indicaciones_generales: z.string().optional(),
    recomendaciones: z.array(z.string()).optional(),
  }).optional(),

  /** Seguimiento - IMPORTANT */
  seguimiento: z.object({
    proxima_cita: z.string().optional(), // ISO date or "en 2 semanas"
    indicaciones: z.string().optional(),
    estudios_solicitados: z.array(z.string()).optional(),
  }).optional(),

  /** Alergias - IMPORTANT */
  alergias: z.object({
    tiene_alergias: z.boolean().default(false),
    lista: z.array(z.string()).optional(),
    nkda: z.boolean().default(false), // No Known Drug Allergies
  }).optional(),

  /** Antecedentes - IMPORTANT */
  antecedentes: z.object({
    personales_patologicos: z.array(z.string()).optional(),
    personales_no_patologicos: z.array(z.string()).optional(),
    familiares: z.array(z.string()).optional(),
    quirurgicos: z.array(z.string()).optional(),
    hospitalizaciones: z.array(z.string()).optional(),
  }).optional(),

  /** Medicamentos Actuales - IMPORTANT */
  medicamentos_actuales: z.array(MedicationSchema).optional(),

  // ============================================
  // CONDITIONAL FIELDS (Context-dependent)
  // ============================================

  /** Resultados de Laboratorio - CONDITIONAL */
  resultados_laboratorio: z.array(LabResultSchema).optional(),

  /** Evolución - CONDITIONAL (for follow-ups) */
  evolucion: z.string().optional(),

  /** Cuestionario de Especialidad - CONDITIONAL */
  cuestionario_especialidad: z.record(z.string(), z.unknown()).optional(),

  // ============================================
  // ADDITIONAL CLINICAL NOTES
  // ============================================

  /** Síntomas reportados por el paciente */
  sintomas: z.array(z.object({
    descripcion: z.string(),
    duracion: z.string().optional(),
    intensidad: z.enum(['leve', 'moderada', 'severa']).optional(),
    localizacion: z.string().optional(),
  })).optional(),

  /** Notas adicionales del médico */
  notas_adicionales: z.string().optional(),

  /** Transcript original (for reference) */
  transcript_original: z.string().optional(),
})

// Export types
export type PatientDemographics = z.infer<typeof PatientDemographicsSchema>
export type VitalSigns = z.infer<typeof VitalSignsSchema>
export type Medication = z.infer<typeof MedicationSchema>
export type Diagnosis = z.infer<typeof DiagnosisSchema>
export type LabResult = z.infer<typeof LabResultSchema>
export type ClinicalReportData = z.infer<typeof ClinicalReportDataSchema>

// ============================================
// COMPLIANCE MAPPING
// ============================================

/**
 * Maps compliance field IDs to paths in ClinicalReportData
 * Used for deterministic compliance checking
 */
export const COMPLIANCE_FIELD_PATHS: Record<string, (data: ClinicalReportData) => unknown> = {
  // CRITICAL
  motivo_consulta: (d) => d.motivo_consulta,
  diagnostico: (d) => d.diagnosticos?.length ? d.diagnosticos : null,
  signos_vitales: (d) => d.signos_vitales?.presion_arterial?.raw ||
                         d.signos_vitales?.frecuencia_cardiaca ||
                         d.signos_vitales?.temperatura,
  exploracion_fisica: (d) => d.exploracion_fisica,

  // IMPORTANT
  plan_tratamiento: (d) => d.plan_tratamiento?.medicamentos?.length ||
                           d.plan_tratamiento?.indicaciones_generales,
  seguimiento: (d) => d.seguimiento?.proxima_cita || d.seguimiento?.indicaciones,
  alergias: (d) => d.alergias?.nkda || d.alergias?.lista?.length,
  antecedentes: (d) => d.antecedentes?.personales_patologicos?.length ||
                       d.antecedentes?.familiares?.length,
  medicamentos_actuales: (d) => d.medicamentos_actuales?.length,

  // CONDITIONAL
  resultados_laboratorio: (d) => d.resultados_laboratorio?.length,
  evolucion: (d) => d.evolucion,
  cuestionario_especialidad: (d) => d.cuestionario_especialidad &&
                                    Object.keys(d.cuestionario_especialidad).length > 0,
  codigo_icd: (d) => d.diagnosticos?.some(dx => dx.codigo_icd),
}

/**
 * Check if a compliance field is present in structured data
 */
export function isFieldPresent(fieldId: string, data: ClinicalReportData): boolean {
  const getter = COMPLIANCE_FIELD_PATHS[fieldId]
  if (!getter) return false

  const value = getter(data)
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return true
  if (Array.isArray(value)) return value.length > 0
  return true
}

/**
 * Get all missing compliance fields from structured data
 */
export function getMissingFields(data: ClinicalReportData): string[] {
  return Object.keys(COMPLIANCE_FIELD_PATHS).filter(
    fieldId => !isFieldPresent(fieldId, data)
  )
}

// ============================================
// EMPTY/DEFAULT REPORT
// ============================================

export function createEmptyReport(patientName: string, doctorName: string): ClinicalReportData {
  return {
    paciente: {
      nombre: patientName,
    },
    medico: {
      nombre: doctorName,
    },
    consulta: {
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'primera_vez',
    },
    motivo_consulta: '',
    diagnosticos: [],
  }
}
