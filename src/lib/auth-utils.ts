/**
 * Auth Utilities — Phase 2 (Supabase Auth Integration)
 *
 * Server-side utilities for working with Supabase Auth and our User table.
 * The Supabase Auth user ID (from auth.uid()) is stored in User.supabaseId,
 * while User.id is our internal cuid used as the foreign key on other tables.
 *
 * Usage in API routes:
 *   import { getCurrentUser, getCurrentUserId, ensureUser, requireAuth, buildUserWhereClause, verifyOwnership } from '@/lib/auth-utils'
 */

import { createClient } from '@/utils/supabase/server'
import { db } from '@/lib/db'
import type { User } from '@prisma/client'

/**
 * Gets the authenticated Supabase Auth user from the current request context.
 * Returns null if no valid session exists.
 */
export async function getSupabaseAuthUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

/**
 * Gets the current authenticated user from our User table.
 * Returns null if the user is not authenticated or not synced to our DB yet.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabaseUser = await getSupabaseAuthUser()
  if (!supabaseUser) return null

  const user = await db.user.findUnique({
    where: { supabaseId: supabaseUser.id },
  })

  return user
}

/**
 * Gets the current user's internal ID (our User.id, NOT supabaseId).
 * Returns undefined if no authenticated user is found.
 * This is the ID used as userId on other Prisma models.
 */
export async function getCurrentUserId(): Promise<string | undefined> {
  const user = await getCurrentUser()
  return user?.id
}

/**
 * Ensures a User record exists in our DB for the authenticated Supabase user.
 * If the user doesn't exist yet, creates them (sync on first sign-in).
 * If they already exist, updates their email/name from Supabase Auth.
 *
 * This is the core sync mechanism: Supabase Auth → our User table.
 */
export async function ensureUser(): Promise<User | null> {
  const supabaseUser = await getSupabaseAuthUser()
  if (!supabaseUser) return null

  const supabaseId = supabaseUser.id
  const email = supabaseUser.email ?? ''
  const name = supabaseUser.user_metadata?.full_name
    ?? supabaseUser.user_metadata?.name
    ?? supabaseUser.user_metadata?.preferred_username
    ?? null
  const avatarUrl = supabaseUser.user_metadata?.avatar_url
    ?? supabaseUser.user_metadata?.picture
    ?? null

  // Upsert: create if new, update email/name/avatar if existing
  const user = await db.user.upsert({
    where: { supabaseId },
    update: {
      email,
      ...(name && { name }),
      ...(avatarUrl && { avatarUrl }),
    },
    create: {
      supabaseId,
      email,
      name: name ?? email.split('@')[0],
      avatarUrl,
      role: 'user',
      preferredLang: 'es',
    },
  })

  // Ensure the user has a free subscription
  const existingSub = await db.subscription.findUnique({
    where: { userId: user.id },
  })
  if (!existingSub) {
    await db.subscription.create({
      data: {
        userId: user.id,
        plan: 'free',
        status: 'active',
      },
    })
  }

  return user
}

/**
 * Builds a Prisma where clause that filters by userId if the user is authenticated.
 * Returns { userId } if authenticated, empty object otherwise.
 *
 * Usage:
 *   const where = await buildUserWhereClause()
 *   const dataSources = await db.dataSource.findMany({ where })
 */
export async function buildUserWhereClause(): Promise<Record<string, string>> {
  const userId = await getCurrentUserId()
  if (userId) {
    return { userId }
  }
  return {}
}

/**
 * Requires authentication — throws if no user is authenticated.
 * Returns the User record from our DB, creating it if necessary.
 *
 * Use this in API routes that require authentication.
 */
export async function requireAuth(): Promise<User> {
  const user = await ensureUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

/**
 * Verifies that a resource belongs to the authenticated user.
 * Returns true if the resource's userId matches the current user's id.
 * Returns false if the user is not authenticated or the resource doesn't belong to them.
 *
 * Usage:
 *   const isOwner = await verifyOwnership(dataSource.userId)
 *   if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
 */
export async function verifyOwnership(resourceUserId: string | null | undefined): Promise<boolean> {
  if (!resourceUserId) return false
  const userId = await getCurrentUserId()
  return userId === resourceUserId
}
