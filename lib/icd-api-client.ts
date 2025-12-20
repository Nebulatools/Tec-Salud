/**
 * WHO ICD API Client
 * Provides autocode and search functionality for ICD-11 codes
 */

import { fetchWithICDAuth } from "./icd-token-manager"
import { supabase } from "./supabase"
import type { ICDSearchResult, ICDAutocodeResult, StructuredDiagnosis } from "@/types/icd"

const API_BASE_URL = process.env.WHO_ICD_API_URL || "https://id.who.int/icd"
const RELEASE_ID = process.env.WHO_ICD_RELEASE || "2024-01"

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 5000

/**
 * Autocode a diagnosis text to ICD-11 code
 * Uses the WHO ICD API autocode endpoint
 */
export async function autocodeToICD11(text: string): Promise<ICDAutocodeResult> {
  if (!text || text.trim().length < 2) {
    return {
      searchText: text,
      entity: null,
      score: 0,
      isAmbiguous: false,
    }
  }

  const normalizedText = text.trim().toLowerCase()

  // Check local cache first
  const cached = await checkCache(normalizedText)
  if (cached) {
    return {
      searchText: text,
      entity: {
        code: cached.code,
        title: cached.title_es || cached.title,
        uri: cached.uri || "",
      },
      score: 1.0, // Cached results are considered high confidence
      isAmbiguous: false,
    }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    const url = new URL(
      `/icd/release/11/${RELEASE_ID}/mms/autocode`,
      API_BASE_URL
    )
    url.searchParams.set("searchText", text)
    url.searchParams.set("flatResults", "true")

    const response = await fetchWithICDAuth(url.toString(), {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`ICD autocode failed: ${response.status}`)
      return {
        searchText: text,
        entity: null,
        score: 0,
        isAmbiguous: false,
      }
    }

    const data = await response.json()

    // WHO autocode returns a direct object with theCode when there's a match
    if (data.theCode) {
      const entity = {
        code: data.theCode,
        title: data.matchingText || text,
        uri: data.foundationURI || data.linearizationURI || "",
      }

      // Cache the result
      await cacheICDCode(entity.code, entity.title, entity.uri)

      return {
        searchText: text,
        entity,
        score: data.matchScore ?? 0.9,
        isAmbiguous: false,
      }
    }

    // Fallback: WHO API returns matchingPVs array in some cases
    if (data.matchingPVs && data.matchingPVs.length > 0) {
      const match = data.matchingPVs[0]
      const entity = {
        code: extractCodeFromUri(match.theCode || match.foundationUri),
        title: match.label || match.title || "",
        uri: match.foundationUri || "",
      }

      await cacheICDCode(entity.code, entity.title, entity.uri)

      return {
        searchText: text,
        entity,
        score: match.score || 0.9,
        isAmbiguous: data.matchingPVs.length > 1,
      }
    }

    // Alternative response format: destinationEntities
    if (data.destinationEntities && data.destinationEntities.length > 0) {
      const match = data.destinationEntities[0]
      const entity = {
        code: extractCodeFromUri(match.theCode || match.id),
        title: match.title || match.label || "",
        uri: match.id || "",
      }

      await cacheICDCode(entity.code, entity.title, entity.uri)

      return {
        searchText: text,
        entity,
        score: match.score || 0.85,
        isAmbiguous: data.destinationEntities.length > 1,
      }
    }

    return {
      searchText: text,
      entity: null,
      score: 0,
      isAmbiguous: false,
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn("ICD autocode request timed out")
    } else {
      console.error("ICD autocode error:", error)
    }

    return {
      searchText: text,
      entity: null,
      score: 0,
      isAmbiguous: false,
    }
  }
}

/**
 * Search ICD-11 codes with autocomplete
 */
