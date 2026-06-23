import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-utils'
import { db } from '@/lib/db'
import {
  generateApiKey,
  serializeScopes,
  maskApiKey,
  parseScopes,
  ALL_SCOPES,
  type ApiScope,
} from '@/lib/api-auth'

/**
 * GET /api/settings/api-keys
 *
 * Lists the current user's API keys (active + revoked).
 * Returns keys in masked form — never the plaintext or hash.
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const keys = await db.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        label: true,
        keyPrefix: true,
        scopes: true,
        revokedAt: true,
        lastUsedAt: true,
        lastUsedIp: true,
        expiresAt: true,
        createdAt: true,
        _count: { select: { requestLogs: true } },
      },
    })

    const safe = keys.map((k) => ({
      id: k.id,
      label: k.label,
      maskedKey: maskApiKey(k.keyPrefix),
      scopes: parseScopes(k.scopes),
      revokedAt: k.revokedAt,
      lastUsedAt: k.lastUsedAt,
      lastUsedIp: k.lastUsedIp,
      expiresAt: k.expiresAt,
      createdAt: k.createdAt,
      requestCount: k._count.requestLogs,
    }))

    return NextResponse.json({ keys: safe })
  } catch (error) {
    console.error('[api-keys] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
  }
}

const createKeySchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, 'Label is required')
    .max(60, 'Label must be 60 characters or fewer'),
  scopes: z
    .array(z.enum(ALL_SCOPES as [ApiScope, ...ApiScope[]]))
    .min(1, 'Select at least one scope')
    .max(3),
  expiresInDays: z.number().int().positive().optional(),
})

/**
 * POST /api/settings/api-keys
 *
 * Creates a new API key. The plaintext key is returned EXACTLY ONCE in the
 * response body — the client must store it immediately. Only the hash is
 * persisted.
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const parsed = createKeySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const { label, scopes, expiresInDays } = parsed.data

    // Enforce a per-user key cap to avoid abuse.
    const MAX_KEYS_PER_USER = 25
    const activeCount = await db.apiKey.count({
      where: { userId: user.id, revokedAt: null },
    })
    if (activeCount >= MAX_KEYS_PER_USER) {
      return NextResponse.json(
        { error: `You have reached the maximum of ${MAX_KEYS_PER_USER} active API keys. Revoke an existing key to create a new one.` },
        { status: 409 },
      )
    }

    const { plaintext, keyHash, keyPrefix } = generateApiKey()

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null

    const created = await db.apiKey.create({
      data: {
        userId: user.id,
        keyHash,
        keyPrefix,
        label,
        scopes: serializeScopes(scopes),
        expiresAt,
      },
      select: {
        id: true,
        label: true,
        scopes: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    // 201 Created — the plaintext is included here and ONLY here.
    return NextResponse.json(
      {
        key: plaintext, // ⚠️ shown once — client must save it
        meta: {
          id: created.id,
          label: created.label,
          scopes: parseScopes(created.scopes),
          expiresAt: created.expiresAt,
          createdAt: created.createdAt,
          maskedKey: maskApiKey(keyPrefix),
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('[api-keys] POST error:', error)
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
  }
}
