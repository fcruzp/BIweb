import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

/**
 * POST /api/admin/reset-files
 *
 * Deletes all uploaded SQLite database files from the data directory.
 * This should be used together with /api/admin/reset-db for a complete reset.
 *
 * SECURITY: Same as reset-db — requires X-Admin-Key header matching ADMIN_SECRET_KEY.
 *
 * The data directory is determined by:
 * 1. DATA_DIR environment variable (if set)
 * 2. {cwd}/data/ — default
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
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data')

    if (!fs.existsSync(dataDir)) {
      return NextResponse.json({
        success: true,
        message: 'Data directory does not exist — nothing to clean.',
        dataDir,
        filesDeleted: 0,
      })
    }

    // List all files before deleting
    const files = fs.readdirSync(dataDir)
    const sqliteFiles = files.filter(f =>
      f.endsWith('.sqlite') || f.endsWith('.db') || f.endsWith('.sqlite3')
    )

    let deletedCount = 0
    const deletedFiles: string[] = []
    const errors: string[] = []

    for (const file of sqliteFiles) {
      const filePath = path.join(dataDir, file)
      try {
        fs.unlinkSync(filePath)
        deletedCount++
        deletedFiles.push(file)
      } catch (err) {
        errors.push(`${file}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    console.log(`[admin/reset-files] Deleted ${deletedCount} files from ${dataDir}`)

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} database file(s) from ${dataDir}`,
      dataDir,
      filesDeleted: deletedCount,
      deletedFiles,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('[admin/reset-files] Error cleaning files:', error)
    return NextResponse.json(
      { error: 'Failed to clean files', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
