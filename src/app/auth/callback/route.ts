import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * GET /auth/callback
 *
 * Handles OAuth callback redirects (e.g., Google Sign-In).
 * Exchanges the auth code for a session, then redirects to the home page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Sync the user to our database after successful OAuth
      try {
        await fetch(`${origin}/api/auth/sync`, { method: 'POST' })
      } catch {
        // Non-critical: user will be synced on next API call
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return to home page with error indication
  return NextResponse.redirect(`${origin}/?auth_error=callback_failed`)
}
