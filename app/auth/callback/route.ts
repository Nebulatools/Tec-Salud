import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectTo = requestUrl.searchParams.get('redirect_to')
  const context = requestUrl.searchParams.get('context') // doctor_id for QR flows
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', error)
    if (errorDescription) {
      loginUrl.searchParams.set('error_description', errorDescription)
    }
    return NextResponse.redirect(loginUrl)
  }

  if (code) {
    const supabase = await createClient()
    const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Auth callback error:', exchangeError)
      return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
    }

    if (!session) {
      return NextResponse.redirect(new URL('/login?error=no_session', request.url))
    }

    // Get user role for redirect decision
    const { data: appUser } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    // Also check if user is a doctor
    const { data: doctor } = await supabase
      .from('doctors')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    // Determine redirect destination
    let destination = '/dashboard' // default for doctors

    if (redirectTo) {
      // QR flow: redirect to target with context
      const targetUrl = new URL(redirectTo, request.url)
      if (context) {
        targetUrl.searchParams.set('doctor_id', context)
      }
      targetUrl.searchParams.set('source', 'qr')
      destination = targetUrl.pathname + targetUrl.search
    } else if (doctor) {
      // User is a doctor - go to dashboard
      destination = '/dashboard'
    } else if (appUser?.role === 'user') {
      // Regular user - go to user portal (or dashboard if not implemented)
      destination = '/user'
    }

    return NextResponse.redirect(new URL(destination, request.url))
  }

  // No code provided - redirect to login
  return NextResponse.redirect(new URL('/login', request.url))
}
