import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { db } from '@/lib/db'

/**
 * PUT /api/user/profile
 *
 * Updates the authenticated user's profile fields.
 * Only fields present in the request body are updated (partial update).
 *
 * Editable fields: name, company, phone, country, taxId, preferredLang
 *
 * Response includes the full user data plus subscription info
 * so the frontend can update its state in one call.
 */
export async function PUT(request: Request) {
  try {
    const user = await requireAuth()

    const body = await request.json().catch(() => ({}))
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { name, company, phone, country, taxId, preferredLang } = body as {
      name?: string
      company?: string
      phone?: string
      country?: string
      taxId?: string
      preferredLang?: string
    }

    // Build update data — only include fields that are present in the body
    const updateData: Record<string, unknown> = {}

    if (name !== undefined) {
      const trimmed = typeof name === 'string' ? name.trim() : ''
      updateData.name = trimmed || null
    }

    if (company !== undefined) {
      const trimmed = typeof company === 'string' ? company.trim() : ''
      updateData.company = trimmed || null
    }

    if (phone !== undefined) {
      const trimmed = typeof phone === 'string' ? phone.trim() : ''
      updateData.phone = trimmed || null
    }

    if (country !== undefined) {
      const trimmed = typeof country === 'string' ? country.trim() : ''
      if (trimmed && !/^[A-Za-z]{2}$/.test(trimmed)) {
        return NextResponse.json(
          { error: 'Country must be a 2-letter ISO code (e.g., "DO", "US")' },
          { status: 400 }
        )
      }
      updateData.country = trimmed || null
    }

    if (taxId !== undefined) {
      const trimmed = typeof taxId === 'string' ? taxId.trim() : ''
      updateData.taxId = trimmed || null
    }

    if (preferredLang !== undefined) {
      const trimmed = typeof preferredLang === 'string' ? preferredLang.trim() : ''
      if (trimmed && !['en', 'es'].includes(trimmed)) {
        return NextResponse.json(
          { error: 'preferredLang must be "en" or "es"' },
          { status: 400 }
        )
      }
      updateData.preferredLang = trimmed || 'es'
    }

    // If no fields to update, return current user data
    if (Object.keys(updateData).length === 0) {
      const subscription = await db.subscription.findUnique({
        where: { userId: user.id },
        select: { plan: true, status: true },
      })

      return NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        preferredLang: user.preferredLang,
        company: user.company,
        phone: user.phone,
        country: user.country,
        taxId: user.taxId,
        onboardingCompleted: user.onboardingCompleted,
        interestArea: user.interestArea,
        subscription: subscription
          ? { plan: subscription.plan, status: subscription.status }
          : null,
      })
    }

    // Update the user record
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: updateData,
    })

    // Fetch subscription info for the response
    const subscription = await db.subscription.findUnique({
      where: { userId: updatedUser.id },
      select: { plan: true, status: true },
    })

    return NextResponse.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      avatarUrl: updatedUser.avatarUrl,
      role: updatedUser.role,
      preferredLang: updatedUser.preferredLang,
      company: updatedUser.company,
      phone: updatedUser.phone,
      country: updatedUser.country,
      taxId: updatedUser.taxId,
      onboardingCompleted: updatedUser.onboardingCompleted,
      interestArea: updatedUser.interestArea,
      subscription: subscription
        ? { plan: subscription.plan, status: subscription.status }
        : null,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.error('[user/profile] Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
