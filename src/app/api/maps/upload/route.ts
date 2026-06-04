import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-utils';

const MAX_SVG_SIZE = 2 * 1024 * 1024; // 2MB

interface RegionInput {
  name: string;
  id?: string;
  aliases: string[];
}

/**
 * Extract region names from SVG `<path data-name="...">` attributes.
 */
function extractRegionsFromSvg(svgContent: string): RegionInput[] {
  const regions: RegionInput[] = [];
  const regex = /<path[^>]*\bdata-name\s*=\s*"([^"]+)"[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(svgContent)) !== null) {
    const name = match[1].trim();
    if (name && !regions.some((r) => r.name === name)) {
      regions.push({ name, aliases: [] });
    }
  }

  return regions;
}

/**
 * Validate that the SVG contains <path> elements with data-name attributes.
 */
function validateSvg(svgContent: string): { valid: boolean; error?: string } {
  if (svgContent.length > MAX_SVG_SIZE) {
    return { valid: false, error: 'SVG file exceeds maximum size of 2MB' };
  }

  const hasPathWithDataName = /<path[^>]*\bdata-name\s*=\s*"([^"]+)"[^>]*>/i.test(svgContent);
  if (!hasPathWithDataName) {
    return { valid: false, error: 'SVG must contain <path> elements with data-name attributes' };
  }

  return { valid: true };
}

/**
 * Validate regions array structure.
 */
function validateRegions(regions: unknown): { valid: boolean; error?: string; parsed: RegionInput[] | null } {
  if (!Array.isArray(regions)) {
    return { valid: false, error: 'Regions must be a valid JSON array', parsed: null };
  }

  for (let i = 0; i < regions.length; i++) {
    const r = regions[i];
    if (!r || typeof r !== 'object') {
      return { valid: false, error: `Region at index ${i} must be an object`, parsed: null };
    }
    if (typeof r.name !== 'string' || r.name.trim() === '') {
      return { valid: false, error: `Region at index ${i} must have a non-empty "name" string`, parsed: null };
    }
    if (r.aliases !== undefined && !Array.isArray(r.aliases)) {
      return { valid: false, error: `Region "${r.name}" aliases must be an array`, parsed: null };
    }
    if (r.id !== undefined && typeof r.id !== 'string') {
      return { valid: false, error: `Region "${r.name}" id must be a string`, parsed: null };
    }
  }

  const parsed: RegionInput[] = regions.map((r: Record<string, unknown>) => ({
    name: String(r.name).trim(),
    id: r.id ? String(r.id).trim() : undefined,
    aliases: Array.isArray(r.aliases) ? r.aliases.map((a: unknown) => String(a).trim()) : [],
  }));

  return { valid: true, parsed };
}

// POST /api/maps/upload — upload a custom SVG map
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { name, countryCode, svgContent, regions } = body as {
      name?: string;
      countryCode?: string;
      svgContent?: string;
      regions?: unknown;
    };

    // ── Validate name ──────────────────────────────────────────
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Map name is required' }, { status: 400 });
    }

    // ── Validate svgContent ────────────────────────────────────
    if (!svgContent || typeof svgContent !== 'string') {
      return NextResponse.json({ error: 'SVG content is required' }, { status: 400 });
    }

    const svgValidation = validateSvg(svgContent);
    if (!svgValidation.valid) {
      return NextResponse.json({ error: svgValidation.error }, { status: 400 });
    }

    // ── Determine regions ──────────────────────────────────────
    let finalRegions: RegionInput[];

    if (regions !== undefined && regions !== null) {
      const regionValidation = validateRegions(regions);
      if (!regionValidation.valid) {
        return NextResponse.json({ error: regionValidation.error }, { status: 400 });
      }
      finalRegions = regionValidation.parsed!;
    } else {
      // Extract from SVG if not provided
      finalRegions = extractRegionsFromSvg(svgContent);
      if (finalRegions.length === 0) {
        return NextResponse.json(
          { error: 'No regions could be extracted from SVG. Provide regions explicitly or ensure SVG has <path data-name="..."> elements.' },
          { status: 400 }
        );
      }
    }

    // ── Create map record ──────────────────────────────────────
    const map = await db.mapLibrary.create({
      data: {
        userId: user.id,
        name: name.trim(),
        countryCode: countryCode?.trim() || null,
        svgContent,
        regions: JSON.stringify(finalRegions),
        source: 'user',
        isPublic: false,
      },
    });

    return NextResponse.json({ map }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error uploading map:', error);
    return NextResponse.json({ error: 'Failed to upload map' }, { status: 500 });
  }
}
