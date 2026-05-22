import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-utils';
import { MAP_REGISTRY } from '@/lib/map-registry';

// GET /api/maps — list available maps (system + user custom)
export async function GET() {
  try {
    const user = await requireAuth();

    // ── System maps from MAP_REGISTRY ──────────────────────────
    const systemMaps = Object.values(MAP_REGISTRY).map((config) => ({
      id: `system-${config.countryCode}`,
      name: config.name,
      nameEn: config.nameEn,
      countryCode: config.countryCode,
      source: 'system' as const,
      regionCount: config.regions.length,
      isPublic: true,
    }));

    // ── User custom maps from DB ───────────────────────────────
    // Includes: user's own maps + system maps stored in DB
    const dbMaps = await db.mapLibrary.findMany({
      where: {
        OR: [
          { userId: user.id },
          { source: 'system' },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    const userMaps = dbMaps.map((m) => {
      let regionCount = 0;
      try {
        const parsed = JSON.parse(m.regions);
        if (Array.isArray(parsed)) regionCount = parsed.length;
      } catch {
        // invalid JSON — leave as 0
      }

      return {
        id: m.id,
        name: m.name,
        countryCode: m.countryCode,
        source: m.source,
        regionCount,
        isPublic: m.isPublic,
      };
    });

    return NextResponse.json({ maps: [...systemMaps, ...userMaps] });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error fetching maps:', error);
    return NextResponse.json({ error: 'Failed to fetch maps' }, { status: 500 });
  }
}
