import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-utils';
import { getPlan, USAGE_EVENT_TYPES, type PlanId } from '@/lib/plans';

// GET /api/usage/metrics — Temporal usage data for charts
export async function GET() {
  try {
    const user = await requireAuth();

    // Get user's subscription/plan
    const subscription = await db.subscription.findUnique({
      where: { userId: user.id },
      select: { plan: true },
    });

    const planId = (subscription?.plan || 'free') as PlanId;
    const plan = getPlan(planId);

    // Period start: 1st of current month
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // ── Daily queries: group by date, count, avg execution time ──
    // Using raw SQL for PostgreSQL date formatting and JSON extraction from metadata
    const dailyResults = await db.$queryRaw<
      { date: string; count: bigint; avg_duration: number | null }[]
    >`
      SELECT
        TO_CHAR(ue.created_at, 'YYYY-MM-DD') AS date,
        COUNT(*)::int AS count,
        AVG((ue.metadata::jsonb->>'executionTime')::float) AS avg_duration
      FROM usage_events ue
      WHERE ue.user_id = ${user.id}
        AND ue.event_type = ${USAGE_EVENT_TYPES.QUERY_EXECUTED}
        AND ue.created_at >= ${periodStart}
      GROUP BY TO_CHAR(ue.created_at, 'YYYY-MM-DD')
      ORDER BY date ASC
    `;

    // Build a map from the raw results for quick lookup
    const dailyMap = new Map<string, { count: number; avgDurationMs: number | null }>();
    for (const row of dailyResults) {
      dailyMap.set(row.date, {
        count: Number(row.count),
        avgDurationMs: row.avg_duration !== null ? Math.round(row.avg_duration) : null,
      });
    }

    // Fill in missing days so the chart has no gaps (only up to today)
    const dailyQueries: { date: string; count: number; avgDurationMs: number | null }[] = [];
    const today = now.getDate();
    for (let day = 1; day <= today; day++) {
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const entry = dailyMap.get(dateStr);
      dailyQueries.push({
        date: dateStr,
        count: entry?.count ?? 0,
        avgDurationMs: entry?.avgDurationMs ?? null,
      });
    }

    // ── Build weekly aggregation from daily data ──
    const weeklyMap = new Map<
      string,
      { count: number; totalDuration: number; durationCount: number }
    >();

    for (const day of dailyQueries) {
      if (day.count === 0) continue;
      const date = new Date(day.date + 'T00:00:00Z');
      const weekStr = getISOWeekString(date);
      const existing = weeklyMap.get(weekStr) ?? {
        count: 0,
        totalDuration: 0,
        durationCount: 0,
      };
      existing.count += day.count;
      if (day.avgDurationMs !== null) {
        existing.totalDuration += day.avgDurationMs * day.count;
        existing.durationCount += day.count;
      }
      weeklyMap.set(weekStr, existing);
    }

    const weeklyQueries = Array.from(weeklyMap.entries())
      .map(([week, data]) => ({
        week,
        count: data.count,
        avgDurationMs:
          data.durationCount > 0
            ? Math.round(data.totalDuration / data.durationCount)
            : null,
      }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // ── Summary ──
    const totalQueriesThisMonth = dailyQueries.reduce(
      (sum, d) => sum + d.count,
      0
    );

    // Weighted average response time across all queries
    const totalDurationSum = dailyResults.reduce((sum, r) => {
      if (r.avg_duration !== null) {
        return sum + r.avg_duration * Number(r.count);
      }
      return sum;
    }, 0);
    const totalCount = dailyResults.reduce(
      (sum, r) => sum + Number(r.count),
      0
    );
    const avgResponseTimeMs =
      totalCount > 0 ? Math.round(totalDurationSum / totalCount) : 0;

    // Peak day (day with most queries)
    const peakDayEntry = dailyQueries.reduce<{
      date: string;
      count: number;
    } | null>((peak, d) => {
      if (!peak || d.count > peak.count) return { date: d.date, count: d.count };
      return peak;
    }, null);

    // Projection: based on daily average consumption rate vs remaining plan limit
    const daysElapsed = now.getDate();
    const dailyAvg = daysElapsed > 0 ? totalQueriesThisMonth / daysElapsed : 0;
    const daysInFullMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();
    const daysRemaining = daysInFullMonth - daysElapsed;
    const estimatedTotal = Math.round(dailyAvg * daysInFullMonth);

    let limitReachedDate: string | null;

    if (plan.maxQueries === null) {
      // Unlimited plan — no limit will ever be reached
      limitReachedDate = null;
    } else if (totalQueriesThisMonth >= plan.maxQueries) {
      // Already at or over limit
      limitReachedDate = now.toISOString();
    } else if (dailyAvg <= 0) {
      // No usage yet — can't project
      limitReachedDate = null;
    } else {
      const remaining = plan.maxQueries - totalQueriesThisMonth;
      const daysToLimit = Math.ceil(remaining / dailyAvg);
      const limitDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + daysToLimit
      );
      // If the projected limit date is beyond this period, it won't be reached this month
      if (limitDate.getMonth() === now.getMonth()) {
        limitReachedDate = limitDate.toISOString();
      } else {
        limitReachedDate = null;
      }
    }

    // ── Event breakdown: count of each eventType this period ──
    const eventBreakdownResults = await db.$queryRaw<
      { event_type: string; count: bigint }[]
    >`
      SELECT
        ue.event_type,
        COUNT(*)::int AS count
      FROM usage_events ue
      WHERE ue.user_id = ${user.id}
        AND ue.created_at >= ${periodStart}
      GROUP BY ue.event_type
      ORDER BY count DESC
    `;

    const eventBreakdown = eventBreakdownResults.map((r) => ({
      eventType: r.event_type,
      count: Number(r.count),
    }));

    // ── Assemble response ──
    return NextResponse.json({
      dailyQueries,
      weeklyQueries,
      summary: {
        totalQueriesThisMonth,
        avgResponseTimeMs,
        peakDay:
          peakDayEntry && peakDayEntry.count > 0 ? peakDayEntry : null,
        projection: {
          daysRemaining,
          estimatedTotal,
          limitReachedDate,
        },
      },
      eventBreakdown,
      periodStart: periodStart.toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    console.error('Error fetching usage metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage metrics' },
      { status: 500 }
    );
  }
}

/**
 * Get ISO week string in format YYYY-Www (e.g., "2025-W22")
 */
function getISOWeekString(date: Date): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
