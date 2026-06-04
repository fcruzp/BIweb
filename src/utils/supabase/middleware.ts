import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Routes that don't require authentication.
 * All other PAGE routes will redirect to home with auth modal if not logged in.
 */
const PUBLIC_ROUTES = [
  '/',           // Home page (shows auth modal if not logged in)
]

/**
 * API routes that don't need the middleware to process cookies.
 * These skip the Supabase Auth getUser() call for performance.
 *
 * NOTE: ALL API routes are now passed through by the middleware.
 * Auth validation is handled by each route handler via requireAuth().
 * The middleware only protects PAGE routes (redirects unauthenticated users).
 */
const PUBLIC_API_ROUTES = [
  '/api/auth/user',
  '/api/auth/sync',
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
 */
function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) return true;
  if (pathname.startsWith('/auth/callback')) return true;
  return false;
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip static assets entirely
  if (SKIP_PATTERNS.some(pattern => pathname.includes(pattern))) {
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }

  // API routes: Pass through — let route handlers validate auth themselves.
  // The middleware's job is only to refresh cookies and protect PAGE routes.
  // Route handlers use requireAuth() which does its own getUser() validation.
  if (pathname.startsWith('/api/')) {
    // Still try to refresh cookies if possible, but don't block on auth failure
    let supabaseResponse = NextResponse.next({
      request: { headers: request.headers },
    });

    try {
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

      // Attempt to refresh the session — this sets fresh cookies in the response
      // If it fails (no cookies, expired session), we still pass through
      await supabase.auth.getUser();
    } catch {
      // Ignore — route handlers will handle auth validation
    }

    return supabaseResponse;
  }

  // For public page routes, skip auth check
  if (isPublicRoute(pathname)) {
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }

  // For protected PAGE routes, validate the session with Supabase Auth
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Only protect PAGE routes — redirect unauthenticated users to home
  if (!user) {
    const redirectUrl = new URL('/', request.url)
    redirectUrl.searchParams.set('auth', 'required')
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}
