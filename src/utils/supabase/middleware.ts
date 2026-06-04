/**
 * Mock middleware - no auth required for local development.
 * All routes are accessible without authentication.
 */

import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  return NextResponse.next({
    request: { headers: request.headers },
  });
}
