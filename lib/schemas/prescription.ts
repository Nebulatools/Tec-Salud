import { z } from 'zod'

export const MedicationSchema = z.object({
  brand_name: z.string().min(1, 'Nombre comercial requerido'),
  generic_name: z.string().min(1, 'Nombre genérico requerido'),
  dosage: z.string().min(1, 'Dosis requerida'),
  frequency: z.string().min(1, 'Frecuencia requerida'),
  duration: z.string().min(1, 'Duración requerida'),
  instructions: z.string().optional(),
  quantity: z.string().optional(),
})

export const CreatePrescriptionSchema = z.object({
  appointment_id: z.string().uuid().optional(),
  patient_id: z.string().uuid(),
  medications: z.array(MedicationSchema).min(1, 'Agregar al menos un medicamento'),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  valid_days: z.number().min(1).max(365).default(30),
})

export const UpdatePrescriptionSchema = z.object({
  medications: z.array(MedicationSchema).min(1).optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'signed', 'delivered', 'cancelled']).optional(),
})

export type MedicationType = z.infer<typeof MedicationSchema>
export type CreatePrescriptionType = z.infer<typeof CreatePrescriptionSchema>
export type UpdatePrescriptionType = z.infer<typeof UpdatePrescriptionSchema>

// Common medications for autocomplete
export const COMMON_MEDICATIONS = [
  { brand: 'Tempra', generic: 'Paracetamol', commonDosage: '500mg' },
  { brand: 'Advil', generic: 'Ibuprofeno', commonDosage: '400mg' },
  { brand: 'Amoxil', generic: 'Amoxicilina', commonDosage: '500mg' },
  { brand: 'Bactrim', generic: 'Trimetoprim/Sulfametoxazol', commonDosage: '800/160mg' },
  { brand: 'Losec', generic: 'Omeprazol', commonDosage: '20mg' },
  { brand: 'Zitromax', generic: 'Azitromicina', commonDosage: '500mg' },
  { brand: 'Aspirina', generic: 'Acido Acetilsalicilico', commonDosage: '100mg' },
  { brand: 'Metformina', generic: 'Metformina', commonDosage: '850mg' },
  { brand: 'Lipitor', generic: 'Atorvastatina', commonDosage: '10mg' },
  { brand: 'Norvasc', generic: 'Amlodipino', commonDosage: '5mg' },
  { brand: 'Glucophage', generic: 'Metformina', commonDosage: '500mg' },
  { brand: 'Crestor', generic: 'Rosuvastatina', commonDosage: '10mg' },
]

// Common frequency options
export const FREQUENCY_OPTIONS = [
  'Cada 6 horas',
  'Cada 8 horas',
  'Cada 12 horas',
  'Una vez al día',
  'Dos veces al día',
  'Tres veces al día',
  'Cada 24 horas',
  'Antes de dormir',
  'En ayunas',
  'Con alimentos',
  'Después de comer',
]

// Common duration options
export const DURATION_OPTIONS = [
  '3 días',
  '5 días',
  '7 días',
  '10 días',
  '14 días',
  '21 días',
  '30 días',
  'Continuo',
  'Hasta nueva orden',
]
