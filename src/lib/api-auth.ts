/**
 * API Key Authentication Library
 * ============================================
 *
 * Per-user API Keys for third-party integrations (OpenFN, N8N, Zapier, etc.).
 *
 * Design principles:
 * - The plaintext key is shown to the user EXACTLY ONCE at creation time.
 * - Only the SHA-256 hash is persisted to the database (never the plaintext).
 * - A short, non-reversible prefix ("dm_live_a1B2") is stored for display.
 * - Keys are soft-deleted via `revokedAt` (never hard-deleted, for audit).
 * - Every public API request is logged to `ApiRequestLog` (endpoint, status, duration, IP).
 *
 * Auth patterns:
 * - /api/settings/*  → Supabase session auth (browser user)
 * - /api/public/v1/* → Bearer API Key auth (third-party tools)
 *
 * Scopes:
 * - read    → GET endpoints (datasources, dashboards, schemas)
 * - execute → POST endpoints (execute SQL queries)
 * - admin   → everything (superset of read + execute)
 */

import { createHash, randomBytes } from 'crypto'
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import type { User } from '@prisma/client'

// ─── Constants ───────────────────────────────────────────────

export const API_KEY_PREFIX = 'dm_live_'
export const API_KEY_RANDOM_LENGTH = 32
/** Characters used for the random portion of the key (URL-safe, no ambiguous chars). */
const KEY_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789' // no 0/O/1/l/I

export type ApiScope = 'read' | 'execute' | 'admin'
export const ALL_SCOPES: ApiScope[] = ['read', 'execute', 'admin']

// ─── Types ───────────────────────────────────────────────────

export interface AuthenticatedApiKey {
  id: string
  label: string
  scopes: ApiScope[]
  userId: string
}

export interface ApiAuthSuccess {
  ok: true
  user: User
  apiKey: AuthenticatedApiKey
}

export interface ApiAuthFailure {
  ok: false
  error: string
  status: number
}

export type ApiAuthResult = ApiAuthSuccess | ApiAuthFailure

export interface GeneratedApiKey {
  plaintext: string
  keyHash: string
  keyPrefix: string
}

// ─── Scope helpers ───────────────────────────────────────────

export function parseScopes(scopesJson: string | null | undefined): ApiScope[] {
  if (!scopesJson) return []
  try {
    const parsed = JSON.parse(scopesJson)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((s): s is ApiScope =>
      typeof s === 'string' && ALL_SCOPES.includes(s as ApiScope),
    )
  } catch {
    return []
  }
}

export function serializeScopes(scopes: ApiScope[]): string {
  // Dedupe + validate
  const valid = Array.from(new Set(scopes)).filter((s) => ALL_SCOPES.includes(s))
  return JSON.stringify(valid)
}

/**
 * Returns true if the granted scopes satisfy the required scope.
 * `admin` grants every scope.
 */
export function hasScope(granted: ApiScope[], required: ApiScope): boolean {
  if (granted.includes('admin')) return true
  return granted.includes(required)
}

/**
 * Throws a typed error if the required scope is missing.
 * Useful inside route handlers after authenticateApiKey().
 */
export function requireScope(
  authResult: ApiAuthResult,
  required: ApiScope,
): asserts authResult is ApiAuthSuccess {
  if (!authResult.ok) return // caller should have already returned the error
  if (!hasScope(authResult.apiKey.scopes, required)) {
    const err = new Error(`Insufficient scope: requires '${required}'`) as Error & {
      statusCode: number
    }
    err.statusCode = 403
    throw err
  }
}

// ─── Key generation & hashing ────────────────────────────────

/**
 * Generates a new API key.
 * Returns the plaintext (shown once), the SHA-256 hash (stored), and the
 * display prefix ("dm_live_a1B2").
 */
export function generateApiKey(): GeneratedApiKey {
  const randomPart = generateRandomString(API_KEY_RANDOM_LENGTH)
  const plaintext = `${API_KEY_PREFIX}${randomPart}`
  const keyHash = hashApiKey(plaintext)
  const keyPrefix = buildKeyPrefix(plaintext)
  return { plaintext, keyHash, keyPrefix }
}

/** SHA-256 hex hash of the plaintext key. This is what we store. */
export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex')
}

/**
 * Builds the display prefix: the `dm_live_` marker + the first 4 random chars.
 * e.g. "dm_live_a1B2" — enough for the user to identify a key, not enough to
 * reconstruct it.
 */
