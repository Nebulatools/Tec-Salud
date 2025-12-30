// Supabase configuration and client setup with corrected types
import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Use createBrowserClient for cookie-based auth that works with API routes
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      app_users: {
        Row: {
          id: string
          email: string
          role: "user" | "doctor_admin"
          full_name: string | null
          phone: string | null
          metadata: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role?: "user" | "doctor_admin"
          full_name?: string | null
          phone?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: "user" | "doctor_admin"
          full_name?: string | null
          phone?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
      }
      doctors: {
        Row: {
          id: string
          user_id: string
          first_name: string
          last_name: string
          email: string
          specialty: string
          doctor_role: "admin" | "user"
          is_specialist: boolean
          profile_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          first_name: string
          last_name: string
          email: string
          specialty: string
          doctor_role?: "admin" | "user"
          is_specialist?: boolean
          profile_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string
          last_name?: string
          email?: string
          specialty?: string
          doctor_role?: "admin" | "user"
          is_specialist?: boolean
          profile_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          doctor_id: string
          user_id: string | null
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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          user_id?: string | null
          first_name: string
          last_name: string
          date_of_birth: string
          gender: "Masculino" | "Femenino" | "Otro"
          phone?: string | null
          email?: string | null
          address?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          medical_history?: string | null
          allergies?: string | null
          current_medications?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          user_id?: string | null
          first_name?: string
          last_name?: string
          date_of_birth?: string
          gender?: "Masculino" | "Femenino" | "Otro"
          phone?: string | null
          email?: string | null
          address?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          medical_history?: string | null
          allergies?: string | null
          current_medications?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          doctor_id: string
          patient_id: string
          patient_user_id: string | null
          appointment_date: string
          start_time: string
          end_time: string
          status: "Programada" | "Completada" | "Cancelada" | "No asistió"
          notes: string | null
          diagnosis: string | null
          treatment: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          patient_id: string
          patient_user_id?: string | null
          appointment_date: string
          start_time: string
          end_time: string
          status?: "Programada" | "Completada" | "Cancelada" | "No asistió"
          notes?: string | null
          diagnosis?: string | null
          treatment?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          patient_id?: string
          patient_user_id?: string | null
          appointment_date?: string
          start_time?: string
          end_time?: string
          status?: "Programada" | "Completada" | "Cancelada" | "No asistió"
          notes?: string | null
          diagnosis?: string | null
          treatment?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      medical_reports: {
        Row: {
          id: string
          patient_id: string
          doctor_id: string
          patient_user_id: string | null
          specialty_id: string | null
          specialist_context: Record<string, unknown>
          appointment_id: string | null
          report_type: string
          title: string
          content: string
          original_transcript: string | null
          ai_suggestions: string[] | null
          compliance_status: string | null
          structured_data: Record<string, unknown> | null
          compliance_score: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          doctor_id: string
          patient_user_id?: string | null
          specialty_id?: string | null
          specialist_context?: Record<string, unknown>
          appointment_id?: string | null
          report_type: string
          title: string
          content: string
          original_transcript?: string | null
          ai_suggestions?: string[] | null
          compliance_status?: string | null
          structured_data?: Record<string, unknown> | null
          compliance_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          doctor_id?: string
          patient_user_id?: string | null
          specialty_id?: string | null
          specialist_context?: Record<string, unknown>
          appointment_id?: string | null
          report_type?: string
          title?: string
          content?: string
          original_transcript?: string | null
          ai_suggestions?: string[] | null
          compliance_status?: string | null
          structured_data?: Record<string, unknown> | null
          compliance_score?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      clinical_extractions: {
        Row: {
          id: string
          appointment_id: string | null
          patient_id: string | null
          doctor_id: string | null
          patient_user_id: string | null
          extracted_at: string
          patient_snapshot: unknown | null
          symptoms: string[]
          diagnoses: string[]
          medications: {
            name: string
            dose?: string | null
            route?: string | null
            frequency?: string | null
            duration?: string | null
          }[]
        }
        Insert: {
          id?: string
          appointment_id?: string | null
          patient_id?: string | null
          doctor_id?: string | null
          patient_user_id?: string | null
          extracted_at?: string
          patient_snapshot?: unknown | null
          symptoms?: string[]
          diagnoses?: string[]
          medications?: {
            name: string
            dose?: string | null
            route?: string | null
            frequency?: string | null
            duration?: string | null
          }[]
        }
        Update: {
          id?: string
          appointment_id?: string | null
          patient_id?: string | null
          doctor_id?: string | null
          patient_user_id?: string | null
          extracted_at?: string
          patient_snapshot?: unknown | null
          symptoms?: string[]
          diagnoses?: string[]
          medications?: {
            name: string
            dose?: string | null
            route?: string | null
            frequency?: string | null
            duration?: string | null
          }[]
        }
      }
      patient_profiles: {
        Row: {
          id: string
          baseline_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          baseline_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          baseline_completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      patient_baseline_forms: {
        Row: {
          id: string
          patient_user_id: string
          patient_id: string | null
          general_info: Record<string, unknown>
          vitals: Record<string, unknown>
          lifestyle: Record<string, unknown>
          conditions: Record<string, unknown>
          submitted_at: string
          updated_at: string
          version: number
        }
        Insert: {
          id?: string
          patient_user_id: string
          patient_id?: string | null
          general_info?: Record<string, unknown>
          vitals?: Record<string, unknown>
          lifestyle?: Record<string, unknown>
          conditions?: Record<string, unknown>
          submitted_at?: string
          updated_at?: string
          version?: number
        }
        Update: {
          id?: string
          patient_user_id?: string
          patient_id?: string | null
          general_info?: Record<string, unknown>
          vitals?: Record<string, unknown>
          lifestyle?: Record<string, unknown>
          conditions?: Record<string, unknown>
          submitted_at?: string
          updated_at?: string
          version?: number
        }
      }
      doctor_patient_links: {
        Row: {
          id: string
          doctor_id: string
          patient_user_id: string
          patient_id: string | null
          status: "pending" | "accepted" | "rejected" | "revoked"
          requested_by: "doctor" | "patient"
          requested_at: string
          responded_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          doctor_id: string
          patient_user_id: string
          patient_id?: string | null
          status?: "pending" | "accepted" | "rejected" | "revoked"
          requested_by: "doctor" | "patient"
          requested_at?: string
          responded_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          doctor_id?: string
          patient_user_id?: string
          patient_id?: string | null
          status?: "pending" | "accepted" | "rejected" | "revoked"
          requested_by?: "doctor" | "patient"
          requested_at?: string
          responded_at?: string | null
          notes?: string | null
        }
      }
      specialties: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      doctor_specialties: {
        Row: {
          doctor_id: string
          specialty_id: string
          is_primary: boolean
          created_at: string
        }
        Insert: {
          doctor_id: string
          specialty_id: string
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          doctor_id?: string
          specialty_id?: string
          is_primary?: boolean
          created_at?: string
        }
      }
      specialist_questions: {
        Row: {
          id: string
          specialty_id: string
          created_by_doctor: string | null
          prompt: string
          field_type: "short_text" | "long_text" | "number" | "date" | "boolean" | "single_select" | "multi_select"
          options: Record<string, unknown>
          is_required: boolean
          order_index: number
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          specialty_id: string
          created_by_doctor?: string | null
          prompt: string
          field_type: "short_text" | "long_text" | "number" | "date" | "boolean" | "single_select" | "multi_select"
          options?: Record<string, unknown>
          is_required?: boolean
          order_index?: number
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          specialty_id?: string
          created_by_doctor?: string | null
          prompt?: string
          field_type?: "short_text" | "long_text" | "number" | "date" | "boolean" | "single_select" | "multi_select"
          options?: Record<string, unknown>
          is_required?: boolean
          order_index?: number
          active?: boolean
          created_at?: string
        }
      }
      specialist_responses: {
        Row: {
          id: string
          patient_user_id: string
          patient_id: string | null
          doctor_id: string | null
          specialty_id: string
          question_id: string
          answer: Record<string, unknown> | null
          submitted_at: string
        }
        Insert: {
          id?: string
          patient_user_id: string
          patient_id?: string | null
          doctor_id?: string | null
          specialty_id: string
          question_id: string
          answer?: Record<string, unknown> | null
          submitted_at?: string
        }
        Update: {
          id?: string
          patient_user_id?: string
          patient_id?: string | null
          doctor_id?: string | null
          specialty_id?: string
          question_id?: string
          answer?: Record<string, unknown> | null
          submitted_at?: string
        }
      }
      lab_orders: {
        Row: {
          id: string
          patient_user_id: string
          patient_id: string | null
          doctor_id: string
          specialty_id: string | null
          recommended_tests: Record<string, unknown>
          notes: string | null
          status: "pending_upload" | "awaiting_review" | "reviewed"
          recommended_at: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          id?: string
          patient_user_id: string
          patient_id?: string | null
          doctor_id: string
          specialty_id?: string | null
          recommended_tests?: Record<string, unknown>
          notes?: string | null
          status?: "pending_upload" | "awaiting_review" | "reviewed"
          recommended_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          id?: string
          patient_user_id?: string
          patient_id?: string | null
          doctor_id?: string
          specialty_id?: string | null
          recommended_tests?: Record<string, unknown>
          notes?: string | null
          status?: "pending_upload" | "awaiting_review" | "reviewed"
          recommended_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
      }
      lab_results: {
        Row: {
          id: string
          lab_order_id: string
          storage_path: string
          mime_type: string | null
          uploaded_by: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          lab_order_id: string
          storage_path: string
          mime_type?: string | null
          uploaded_by?: string | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          lab_order_id?: string
          storage_path?: string
          mime_type?: string | null
          uploaded_by?: string | null
          uploaded_at?: string
        }
      }
      virtual_intern_runs: {
        Row: {
          id: string
          doctor_id: string
          patient_user_id: string
          patient_id: string | null
          lab_order_id: string | null
          specialty_id: string | null
          status: "pending" | "processing" | "succeeded" | "failed"
          summary: string | null
          suggestions: string[]
          error: string | null
          requested_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          doctor_id: string
          patient_user_id: string
          patient_id?: string | null
          lab_order_id?: string | null
          specialty_id?: string | null
          status?: "pending" | "processing" | "succeeded" | "failed"
          summary?: string | null
          suggestions?: string[]
          error?: string | null
          requested_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          doctor_id?: string
          patient_user_id?: string
          patient_id?: string | null
          lab_order_id?: string | null
          specialty_id?: string | null
          status?: "pending" | "processing" | "succeeded" | "failed"
          summary?: string | null
          suggestions?: string[]
          error?: string | null
          requested_at?: string
          completed_at?: string | null
        }
      }
    }
  }
}

// ============================================
// New Types for Critical Gaps Implementation
// ============================================

// QR Links
export interface QRLink {
  id: string
  doctor_id: string
  campaign_type: 'specialty_survey' | 'quick_profile' | 'appointment'
  target_resource_id: string | null
  redirect_url: string
  scans_count: number
  expires_at: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// Medical Units
export interface MedicalUnit {
  id: string
  name: string
  address_line: string | null
  coordinates: { lat: number; lng: number } | null
  logo_url: string | null
  billing_info: {
    rfc?: string
    razon_social?: string
    direccion_fiscal?: string
    regimen_fiscal?: string
  }
  operating_hours: Record<string, { open: string; close: string }>
  phone: string | null
  email: string | null
  created_at: string
  updated_at: string
}

export interface DoctorUnit {
  id: string
  doctor_id: string
  unit_id: string
  role: 'owner' | 'admin' | 'staff'
  is_primary: boolean
  created_at: string
}

// Prescriptions
export interface Medication {
  brand_name: string
  generic_name: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
  quantity?: string
}

export interface Prescription {
  id: string
  appointment_id: string | null
  doctor_id: string
  patient_id: string
  medications: Medication[]
  diagnosis: string | null
  notes: string | null
  status: 'draft' | 'signed' | 'delivered' | 'cancelled'
  signed_url: string | null
  signed_at: string | null
  delivered_at: string | null
  valid_until: string | null
  created_at: string
  updated_at: string
}

// Family Groups
export interface FamilyGroup {
  id: string
  owner_user_id: string
  group_name: string
  created_at: string
}

export interface FamilyMember {
  id: string
  group_id: string
  user_id: string | null
  relationship: 'self' | 'spouse' | 'child' | 'parent' | 'sibling' | 'grandparent' | 'other'
  profile_data: {
    full_name?: string
    date_of_birth?: string
    gender?: string
    allergies?: string[]
    blood_type?: string
    medical_notes?: string
  }
  is_primary: boolean
  created_at: string
}

// Doctor Verification
export interface DoctorVerification {
  id: string
  doctor_id: string
  status: 'pending' | 'submitted' | 'under_review' | 'verified' | 'rejected'
  cedula_professional: string | null
  cedula_storage_path: string | null
  specialty_certificate_path: string | null
  additional_documents: Array<{
    path: string
    type: string
    uploaded_at: string
  }>
  rejection_reason: string | null
  rejection_details: Record<string, unknown> | null
  reviewed_by: string | null
  submitted_at: string | null
  reviewed_at: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
}

// Virtual Intern Runs (Extended for all AI jobs)
// Extends existing table - reuse instead of creating ai_processing_jobs
export interface VirtualInternRunExtended {
  id: string
  appointment_id: string | null
  doctor_id: string
  patient_user_id: string
  patient_id: string | null
  lab_order_id: string | null
  specialty_id: string | null
  job_type: 'virtual_intern' | 'transcription' | 'diarization' | 'enrichment' | 'soap_generation'
  status: 'pending' | 'processing' | 'succeeded' | 'failed'
  // Existing fields
  summary: string | null
  findings: Record<string, unknown> | null
  alerts: Array<{ type: string; message: string }> | null
  suggestions: string[]
  data_sources_analyzed: Record<string, boolean> | null
  // Extended fields for all job types
  audio_storage_path: string | null
  input_data: Record<string, unknown>
  error: string | null
  error_message: string | null
  retry_count: number
  max_retries: number
  priority: number
  started_at: string | null
  completed_at: string | null
  requested_at: string
}

// Alias for backwards compatibility and semantic clarity
export type AIProcessingJob = VirtualInternRunExtended
