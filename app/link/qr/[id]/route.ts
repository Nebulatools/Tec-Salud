import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const baseUrl = request.nextUrl.origin

  try {
    const supabase = await createClient()

    // Fetch QR link data
    const { data: qrLink, error: qrError } = await supabase
      .from("qr_links")
      .select("id, doctor_id, campaign_type, redirect_url, is_active, expires_at")
      .eq("id", id)
      .single()

    if (qrError || !qrLink) {
      // QR link not found
      return NextResponse.redirect(
        new URL("/error?code=qr_not_found", baseUrl)
      )
    }

    // Check if QR is active
    if (!qrLink.is_active) {
      return NextResponse.redirect(
        new URL("/error?code=qr_inactive", baseUrl)
      )
    }

    // Check expiration
    if (qrLink.expires_at && new Date(qrLink.expires_at) < new Date()) {
      return NextResponse.redirect(
        new URL("/error?code=qr_expired", baseUrl)
      )
    }

    // Increment scan count (fire and forget)
    supabase.rpc("increment_qr_scan", { qr_id: id }).then(({ error }) => {
      if (error) console.error("Error incrementing scan count:", error)
    })

    // Determine redirect URL based on campaign type
    let redirectPath: string

    switch (qrLink.campaign_type) {
      case "specialty_survey":
        redirectPath = `/patient/survey?qr=${id}&doctor_id=${qrLink.doctor_id}`
        break

      case "quick_profile":
        redirectPath = `/patient/profile?qr=${id}&doctor_id=${qrLink.doctor_id}`
        break

      case "appointment":
        redirectPath = `/patient/appointments/new?qr=${id}&doctor_id=${qrLink.doctor_id}`
        break

      default:
        // Use custom redirect_url if provided, otherwise default to profile
        if (qrLink.redirect_url) {
          // If redirect_url is absolute, use it directly
          if (qrLink.redirect_url.startsWith("http")) {
            return NextResponse.redirect(qrLink.redirect_url)
          }
          // Otherwise treat as relative path
          redirectPath = `${qrLink.redirect_url}?qr=${id}&doctor_id=${qrLink.doctor_id}`
        } else {
          redirectPath = `/patient/profile?qr=${id}&doctor_id=${qrLink.doctor_id}`
        }
    }

    return NextResponse.redirect(new URL(redirectPath, baseUrl))
  } catch (error) {
    console.error("Error processing QR link:", error)
    return NextResponse.redirect(
      new URL("/error?code=qr_error", baseUrl)
    )
  }
}
