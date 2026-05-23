# Task 1 — Backend Developer: Usage Metrics API Endpoint

## Task
Create `GET /api/usage/metrics` endpoint that returns temporal usage data for charts.

## Work Log
- Read worklog.md to understand project conventions (auth, db, plans, i18n, etc.)
- Read existing files: prisma/schema.prisma, auth-utils.ts, plans.ts, db.ts, usage/route.ts, usage-tracking.ts
- Created `/home/z/my-project/src/app/api/usage/metrics/route.ts` with the following implementation:

### Implementation Details

1. **Auth**: Uses `requireAuth()` per project convention
2. **Plan lookup**: `db.subscription.findUnique()` → `getPlan(planId)`
3. **Period start**: 1st of current month
4. **Daily queries** (`dailyQueries`):
   - Raw SQL (`$queryRaw`) with PostgreSQL `TO_CHAR` for date grouping
   - Extracts `executionTime` from `metadata` JSON via `::jsonb->>'executionTime'`
   - Computes COUNT and AVG per day
   - Fills missing days with count=0 up to today (no chart gaps)
5. **Weekly queries** (`weeklyQueries`):
   - Aggregated from daily data using ISO week format (YYYY-Www)
   - Weighted average of avgDurationMs across days in each week
6. **Summary**:
   - `totalQueriesThisMonth`: sum of all daily counts
   - `avgResponseTimeMs`: weighted average across all raw query results
   - `peakDay`: day with highest count (null if no queries)
   - `projection`:
     - Unlimited plans: `limitReachedDate = null`
     - At/over limit: `limitReachedDate = now`
     - Otherwise: `dailyAvg = total/daysElapsed`, `daysToLimit = remaining/dailyAvg`, projected date
     - If projected date falls outside current month: `limitReachedDate = null`
7. **Event breakdown** (`eventBreakdown`):
   - Raw SQL GROUP BY event_type, ordered by count DESC
8. **Error handling**: 401 for auth errors, 500 for server errors

### ISO Week Calculation
- Helper function `getISOWeekString()` implements the ISO 8601 week algorithm
- Uses the "nearest Thursday" method for correct week/year boundary handling

### Lint Result
- 0 errors, 1 pre-existing TanStack Table warning (unrelated)

### Dev Server
- Running normally, no compilation errors
