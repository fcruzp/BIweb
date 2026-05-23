# Task 2 — Metrics Dashboard Dialog (Frontend Developer)

## Task
Create `/home/z/my-project/src/components/app/settings/metrics-dashboard-dialog.tsx` — a comprehensive metrics dashboard accessible from the UserMenu.

## Work Log

### 1. Read project context
- Read `worklog.md` for project conventions (i18n, authFetch, shadcn/ui, emerald scheme, Recharts, Zustand stores, etc.)
- Read existing `usage-plan-dialog.tsx` for component patterns and data types
- Read `UserMenu.tsx` for integration reference
- Read `plans.ts` for plan config and types
- Read `fetch-utils.ts` for authFetch API

### 2. Added i18n keys to `/home/z/my-project/src/lib/i18n.ts`
Added 22 new translation keys to BOTH EN and ES sections:
- metricsDashboard, metricsOverview, metricsActivity, metricsBilling
- avgResponseTime, daysRemaining, estimatedTotal
- projectionWarning, dailyQueries, eventBreakdown
- billingHistory, invoice, amount, description, download
- paid, current, pending
- noChartData, noChartDataDesc
- ms, queriesPerDay

Did NOT duplicate existing keys: queriesThisMonth, status, viewPlans (already existed)

### 3. Created metrics-dashboard-dialog.tsx
Component structure:
- `MetricsDashboardDialog({ open, onOpenChange })` — Main dialog component
  - Dialog with `sm:max-w-4xl`, backdrop blur, emerald Activity icon
  - Three tabs: Overview | Activity | Billing (using shadcn Tabs)
  - Fetches `/api/usage` and `/api/usage/metrics` on dialog open
  - Falls back to `generateMockMetrics()` if metrics endpoint doesn't exist yet
  - Loading/error states with retry
  - Includes `UsagePlanDialog` for "View Plans" button in Billing tab

**Overview Tab:**
- 2x2 grid of summary cards (Total Queries, Avg Response Time, Days Remaining, Estimated Total)
- 4 usage progress bars (Queries, Data Sources, Storage, Dashboards) with color coding
- Projection warning banner when query limit will be reached

**Activity Tab:**
- Recharts AreaChart for daily queries with emerald gradient fill
- Recharts horizontal BarChart for event breakdown
- Avg Response Time indicator card
- NoChartData fallback component when no data
- All charts use `isAnimationActive={false}` and `animationDuration={0}` for performance

**Billing Tab:**
- Current Plan card with Crown icon, plan name, price, status badge
- Billing History table with 6 mock invoices (generated via `generateMockInvoices()`)
- Table columns: Invoice ID, Description, Amount, Status badge, Download button
- Download button opens `/api/usage/invoice?month=YYYY-MM` in new tab
- "View Plans" button opens UsagePlanDialog

**Key design decisions:**
- Used `generateMockMetrics()` function that creates realistic daily data based on actual usage numbers from `/api/usage`
- Projection date calculation: estimates when query limit will be hit based on current daily rate
- Event breakdown populated from usage data (queries, uploads, dashboards, exports)
- Emerald-500/600 color scheme throughout
- All user-facing text uses `t('key')` with i18n
- Uses `authFetch` for API calls
- Uses shadcn/ui components (Dialog, Card, Tabs, Badge, Progress, ScrollArea, Button)

### 4. Lint check
- `bun run lint` passes: 0 errors, 1 pre-existing TanStack Table warning
