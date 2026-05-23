# Task 5 - Backend Developer: Invoice HTML/PDF Generation Endpoint

## Task
Create `/home/z/my-project/src/app/api/usage/invoice/route.ts` that generates an HTML invoice page and optional PDF.

## Work Log

- Read worklog.md for project conventions (auth-utils, db, plans, versioning)
- Read prisma schema to understand User, Subscription, UsageEvent models
- Read existing `/api/usage/route.ts` for patterns (requireAuth, db queries, error handling)
- Read `plans.ts` for getPlan, USAGE_EVENT_TYPES, PlanId
- Created `/home/z/my-project/src/app/api/usage/invoice/route.ts`:
  - GET handler with `?month=YYYY-MM` and `?format=pdf` query params
  - `requireAuth()` for authentication
  - Parses month param (defaults to current month)
  - Fetches user's subscription + plan config
  - Queries UsageEvent for the billing period: queries, file uploads, dashboards created, exports
  - Also fetches data source count and storage usage
  - Detects locale from Accept-Language header + user.preferredLang (defaults to 'es')
  - Generates a complete standalone HTML invoice with:
    - Professional styling (Segoe UI, emerald accent #059669, print-ready CSS)
    - Header: DataMind BI logo + invoice number (INV-YYYYMM) + date + period
    - From/To details grid (company info + user name/email/plan)
    - Summary cards grid (queries, data sources, storage)
    - Detailed table (plan subscription row + usage rows + total row)
    - Conditional rows for uploads/dashboards/exports (only if > 0)
    - Footer with auto-generation notice
    - `@media print` styles for clean printing
  - Locale-aware text (ES/EN): labels, month names, footer text
  - If `format=pdf`: injects `window.onload = function() { window.print(); }` script
  - Returns HTML with `Content-Type: text/html` (not JSON) for browser tab rendering
  - 401 handling for unauthenticated requests
  - 500 error handling with logging

## Key Decisions
- Used the same error handling pattern as `/api/usage/route.ts` (try/catch with auth error check)
- Added summary cards section for quick visual overview of usage
- Only show upload/dashboard/export rows when count > 0 (avoids cluttered invoice)
- Locale detection: Accept-Language header > user.preferredLang > 'es' default
- PDF via browser print dialog (no server-side PDF library dependency)
- Invoice number format: INV-YYYYMM (e.g., INV-202506)

## Files Created
- `/home/z/my-project/src/app/api/usage/invoice/route.ts`

## Files Modified
- None

## Lint Result
- 0 errors, 1 pre-existing TanStack Table warning