export async function searchICD11(
  query: string,
  limit: number = 10
): Promise<ICDSearchResult[]> {
  if (!query || query.trim().length < 2) {
    return []
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    const url = new URL(
      `/icd/release/11/${RELEASE_ID}/mms/search`,
      API_BASE_URL
    )
    url.searchParams.set("q", query)
    url.searchParams.set("subtreesFilter", "")
    url.searchParams.set("flatResults", "true")
    url.searchParams.set("highlightingEnabled", "false")
    url.searchParams.set("useFlexisearch", "true")

    const response = await fetchWithICDAuth(url.toString(), {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`ICD search failed: ${response.status}`)
      return searchLocalCache(query, limit)
    }

    const data = await response.json()

    if (!data.destinationEntities || data.destinationEntities.length === 0) {
      return searchLocalCache(query, limit)
    }

    const results: ICDSearchResult[] = data.destinationEntities
      .slice(0, limit)
      .map((entity: Record<string, unknown>) => {
        // theCode is directly available in search results
        const code = (entity.theCode as string) || extractCodeFromUri((entity.id as string))
        // Clean HTML tags from title (WHO API returns <em> tags for highlighting)
        const rawTitle = (entity.title as string) || (entity.label as string) || ""
        const title = rawTitle.replace(/<[^>]*>/g, '')
        const uri = (entity.id as string) || ""

        // Cache each result
        cacheICDCode(code, title, uri).catch(() => {})

        return {
          code,
          title,
          uri,
          matchScore: (entity.score as number) || 0.8,
          chapter: (entity.chapter as string) || undefined,
        }
      })

    return results
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn("ICD search request timed out")
    } else {
      console.error("ICD search error:", error)
    }

    return searchLocalCache(query, limit)
  }
}

/**
 * Autocode multiple diagnoses in parallel
 */
export async function autocodeDiagnoses(
  diagnoses: string[]
): Promise<StructuredDiagnosis[]> {
  const results = await Promise.all(
    diagnoses.map(async (text) => {
      const icd = await autocodeToICD11(text)
      return {
        original_text: text,
        icd11_code: icd.entity?.code || null,
        icd11_title: icd.entity?.title || null,
        icd11_uri: icd.entity?.uri || null,
        confidence: icd.score,
        verified_by_doctor: false,
        coded_at: new Date().toISOString(),
      } satisfies StructuredDiagnosis
    })
  )

  return results
}

// Helper functions

function extractCodeFromUri(input: string): string {
  if (!input) return ""

  // If it's already a code (like "J20.9"), return as-is
  if (/^[A-Z][A-Z0-9.]+$/i.test(input)) {
    return input.toUpperCase()
  }

  // Extract code from URI like "http://id.who.int/icd/release/11/mms/1234567890"
  // or from theCode format
  const match = input.match(/\/([A-Z][A-Z0-9.]+)$/i)
  if (match) {
    return match[1].toUpperCase()
  }

  // Try to find a code pattern anywhere in the string
  const codeMatch = input.match(/\b([A-Z][A-Z0-9]{1,3}(?:\.[A-Z0-9]+)?)\b/i)
  if (codeMatch) {
    return codeMatch[1].toUpperCase()
  }

  return input
}

async function checkCache(searchText: string): Promise<{
  code: string
  title: string
  title_es: string | null
  uri: string | null
} | null> {
  try {
    // Check if we have a cached result for this exact search term
    const { data, error } = await supabase
      .from("icd_codes_cache")
      .select("code, title, title_es, uri")
      .eq("icd_version", "11")
      .or(`title_es.ilike.%${searchText}%,title.ilike.%${searchText}%`)
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    return data
  } catch {
    return null
  }
}

async function searchLocalCache(
  query: string,
  limit: number
): Promise<ICDSearchResult[]> {
  try {
    const { data, error } = await supabase
      .from("icd_codes_cache")
      .select("code, title, title_es, uri")
      .eq("icd_version", "11")
      .or(`title_es.ilike.%${query}%,title.ilike.%${query}%,code.ilike.${query}%`)
      .limit(limit)

    if (error || !data) {
      return []
    }

    return data.map((item) => ({
      code: item.code,
      title: item.title_es || item.title,
      uri: item.uri || "",
      matchScore: 0.7, // Lower score for cache hits
    }))
  } catch {
    return []
  }
}

async function cacheICDCode(
  code: string,
  title: string,
  uri: string
): Promise<void> {
  if (!code || !title) return

  try {
    await supabase.from("icd_codes_cache").upsert(
      {
        icd_version: "11",
        code,
        title,
        title_es: title, // In Spanish request, title is already in Spanish
        uri,
        cached_at: new Date().toISOString(),
      },
      {
        onConflict: "icd_version,code",
        ignoreDuplicates: true,
      }
    )
  } catch (error) {
    console.warn("Failed to cache ICD code:", error)
  }
}
