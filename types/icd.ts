/**
 * ICD (International Classification of Diseases) API Types
 * WHO ICD-11 API integration for diagnosis coding
 */

/**
 * Structured diagnosis with ICD code mapping
 * Used to store diagnoses with their corresponding ICD codes
 */
export interface StructuredDiagnosis {
  /** Original diagnosis text from Gemini extraction */
  original_text: string
  /** ICD-11 code (e.g., "CA07.0", "BA00") */
  icd11_code: string | null
  /** ICD-11 title in Spanish */
  icd11_title: string | null
  /** ICD-11 foundation URI for reference */
  icd11_uri: string | null
  /** Confidence score from autocode (0-1) */
  confidence: number
  /** Whether the doctor has verified this code */
  verified_by_doctor: boolean
  /** Timestamp when the code was assigned */
  coded_at: string | null
}

/**
 * Result from ICD search endpoint
 */
export interface ICDSearchResult {
  /** ICD code (e.g., "CA07.0") */
  code: string
  /** Title/description in Spanish */
  title: string
  /** Foundation URI */
  uri: string
  /** Match score from search (0-1) */
  matchScore: number
  /** Optional: Chapter information */
  chapter?: string
}

/**
 * Result from ICD autocode endpoint
 * Used when automatically coding a diagnosis text
 */
export interface ICDAutocodeResult {
  /** Original search text */
  searchText: string
  /** Matched entity, or null if no match */
  entity: {
    code: string
    title: string
    uri: string
  } | null
  /** Match confidence score (0-1) */
  score: number
  /** Whether multiple possible matches exist */
  isAmbiguous: boolean
}

/**
 * OAuth token response from WHO ICD API
 */
export interface ICDTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

/**
 * Cached ICD code entry for local database
 */
export interface ICDCacheEntry {
  id: string
  icd_version: '10' | '11'
  code: string
  title: string
  title_es: string | null
  uri: string | null
  cached_at: string
}

/**
 * API response wrapper for ICD endpoints
 */
export interface ICDApiResponse<T> {
  success: boolean
  result: T | null
  fallback: boolean
  error?: string
}
