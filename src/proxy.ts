import { type NextRequest, NextResponse } from 'next/server'

/**
 * Simplified proxy for local development.
 * No auth required - all routes are accessible.
 */

export async function proxy(request: NextRequest) {
  return NextResponse.next({
    request: { headers: request.headers },
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|ogg|mp3|wav|ico|woff|woff2|ttf|eot)$).*)',
  ],
}
