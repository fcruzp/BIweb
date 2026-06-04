/**
 * Usage Tracking Helper
 *
 * Lightweight function to record usage events.
 * Called from API routes after successful actions.
 * Non-blocking — does not affect the response if it fails.
 */

import { db } from '@/lib/db';
import { getPlan, USAGE_EVENT_TYPES, type UsageEventType, type PlanId } from '@/lib/plans';

/**
 * Record a usage event for a user.
 * Non-blocking — errors are logged but don't throw.
 */
export async function recordUsage(
  userId: string,
  eventType: UsageEventType,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await db.usageEvent.create({
      data: {
        userId,
        eventType,
        metadata: metadata ? JSON.stringify(metadata) : '{}',
      },
    });
  } catch (error) {
    // Non-critical: don't fail the main operation
    console.warn('[UsageTracking] Failed to record event:', { userId, eventType, error: error instanceof Error ? error.message : error });
  }
}

/**
 * Check if a user has reached a usage limit for the current billing period.
 * Returns { allowed: true } if under limit, { allowed: false, usage, limit } if at/over limit.
 */
export async function checkUsageLimit(
  userId: string,
  limitType: 'queries' | 'dataSources' | 'dashboards' | 'storage' | 'chatSessions',
): Promise<{ allowed: boolean; usage: number; limit: number | null; planName: string }> {
  try {
    const subscription = await db.subscription.findUnique({
      where: { userId },
      select: { plan: true },
    });

    const planId = (subscription?.plan || 'free') as PlanId;
    const plan = getPlan(planId);

    switch (limitType) {
      case 'queries': {
        const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const usage = await db.usageEvent.count({
          where: {
            userId,
            eventType: USAGE_EVENT_TYPES.QUERY_EXECUTED,
            createdAt: { gte: periodStart },
          },
        });
        return {
          allowed: plan.maxQueries === null || usage < plan.maxQueries,
          usage,
          limit: plan.maxQueries,
          planName: plan.name,
        };
      }

      case 'dataSources': {
        const usage = await db.dataSource.count({ where: { userId } });
        return {
          allowed: plan.maxDataSources === null || usage < plan.maxDataSources,
          usage,
          limit: plan.maxDataSources,
          planName: plan.name,
        };
      }

      case 'dashboards': {
        const usage = await db.dashboard.count({ where: { userId } });
        return {
          allowed: plan.maxDashboards === null || usage < plan.maxDashboards,
          usage,
          limit: plan.maxDashboards,
          planName: plan.name,
        };
      }

      case 'storage': {
        const result = await db.dataSource.aggregate({
          where: { userId },
          _sum: { fileSize: true },
        });
        const usageMB = (result._sum.fileSize || 0) / (1024 * 1024);
        return {
          allowed: plan.maxStorageMB === null || usageMB < plan.maxStorageMB,
          usage: Math.round(usageMB * 100) / 100,
          limit: plan.maxStorageMB,
          planName: plan.name,
        };
      }

      case 'chatSessions': {
        // Count total chat sessions across all data sources
        const usage = await db.chatSession.count({ where: { userId } });
        return {
          allowed: plan.maxChatSessions === null || usage < plan.maxChatSessions,
          usage,
          limit: plan.maxChatSessions,
          planName: plan.name,
        };
      }
    }
  } catch (error) {
    // If we can't check the limit, allow the action (fail open)
    console.warn('[UsageTracking] Failed to check limit:', error instanceof Error ? error.message : error);
    return { allowed: true, usage: 0, limit: null, planName: 'Unknown' };
  }
}
