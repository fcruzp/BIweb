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
 * These also skip the Supabase Auth getUser() call for performance.
 */
const PUBLIC_API_ROUTES = [
  '/api/auth/user',
  // NOTE: /api/auth/sync is NOT public — it needs middleware cookie refresh.
  // If the access token is expired, the middleware must refresh it before
  // the route handler's getUser() call. Without this, the handler gets 401.
  '/api/test-ai',
  '/api/test-sse',
  '/api/chat/sse-test',
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

/**
 * Check if a route is public (doesn't require auth).
 * Used to skip the expensive Supabase Auth getUser() call.
 */
function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) return true;
  if (pathname.startsWith('/auth/callback')) return true;
  return false;
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip static assets entirely — no Supabase call needed
  if (SKIP_PATTERNS.some(pattern => pathname.includes(pattern))) {
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }

  // OPTIMIZATION: For public routes, skip the Supabase Auth getUser() call.
  // This saves 100-500ms per request by avoiding a network round trip
  // to the Supabase Auth server for routes that don't need auth.
  if (isPublicRoute(pathname)) {
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }

  // For protected routes, validate the session with Supabase Auth
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

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
