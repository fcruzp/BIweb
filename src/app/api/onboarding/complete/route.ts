import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { db } from '@/lib/db'

/**
 * POST /api/onboarding/complete
 *
 * Marks the user's onboarding as completed and optionally saves their interest area.
 * This is called when the user finishes the onboarding wizard.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json().catch(() => ({}))
    const { interestArea } = body as { interestArea?: string }

    await db.user.update({
      where: { id: user.id },
      data: {
        onboardingCompleted: true,
        ...(interestArea ? { interestArea } : {}),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    console.error('[onboarding/complete] Error:', error)
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 })
  }
}
