import { NextRequest, NextResponse } from "next/server"
import { autocodeToICD11, autocodeDiagnoses } from "@/lib/icd-api-client"
import type { ICDApiResponse, ICDAutocodeResult, StructuredDiagnosis } from "@/types/icd"

/**
 * POST /api/icd/autocode
 * Autocode diagnosis text to ICD-11 code
 *
 * Body: { text: string } or { texts: string[] }
 * Response: { success: boolean, result: ICDAutocodeResult | StructuredDiagnosis[], fallback: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Handle batch requests (multiple diagnoses)
    if (body.texts && Array.isArray(body.texts)) {
      const results = await autocodeDiagnoses(body.texts)

      return NextResponse.json({
        success: true,
        result: results,
        fallback: false,
      } satisfies ICDApiResponse<StructuredDiagnosis[]>)
    }

    // Handle single text request
    const { text } = body

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        {
          success: false,
          result: null,
          fallback: false,
          error: "Missing or invalid 'text' parameter",
        } satisfies ICDApiResponse<null>,
        { status: 400 }
      )
    }

    const result = await autocodeToICD11(text)

    return NextResponse.json({
      success: true,
      result,
      fallback: !result.entity, // fallback = true if no match found
    } satisfies ICDApiResponse<ICDAutocodeResult>)
  } catch (error) {
    console.error("ICD autocode API error:", error)

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
