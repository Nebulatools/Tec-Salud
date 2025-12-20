import { NextRequest, NextResponse } from "next/server"
import { searchICD11 } from "@/lib/icd-api-client"
import type { ICDApiResponse, ICDSearchResult } from "@/types/icd"

/**
 * GET /api/icd/search
 * Search ICD-11 codes with autocomplete
 *
 * Query params:
 *   q: string - Search query (required)
 *   limit: number - Max results (default: 10, max: 25)
 *
 * Response: { success: boolean, result: ICDSearchResult[], fallback: boolean }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    const limitParam = searchParams.get("limit")

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        {
          success: false,
          result: null,
          fallback: false,
          error: "Query parameter 'q' must be at least 2 characters",
        } satisfies ICDApiResponse<null>,
        { status: 400 }
      )
    }

    // Parse and validate limit
    let limit = 10
    if (limitParam) {
      const parsed = parseInt(limitParam, 10)
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 25) // Max 25 results
      }
    }

    const results = await searchICD11(query, limit)

    return NextResponse.json({
      success: true,
      result: results,
      fallback: results.length === 0,
    } satisfies ICDApiResponse<ICDSearchResult[]>)
  } catch (error) {
    console.error("ICD search API error:", error)

    return NextResponse.json(
      {
        success: false,
        result: null,
        fallback: true,
        error: error instanceof Error ? error.message : "Unknown error",
      } satisfies ICDApiResponse<null>,
      { status: 500 }
    )
  }
}
