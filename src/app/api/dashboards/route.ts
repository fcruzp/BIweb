import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/dashboards
export async function GET() {
  try {
    const dashboards = await db.dashboard.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { widgets: true },
    });
    return NextResponse.json({ dashboards });
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboards' }, { status: 500 });
  }
}

// POST /api/dashboards
export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const dashboard = await db.dashboard.create({
      data: {
        name,
        description: description || null,
        layout: JSON.stringify({ columns: 12 }),
      },
      include: { widgets: true },
    });

    return NextResponse.json({ dashboard }, { status: 201 });
  } catch (error) {
    console.error('Error creating dashboard:', error);
    return NextResponse.json({ error: 'Failed to create dashboard' }, { status: 500 });
  }
}
