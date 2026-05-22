import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { detectCountryFromData } from '@/lib/map-registry';

// POST /api/maps/detect-country — detect country from dataset
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { data, columns } = body as {
      data?: Array<Record<string, unknown>>;
      columns?: string[];
    };

    // ── Validate input ─────────────────────────────────────────
    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'data must be a non-empty array of records' },
        { status: 400 }
      );
    }

    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      return NextResponse.json(
        { error: 'columns must be a non-empty array of strings' },
        { status: 400 }
      );
    }

    // ── Run detection ──────────────────────────────────────────
    const result = detectCountryFromData(data, columns);

    if (!result) {
      return NextResponse.json({ detected: false });
    }

    return NextResponse.json({
      countryCode: result.countryCode,
      regionColumn: result.regionColumn,
      confidence: result.confidence,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error detecting country:', error);
    return NextResponse.json({ error: 'Failed to detect country' }, { status: 500 });
  }
}
