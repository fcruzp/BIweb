import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-utils';
import { getPlan, USAGE_EVENT_TYPES, findUpgradePlan, type PlanId } from '@/lib/plans';

// GET /api/usage — Current user's usage stats + plan limits
export async function GET() {
  try {
    const user = await requireAuth();

    // Get user's subscription/plan
    const subscription = await db.subscription.findUnique({
      where: { userId: user.id },
      select: { plan: true, status: true },
    });

    const planId = (subscription?.plan || 'free') as PlanId;
    const plan = getPlan(planId);

    // Get current billing period start (1st of current month)
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count usage events this period
    const [
      queryCount,
      dataSourceCount,
      dashboardCount,
      chatSessionCount,
      storageResult,
    ] = await Promise.all([
      // Queries this period
      db.usageEvent.count({
        where: {
          userId: user.id,
          eventType: USAGE_EVENT_TYPES.QUERY_EXECUTED,
          createdAt: { gte: periodStart },
        },
      }),
      // Data sources (total, not per-period — they accumulate)
      db.dataSource.count({
        where: { userId: user.id },
      }),
      // Dashboards (total)
      db.dashboard.count({
        where: { userId: user.id },
      }),
      // Chat sessions (total)
      db.chatSession.count({
        where: { userId: user.id },
      }),
      // Total storage used (sum of file sizes)
      db.dataSource.aggregate({
        where: { userId: user.id },
        _sum: { fileSize: true },
      }),
    ]);

    const storageUsedMB = (storageResult._sum.fileSize || 0) / (1024 * 1024);

    // Build usage object
    const usage = {
      queries: {
        used: queryCount,
        limit: plan.maxQueries,
        unlimited: plan.maxQueries === null,
        percentage: plan.maxQueries ? Math.min(100, Math.round((queryCount / plan.maxQueries) * 100)) : 0,
        upgradePlanId: plan.maxQueries !== null && queryCount >= plan.maxQueries
          ? findUpgradePlan(planId, 'maxQueries')
          : null,
      },
      dataSources: {
        used: dataSourceCount,
        limit: plan.maxDataSources,
        unlimited: plan.maxDataSources === null,
        percentage: plan.maxDataSources ? Math.min(100, Math.round((dataSourceCount / plan.maxDataSources) * 100)) : 0,
        upgradePlanId: plan.maxDataSources !== null && dataSourceCount >= plan.maxDataSources
          ? findUpgradePlan(planId, 'maxDataSources')
          : null,
      },
      dashboards: {
        used: dashboardCount,
        limit: plan.maxDashboards,
        unlimited: plan.maxDashboards === null,
        percentage: plan.maxDashboards ? Math.min(100, Math.round((dashboardCount / plan.maxDashboards) * 100)) : 0,
        upgradePlanId: plan.maxDashboards !== null && dashboardCount >= plan.maxDashboards
          ? findUpgradePlan(planId, 'maxDashboards')
          : null,
      },
      chatSessions: {
        used: chatSessionCount,
        limit: plan.maxChatSessions,
        unlimited: plan.maxChatSessions === null,
        percentage: plan.maxChatSessions ? Math.min(100, Math.round((chatSessionCount / plan.maxChatSessions) * 100)) : 0,
        upgradePlanId: plan.maxChatSessions !== null && chatSessionCount >= plan.maxChatSessions
          ? findUpgradePlan(planId, 'maxChatSessions')
          : null,
      },
      storage: {
        usedMB: Math.round(storageUsedMB * 100) / 100,
        limitMB: plan.maxStorageMB,
        unlimited: plan.maxStorageMB === null,
        percentage: plan.maxStorageMB ? Math.min(100, Math.round((storageUsedMB / plan.maxStorageMB) * 100)) : 0,
        upgradePlanId: plan.maxStorageMB !== null && storageUsedMB >= plan.maxStorageMB
          ? findUpgradePlan(planId, 'maxStorageMB')
          : null,
      },
    };

    return NextResponse.json({
      plan: {
        id: plan.id,
        name: plan.name,
        nameEs: plan.nameEs,
        price: plan.price,
        priceDisplay: plan.priceDisplay,
        features: {
          canShare: plan.canShare,
          canAnalyze: plan.canAnalyze,
          canUseCustomKeys: plan.canUseCustomKeys,
          prioritySupport: plan.prioritySupport,
          maxExportRows: plan.maxExportRows,
        },
      },
      subscription: {
        plan: planId,
        status: subscription?.status || 'active',
      },
      usage,
      periodStart: periodStart.toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error fetching usage:', error);
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}
