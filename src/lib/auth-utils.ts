/**
 * Auth Utilities — Phase 1 (Temporary)
 * 
 * During Phase 1 (database migration), there's no authentication yet.
 * These utilities provide a temporary "system" userId that all data belongs to.
 * 
 * In Phase 2 (Auth + Multi-Tenant), these will be replaced with
 * proper Supabase Auth integration that returns the authenticated user's ID.
 * 
 * Usage in API routes:
 *   import { createClient } from '@/utils/supabase/server'
 *   const supabase = await createClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 *   const userId = user?.id
 */

// Temporary system user ID — all data created during Phase 1 will belong to this user
export const SYSTEM_USER_ID = 'system'

/**
 * Gets the current user ID from the request.
 * 
 * Phase 1: Returns undefined (no auth yet)
 * Phase 2: Will extract from Supabase Auth session
 */
export function getCurrentUserId(): string | undefined {
  // Phase 1: No auth yet, return undefined so userId is not set
  // Phase 2: Will return the authenticated user's ID from the session
  return undefined
}

/**
 * Checks if a userId should be included in Prisma queries.
 * Returns the userId if auth is enabled, undefined otherwise.
 */
export function getOptionalUserId(): string | undefined {
  return getCurrentUserId()
}

/**
 * Builds a Prisma where clause that filters by userId if auth is enabled.
 * Phase 1: Returns empty where (no filtering)
 * Phase 2: Returns { userId: authenticatedUserId }
 */
export function buildUserWhereClause(): Record<string, string> {
  const userId = getCurrentUserId()
  if (userId) {
    return { userId }
  }
  return {}
}
