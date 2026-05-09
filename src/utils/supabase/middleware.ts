import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Routes that don't require authentication.
 * All other routes will redirect to home with auth modal if not logged in.
 */
const PUBLIC_ROUTES = [
  '/',           // Home page (shows auth modal if not logged in)
]

/**
 * API routes that don't require authentication.
 */
const PUBLIC_API_ROUTES = [
  '/api/auth/user',
  '/api/auth/sync',
]

/**
 * Static assets and Next.js internals that should be skipped.
 */
const SKIP_PATTERNS = [
  '/_next/',
  '/favicon',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
]

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Skip static assets
  const pathname = request.nextUrl.pathname
  if (SKIP_PATTERNS.some(pattern => pathname.includes(pattern))) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    },
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is not authenticated and trying to access a protected route,
  // redirect to home page (which will show auth modal)
  if (!user) {
    // Allow public routes
    if (PUBLIC_ROUTES.includes(pathname)) {
      return supabaseResponse
    }

    // Allow public API routes
    if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
      return supabaseResponse
    }

    // Allow auth callback route
    if (pathname.startsWith('/auth/callback')) {
      return supabaseResponse
    }

    // For API routes, return 401 instead of redirecting
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required', authenticated: false },
        { status: 401 }
      )
    }

    // For all other protected routes, redirect to home with auth hint
    const redirectUrl = new URL('/', request.url)
    redirectUrl.searchParams.set('auth', 'required')
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}
