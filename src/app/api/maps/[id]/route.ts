import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-utils';
import { MAP_REGISTRY } from '@/lib/map-registry';

// GET /api/maps/[id] — get single map details (including SVG content and regions)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await requireAuth();

    // ── Check if it's a system map request ─────────────────────
    if (id.startsWith('system-')) {
      const countryCode = id.replace('system-', '');
      const config = MAP_REGISTRY[countryCode.toUpperCase()];

      if (!config) {
        return NextResponse.json({ error: 'Map not found' }, { status: 404 });
      }

      return NextResponse.json({
        map: {
          id: `system-${config.countryCode}`,
          name: config.name,
          nameEn: config.nameEn,
          countryCode: config.countryCode,
          source: 'system',
          regions: config.regions,
          paths: config.paths,
          regionLabel: config.regionLabel,
          regionLabelEn: config.regionLabelEn,
          regionCount: config.regions.length,
          isPublic: true,
        },
      });
    }

    // ── DB map lookup ──────────────────────────────────────────
    const map = await db.mapLibrary.findUnique({
      where: { id },
    });

    if (!map) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 });
    }

    // Access control: user must own the map, or it must be a system/public map
    if (map.source !== 'system' && !map.isPublic && map.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let parsedRegions: unknown = [];
    try {
      parsedRegions = JSON.parse(map.regions);
    } catch {
      // keep as empty array
    }

    return NextResponse.json({
      map: {
        id: map.id,
        name: map.name,
        countryCode: map.countryCode,
        source: map.source,
        svgContent: map.svgContent,
        regions: parsedRegions,
        isPublic: map.isPublic,
        createdAt: map.createdAt,
        updatedAt: map.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error fetching map:', error);
    return NextResponse.json({ error: 'Failed to fetch map' }, { status: 500 });
  }
}

// DELETE /api/maps/[id] — delete a custom map (only owner, not system maps)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await requireAuth();

    // ── Cannot delete system maps ──────────────────────────────
    if (id.startsWith('system-')) {
      return NextResponse.json({ error: 'System maps cannot be deleted' }, { status: 403 });
    }

    const map = await db.mapLibrary.findUnique({
      where: { id },
    });

    if (!map) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 });
    }

    // ── Only the owner can delete ──────────────────────────────
    if (map.source === 'system') {
      return NextResponse.json({ error: 'System maps cannot be deleted' }, { status: 403 });
    }

    if (map.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.mapLibrary.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error deleting map:', error);
    return NextResponse.json({ error: 'Failed to delete map' }, { status: 500 });
  }
}
