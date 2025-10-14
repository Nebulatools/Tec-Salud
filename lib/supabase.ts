// Supabase configuration and client setup with corrected types
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      doctors: {
        Row: {
          id: string
          user_id: string
          first_name: string
          last_name: string
          email: string
          specialty: string
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
          created_at?: string
          updated_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          doctor_id: string
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
          appointment_id: string | null
          report_type: string
          title: string
          content: string
          original_transcript: string | null
          ai_suggestions: string[] | null
          compliance_status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          doctor_id: string
          appointment_id?: string | null
          report_type: string
          title: string
          content: string
          original_transcript?: string | null
          ai_suggestions?: string[] | null
          compliance_status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          doctor_id?: string
          appointment_id?: string | null
          report_type?: string
          title?: string
          content?: string
          original_transcript?: string | null
          ai_suggestions?: string[] | null
          compliance_status?: string | null
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
    }
  }
}
