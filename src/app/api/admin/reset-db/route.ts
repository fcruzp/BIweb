import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/admin/reset-db
 *
 * Resets the application database by truncating all tables.
 * This deletes ALL user data, data sources, chat history, etc.
 * The Prisma schema remains intact — only data is removed.
 *
 * SECURITY: Requires a secret key passed via the X-Admin-Key header.
 * Set ADMIN_SECRET_KEY in your environment variables.
 * If not set, this endpoint is DISABLED.
 *
 * Usage:
 *   curl -X POST http://localhost:3000/api/admin/reset-db \
 *     -H "X-Admin-Key: your-secret-key"
 *
 * Or from the browser console:
 *   fetch('/api/admin/reset-db?XTransformPort=3000', {
 *     method: 'POST',
 *     headers: { 'X-Admin-Key': 'your-secret-key' }
 *   })
 */
export async function POST(request: NextRequest) {
  // Security check: require admin secret key
  const adminKey = process.env.ADMIN_SECRET_KEY
  if (!adminKey) {
    return NextResponse.json(
      { error: 'Admin reset is disabled. Set ADMIN_SECRET_KEY environment variable to enable.' },
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

  try {
    console.log('[admin/reset-db] Starting full database reset...')

    // Truncate all tables in the correct order (CASCADE handles foreign keys)
    // We use raw SQL because Prisma doesn't have a built-in truncate
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

    // Truncate all tables with CASCADE to handle foreign key constraints
    await db.$executeRawUnsafe(
      `TRUNCATE TABLE ${tableNames.map(t => `"${t}"`).join(', ')} CASCADE;`
    )

    // Reset auto-increment/serial sequences (PostgreSQL)
    for (const table of tableNames) {
      try {
        await db.$executeRawUnsafe(
          `ALTER SEQUENCE IF EXISTS "${table}_id_seq" RESTART WITH 1;`
        )
      } catch {
        // Some tables use cuid() instead of sequences — ignore errors
      }
    }

    console.log('[admin/reset-db] Database reset complete — all tables truncated')

    return NextResponse.json({
      success: true,
      message: 'Database reset complete. All tables truncated.',
      tablesCleared: tableNames,
    })
  } catch (error) {
    console.error('[admin/reset-db] Error resetting database:', error)
    return NextResponse.json(
      { error: 'Failed to reset database', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
