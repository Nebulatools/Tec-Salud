/**
 * WHO ICD API OAuth Token Manager
 * Handles OAuth 2.0 client credentials flow with automatic token refresh
 */

import type { ICDTokenResponse } from "@/types/icd"

interface CachedToken {
  accessToken: string
  expiresAt: number // Unix timestamp
}

// Singleton state - persists across requests in serverless environment
let cachedToken: CachedToken | null = null
let refreshPromise: Promise<string> | null = null

// Refresh token 5 minutes before expiration
const REFRESH_BUFFER_MS = 5 * 60 * 1000

/**
 * Get a valid OAuth access token for WHO ICD API
 * Automatically handles caching and refresh
 */
export async function getICDAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && Date.now() < cachedToken.expiresAt - REFRESH_BUFFER_MS) {
    return cachedToken.accessToken
  }

  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise
  }

  // Start token refresh
  refreshPromise = refreshToken()

  try {
    const token = await refreshPromise
    return token
  } finally {
    refreshPromise = null
  }
}

/**
 * Force a token refresh (useful after 401 errors)
 */
export async function forceTokenRefresh(): Promise<string> {
  cachedToken = null
  return getICDAccessToken()
}

/**
 * Clear the cached token (for testing)
 */
export function clearTokenCache(): void {
  cachedToken = null
  refreshPromise = null
}

async function refreshToken(): Promise<string> {
  const clientId = process.env.WHO_ICD_CLIENT_ID
  const clientSecret = process.env.WHO_ICD_CLIENT_SECRET
  const tokenUrl = process.env.WHO_ICD_TOKEN_URL

  if (!clientId || !clientSecret || !tokenUrl) {
    throw new Error(
      "WHO ICD API credentials not configured. " +
      "Please set WHO_ICD_CLIENT_ID, WHO_ICD_CLIENT_SECRET, and WHO_ICD_TOKEN_URL environment variables."
    )
  }

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "icdapi_access",
      grant_type: "client_credentials",
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Failed to obtain WHO ICD API token: ${response.status} ${response.statusText}. ${errorText}`
    )
  }

  const data: ICDTokenResponse = await response.json()

  // Cache the token with expiration time
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  return data.access_token
}

/**
 * Make an authenticated request to WHO ICD API
 * Handles token refresh and retries on 401
 */
export async function fetchWithICDAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getICDAccessToken()

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Accept": "application/json",
      "Accept-Language": "es", // Spanish language for titles
      "API-Version": "v2",
    },
  })

  // If unauthorized, try refreshing token once
  if (response.status === 401) {
    const newToken = await forceTokenRefresh()

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${newToken}`,
        "Accept": "application/json",
        "Accept-Language": "es",
        "API-Version": "v2",
      },
    })
  }

  return response
}
