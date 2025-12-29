import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Debug endpoint to check auth state - only works in development
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    const supabase = await createClient()

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      return NextResponse.json({
        status: 'auth_error',
        error: authError.message,
        details: 'Failed to get user from session',
      })
    }

    if (!user) {
      return NextResponse.json({
        status: 'no_session',
        error: 'No active session',
        details: 'User is not logged in or session expired',
      })
    }

    // Get app_users record
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('id, email, role, full_name')
      .eq('id', user.id)
      .single()

    // Get doctor record
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('id, first_name, last_name, specialty, doctor_role')
      .eq('user_id', user.id)
      .single()

    // Test RLS by trying to read qr_links
    const { data: qrLinks, error: qrError } = await supabase
      .from('qr_links')
      .select('id')
      .limit(1)

    return NextResponse.json({
      status: 'authenticated',
      auth: {
        user_id: user.id,
        email: user.email,
      },
      app_user: appUser || { error: appUserError?.message || 'Not found' },
      doctor: doctor || { error: doctorError?.message || 'Not found' },
      rls_test: {
        qr_links_accessible: !qrError,
        error: qrError?.message || null,
      },
      summary: {
        has_session: true,
        has_app_user: !!appUser,
        has_doctor: !!doctor,
        is_doctor_admin: appUser?.role === 'doctor_admin',
        can_create_qr: !!doctor && !qrError,
      },
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
