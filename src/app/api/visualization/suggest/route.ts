import { NextRequest, NextResponse } from 'next/server';
import { suggestVisualizationHeuristic } from '@/lib/viz-heuristics';

// POST /api/visualization/suggest - Get visualization suggestion for data (instant, heuristic)
export async function POST(request: NextRequest) {
  try {
    const { sql, data, naturalQuery } = await request.json();

    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Data array is required' }, { status: 400 });
    }

    const visualization = suggestVisualizationHeuristic(sql || '', data, naturalQuery || '');

    return NextResponse.json({ visualization });
  } catch (error) {
    console.error('Error suggesting visualization:', error);
    return NextResponse.json({ error: 'Failed to suggest visualization' }, { status: 500 });
  }
}
