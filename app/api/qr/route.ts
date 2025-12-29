import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateQRSchema = z.object({
  campaign_type: z.enum(['specialty_survey', 'quick_profile', 'appointment']),
  target_resource_id: z.string().uuid().optional(),
  expires_in_days: z.number().min(1).max(365).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get doctor profile
    const { data: doctor } = await supabase
      .from('doctors')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const validation = CreateQRSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { campaign_type, target_resource_id, expires_in_days, metadata } = validation.data

    // Generate QR link
    const qrId = crypto.randomUUID()

    // Determine the base redirect URL based on campaign type
    let redirectPath: string
    switch (campaign_type) {
      case 'specialty_survey':
        redirectPath = '/patient/survey'
        break
      case 'quick_profile':
        redirectPath = '/patient/profile'
        break
      case 'appointment':
        redirectPath = '/patient/appointments/new'
        break
      default:
        redirectPath = '/patient/profile'
    }

    const expiresAt = expires_in_days
      ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString()
      : null

    const { data: qrLink, error } = await supabase
      .from('qr_links')
      .insert({
        id: qrId,
        doctor_id: doctor.id,
        campaign_type,
        target_resource_id: target_resource_id || null,
        redirect_url: redirectPath,
        expires_at: expiresAt,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (error) {
      console.error('QR creation error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Build the full QR URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const qrUrl = `${baseUrl}/link/qr/${qrId}`

    return NextResponse.json({
      ...qrLink,
      qr_url: qrUrl,
    })
  } catch (error) {
    console.error('QR creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: doctor } = await supabase
      .from('doctors')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const campaignType = searchParams.get('campaign_type')
    const includeExpired = searchParams.get('include_expired') === 'true'

    let query = supabase
      .from('qr_links')
      .select('*')
      .eq('doctor_id', doctor.id)
      .order('created_at', { ascending: false })

    if (campaignType) {
      query = query.eq('campaign_type', campaignType)
    }

    if (!includeExpired) {
      query = query.or('expires_at.is.null,expires_at.gt.now()')
    }

    const { data: qrLinks, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Add full QR URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const linksWithUrls = qrLinks.map(link => ({
      ...link,
      qr_url: `${baseUrl}/link/qr/${link.id}`,
    }))

    return NextResponse.json(linksWithUrls)
  } catch (error) {
    console.error('QR fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