function buildKeyPrefix(plaintext: string): string {
  if (!plaintext.startsWith(API_KEY_PREFIX)) return plaintext.slice(0, 12)
  const randomPart = plaintext.slice(API_KEY_PREFIX.length)
  return `${API_KEY_PREFIX}${randomPart.slice(0, 4)}`
}

/**
 * Returns a masked, display-safe version of a key prefix for tables.
 * e.g. "dm_live_a1B2••••"
 */
export function maskApiKey(keyPrefix: string): string {
  return `${keyPrefix}••••`
}

function generateRandomString(length: number): string {
  // Use crypto.randomBytes for cryptographic randomness, then map onto our
  // URL-safe alphabet. This avoids bias and keeps keys unguessable.
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += KEY_ALPHABET[bytes[i] % KEY_ALPHABET.length]
  }
  return out
}

// ─── Request authentication ──────────────────────────────────

/**
 * Extracts the Bearer token from the `Authorization` header.
 * Returns null if absent or malformed.
 */
export function extractBearerToken(req: Request | NextRequest): string | null {
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization')
  if (!authHeader) return null
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim())
  return match ? match[1].trim() : null
}

/**
 * Authenticates an incoming public API request using a Bearer API key.
 *
 * Flow:
 *  1. Extract Bearer token from the Authorization header.
 *  2. Hash it and look up the matching ApiKey row by keyHash.
 *  3. Reject if not found, revoked, or expired.
 *  4. Eagerly load the owning User.
 *  5. (Non-blocking) update lastUsedAt / lastUsedIp.
 *
 * Returns a discriminated union — callers should check `ok` first.
 */
export async function authenticateApiKey(
  req: Request | NextRequest,
): Promise<ApiAuthResult> {
  const token = extractBearerToken(req)
  if (!token) {
    return { ok: false, error: 'Missing or malformed Authorization header. Expected: Bearer <api_key>', status: 401 }
  }

  // Quick format check — saves a DB round trip for obviously-bogus tokens.
  if (!token.startsWith(API_KEY_PREFIX)) {
    return { ok: false, error: 'Invalid API key format.', status: 401 }
  }

  const keyHash = hashApiKey(token)

  const apiKey = await db.apiKey.findUnique({
    where: { keyHash },
    include: { user: true },
  })

  if (!apiKey) {
    return { ok: false, error: 'Invalid API key.', status: 401 }
  }

  // Soft-deleted keys are treated as invalid (but we don't reveal the
  // distinction to the caller — avoids key-existence oracle).
  if (apiKey.revokedAt) {
    return { ok: false, error: 'Invalid API key.', status: 401 }
  }

  if (apiKey.expiresAt && apiKey.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: 'API key has expired.', status: 401 }
  }

  // Fire-and-forget: update last-used metadata. We deliberately don't await
  // this so it never slows down the response. Errors are swallowed.
  const clientIp = getClientIp(req)
  db.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date(), lastUsedIp: clientIp },
    })
    .catch(() => {
      /* non-critical */
    })

  return {
    ok: true,
    user: apiKey.user,
    apiKey: {
      id: apiKey.id,
      label: apiKey.label,
      scopes: parseScopes(apiKey.scopes),
      userId: apiKey.userId,
    },
  }
}

// ─── Request logging ─────────────────────────────────────────

/**
 * Logs a public API request to ApiRequestLog. Fire-and-forget.
 */
export function logApiRequest(params: {
  apiKeyId: string
  endpoint: string
  method: string
  statusCode: number
  durationMs: number
  rowCount?: number | null
  ip?: string | null
}): void {
  db.apiRequestLog
    .create({
      data: {
        apiKeyId: params.apiKeyId,
        endpoint: params.endpoint,
        method: params.method,
        statusCode: params.statusCode,
        durationMs: params.durationMs,
        rowCount: params.rowCount ?? null,
        ip: params.ip ?? null,
      },
    })
    .catch(() => {
      /* logging must never break the response */
    })
}

// ─── IP extraction ───────────────────────────────────────────

/**
 * Best-effort client IP extraction.
 * Checks X-Forwarded-For (first hop), then X-Real-IP, then falls back to
 * the connection's remote address if available.
 */
export function getClientIp(req: Request | NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const xRealIp = req.headers.get('x-real-ip')
  if (xRealIp) return xRealIp.trim()
  return null
}

// ─── Error helper for route handlers ─────────────────────────

/**
 * Convenience: converts an ApiAuthFailure into a Next.js Response.
 */
export function unauthorizedResponse(result: ApiAuthFailure): Response {
  return new Response(
    JSON.stringify({ error: result.error }),
    {
      status: result.status,
      headers: { 'content-type': 'application/json' },
    },
  )
}
