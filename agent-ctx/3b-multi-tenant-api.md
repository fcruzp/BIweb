# Task 3b — Multi-Tenant Datasource API Routes

## Work Log

- Read existing files: auth-utils.ts, datasources/route.ts, datasources/[id]/route.ts, datasources/[id]/analyze/route.ts
- Confirmed auth utility signatures: `requireAuth()` returns `Promise<User>`, `verifyOwnership(resourceUserId)` returns `Promise<boolean>`

### Updated: `/src/app/api/datasources/route.ts`
- Added `import { requireAuth } from '@/lib/auth-utils'`
- **GET**: Added `requireAuth()` call, then filter by `userId: user.id` in `findMany`
- **POST**: Added `requireAuth()` call, then added `userId: user.id` to `db.dataSource.create` data
- Added error handling for `requireAuth()` throwing "Authentication required" → returns 401

### Updated: `/src/app/api/datasources/[id]/route.ts`
- Added `import { requireAuth, verifyOwnership } from '@/lib/auth-utils'`
- **GET**: Added `requireAuth()`, then `await verifyOwnership(datasource.userId)` → returns 403 if not owner
- **DELETE**: Added `requireAuth()`, then `await verifyOwnership(datasource.userId)` → returns 403 if not owner
- Added error handling for auth errors → returns 401

### Updated: `/src/app/api/datasources/[id]/analyze/route.ts`
- Added `import { requireAuth, verifyOwnership } from '@/lib/auth-utils'`
- **POST**: Added `requireAuth()`, then `await verifyOwnership(datasource.userId)` → returns 403 if not owner
- Added error handling for auth errors → returns 401

### Key Design Decisions
- `verifyOwnership` is async (returns `Promise<boolean>`), so all calls use `await`
- Auth middleware already returns 401 for unauthenticated API requests, but `requireAuth()` is added as a safety net
- 403 Forbidden returned when authenticated user doesn't own the resource
- Lint passes (0 errors, 1 pre-existing warning)

## Summary
All three datasource API route files now enforce multi-tenant data isolation:
- List endpoint only shows the authenticated user's data sources
- Create endpoint associates new data sources with the authenticated user
- Single-resource endpoints (GET, DELETE, analyze) verify ownership before proceeding
