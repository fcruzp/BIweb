import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import fs from 'fs'
import path from 'path'

/**
 * POST /api/admin/reset-db
 *
 * NUCLEAR OPTION: Resets EVERYTHING.
 *   1. Truncates all application tables in PostgreSQL (Prisma/Supabase)
 *   2. Deletes all SQLite files from the data directory
 *   3. Deletes all users from Supabase Auth (if SUPABASE_SERVICE_ROLE_KEY is set)
 *
 * After this, the app is completely clean — like a fresh install.
 *
 * SECURITY: Requires X-Admin-Key header matching ADMIN_SECRET_KEY env var.
 * If ADMIN_SECRET_KEY is not set, this endpoint is DISABLED.
 *
 * Usage (simple):
 *   curl -X POST https://your-domain.com/api/admin/reset-db \
 *     -H "X-Admin-Key: your-secret-key"
 */
export async function POST(request: NextRequest) {
  // Security check
  const adminKey = process.env.ADMIN_SECRET_KEY
  if (!adminKey) {
    return NextResponse.json(
      { error: 'Admin reset is disabled. Set ADMIN_SECRET_KEY env var to enable.' },
      { status: 403 }
    )
  }

  const providedKey = request.headers.get('x-admin-key')
  if (providedKey !== adminKey) {
    return NextResponse.json(
      { error: 'Invalid admin key' },
      { status: 403 }
    )
  }

  const results: {
    db: { success: boolean; message: string; tablesCleared?: string[]; error?: string }
    files: { success: boolean; message: string; filesDeleted?: number; deletedFiles?: string[]; error?: string }
    authUsers: { success: boolean; message: string; usersDeleted?: number; error?: string }
  } = {
    db: { success: false, message: '' },
    files: { success: false, message: '' },
    authUsers: { success: false, message: '' },
  }

  // ── Step 1: Truncate all application tables ──────────────────────
  try {
    console.log('[admin/reset] Step 1: Truncating all tables...')

    const tableNames = [
      'dashboard_widgets',
      'dashboards',
      'query_histories',
      'chat_messages',
      'chat_sessions',
      'source_contexts',
      'source_schemas',
      'data_sources',
      'usage_events',
      'subscriptions',
      'users',
    ]

    await db.$executeRawUnsafe(
      `TRUNCATE TABLE ${tableNames.map(t => `"${t}"`).join(', ')} CASCADE;`
    )

    results.db = {
      success: true,
      message: `All ${tableNames.length} tables truncated`,
      tablesCleared: tableNames,
    }

    console.log('[admin/reset] Step 1 complete: DB tables truncated')
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[admin/reset] Step 1 FAILED:', msg)
    results.db = { success: false, message: 'Failed to truncate tables', error: msg }
  }

  // ── Step 2: Delete all SQLite files from data directory ──────────
  try {
    console.log('[admin/reset] Step 2: Cleaning data directory...')

    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data')

    if (!fs.existsSync(dataDir)) {
      results.files = {
        success: true,
        message: 'Data directory does not exist — nothing to clean',
        filesDeleted: 0,
        deletedFiles: [],
      }
    } else {
      const files = fs.readdirSync(dataDir)
      const sqliteFiles = files.filter(f =>
        f.endsWith('.sqlite') || f.endsWith('.db') || f.endsWith('.sqlite3')
      )

      const deletedFiles: string[] = []
      for (const file of sqliteFiles) {
        try {
          fs.unlinkSync(path.join(dataDir, file))
          deletedFiles.push(file)
        } catch {
          // Skip files that can't be deleted (locked, etc.)
        }
      }

      results.files = {
        success: true,
        message: `Deleted ${deletedFiles.length} SQLite file(s)`,
        filesDeleted: deletedFiles.length,
        deletedFiles,
      }
    }

    console.log('[admin/reset] Step 2 complete: Files cleaned')
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[admin/reset] Step 2 FAILED:', msg)
    results.files = { success: false, message: 'Failed to clean files', error: msg }
  }

  // ── Step 3: Delete all Supabase Auth users ───────────────────────
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (serviceRoleKey && supabaseUrl) {
    try {
      console.log('[admin/reset] Step 3: Deleting Supabase Auth users...')

      // Fetch all users from Supabase Auth
      const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      })

      if (!listRes.ok) {
        throw new Error(`Failed to list users: ${listRes.status} ${await listRes.text()}`)
      }

      const { users } = await listRes.json()

      if (!users || users.length === 0) {
        results.authUsers = {
          success: true,
          message: 'No Supabase Auth users to delete',
          usersDeleted: 0,
        }
      } else {
        // Delete each user
        let deletedCount = 0
        const deleteErrors: string[] = []

        for (const user of users) {
          try {
            const delRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
              method: 'DELETE',
              headers: {
                apikey: serviceRoleKey,
                Authorization: `Bearer ${serviceRoleKey}`,
              },
            })

            if (delRes.ok) {
              deletedCount++
            } else {
              deleteErrors.push(`${user.email}: ${delRes.status}`)
            }
          } catch (err) {
            deleteErrors.push(`${user.email}: ${err instanceof Error ? err.message : 'unknown'}`)
          }
        }

        results.authUsers = {
          success: deleteErrors.length === 0,
          message: `Deleted ${deletedCount}/${users.length} Auth users${deleteErrors.length > 0 ? ` (${deleteErrors.length} errors)` : ''}`,
          usersDeleted: deletedCount,
          error: deleteErrors.length > 0 ? deleteErrors.join('; ') : undefined,
        }
      }

      console.log('[admin/reset] Step 3 complete: Auth users cleaned')
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('[admin/reset] Step 3 FAILED:', msg)
      results.authUsers = { success: false, message: 'Failed to delete Auth users', error: msg }
    }
  } else {
    results.authUsers = {
      success: true,
      message: 'SUPABASE_SERVICE_ROLE_KEY not set — skipping Auth user cleanup. Delete users manually from Supabase Dashboard.',
      usersDeleted: 0,
    }
  }

  const allSuccess = results.db.success && results.files.success

  return NextResponse.json({
    success: allSuccess,
    message: allSuccess
      ? 'Full reset complete! App is now clean.'
      : 'Reset completed with some errors — check details.',
    details: results,
  })
}
