import { NextResponse } from 'next/server'
import {
  authenticateApiKey,
  requireScope,
  logApiRequest,
  getClientIp,
  hasScope,
  type ApiAuthResult,
} from '@/lib/api-auth'
import { db } from '@/lib/db'

/**
 * GET /api/public/v1/me
 *
 * Demo / introspection endpoint for API keys.
 * Authenticates via the `Authorization: Bearer dm_live_...` header (NOT the
 * browser session). Requires the `read` scope.
 *
 * Useful for:
 *  - Verifying a newly-created key works.
 *  - OpenFN / N8N inspecting which user a key belongs to.
 *
 * Response:
 *   {
 *     "user": { "id", "email", "name" },
 *     "apiKey": { "id", "label", "scopes" },
 *     "subscription": { "plan" } | null
 *   }
 */
export async function GET(req: Request) {
  const startedAt = Date.now()
  const endpoint = '/api/public/v1/me'
  const method = 'GET'

  let auth: Awaited<ReturnType<typeof authenticateApiKey>>
  try {
    auth = await authenticateApiKey(req)
  } catch (err) {
    console.error('[public/v1/me] auth error:', err)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 },
    )
  }

  if (!auth.ok) {
    // No key to log against, so just return the error.
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    requireScope(auth, 'read')
  } catch (err) {
    const status = (err as Error & { statusCode?: number }).statusCode ?? 403
    logApiRequest({
      apiKeyId: auth.apiKey.id,
      endpoint,
      method,
      statusCode: status,
      durationMs: Date.now() - startedAt,
      ip: getClientIp(req),
    })
    return NextResponse.json(
      { error: (err as Error).message },
      { status },
    )
  }

  try {
    // Eagerly load the user's subscription for convenience.
    const subscription = await db.subscription.findUnique({
      where: { userId: auth.user.id },
      select: { plan: true, status: true },
    })

    const durationMs = Date.now() - startedAt
    logApiRequest({
      apiKeyId: auth.apiKey.id,
      endpoint,
      method,
      statusCode: 200,
      durationMs,
      ip: getClientIp(req),
    })

    return NextResponse.json({
      user: {
        id: auth.user.id,
        email: auth.user.email,
        name: auth.user.name,
      },
      apiKey: {
        id: auth.apiKey.id,
        label: auth.apiKey.label,
        scopes: auth.apiKey.scopes,
      },
      capabilities: {
        read: hasScope(auth.apiKey.scopes, 'read'),
        execute: hasScope(auth.apiKey.scopes, 'execute'),
        admin: auth.apiKey.scopes.includes('admin'),
      },
      subscription: subscription
        ? { plan: subscription.plan, status: subscription.status }
        : null,
    })
  } catch (err) {
    console.error('[public/v1/me] handler error:', err)
    logApiRequest({
      apiKeyId: auth.apiKey.id,
      endpoint,
      method,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
      ip: getClientIp(req),
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
