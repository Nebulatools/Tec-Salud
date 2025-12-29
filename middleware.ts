import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for QR links - let the route handler handle them
  // This allows patient pages to work without authentication
  if (pathname.startsWith('/link/qr/')) {
    return
  }

  // Skip middleware for patient pages (QR landing pages don't require auth)
  if (pathname.startsWith('/patient/')) {
    return
  }

  // For all other routes, update the session
  const { supabaseResponse } = await updateSession(request)
  return supabaseResponse
}

export const config = {
  matcher: [
    // Match QR links
    '/link/qr/:id*',
    // Match all routes except static files and API routes
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
