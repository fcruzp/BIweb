# DataMind BI Web - Setup Worklog

## Session: 2026-06-04

### Task: Setup BIweb project environment

---

### 1. .env Configuration
- **Action**: Updated `/home/z/my-project/.env` with required values
- **Contents**:
  ```
  DATABASE_URL=file:/home/z/my-project/db/custom.db
  NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=mock-key
  OPENAI_API_KEY=mock
  ```

### 2. Middleware → Proxy Migration (Next.js 16)
- **Issue**: Next.js 16.1.3 has deprecated `middleware.ts` in favor of `proxy.ts`. Having both files caused a fatal error:
  ```
  Unhandled Rejection: Error: Both middleware file "./src/middleware.ts" and proxy file "./src/proxy.ts" are detected. Please use "./src/proxy.ts" only.
  ```
- **Fix**:
  - Renamed `src/middleware.ts` → `src/middleware.ts.bak`
  - Updated `src/proxy.ts` to be a simple pass-through (no auth):
    ```typescript
    import { type NextRequest, NextResponse } from 'next/server'
    export async function proxy(request: NextRequest) {
      return NextResponse.next({ request: { headers: request.headers } })
    }
    export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|ogg|mp3|wav|ico|woff|woff2|ttf|eot)$).*)'] }
    ```

### 3. Supabase Mock Client Fixes
- **File**: `src/utils/supabase/client.ts`
  - Added `options?: any` param to `signInWithOAuth`
  - Added `email?: string, options?: any` params to `resetPasswordForEmail`
  - Added `options?: any` param to `onAuthStateChange`
- **File**: `src/utils/supabase/server.ts`
  - Added `exchangeCodeForSession(code: string)` method to mock server auth (fixes `src/app/auth/callback/route.ts`)

### 4. AuthModal.tsx Type Fixes
- **File**: `src/components/auth/AuthModal.tsx`
  - Replaced `authError.message` with `(authError as any).message || 'Auth failed'` throughout (mock returns `null` for error, causing TS inference issues)
  - Fixed `data.user?.email_confirmed_at` → `(data.user as any)?.email_confirmed_at` (mock user type doesn't have these fields)

### 5. Metrics Dashboard Fix
- **File**: `src/components/app/settings/metrics-dashboard-dialog.tsx`
  - Added `locale: string = 'en'` parameter to `generateMockMetrics()` function
  - Updated call site to pass `locale` from the component's i18n hook

### 6. WelcomeScreen Framer Motion Fix
- **File**: `src/components/auth/WelcomeScreen.tsx`
  - Fixed `ease: [0.16, 1, 0.3, 1]` TypeScript errors by adding tuple assertion: `as [number, number, number, number]`

### 7. Dev Server Test Results
- **All routes returning 200**:
  - `GET /` — 200 ✅
  - `GET /api/auth/user` — 200 ✅
  - `GET /api/dashboards` — 200 ✅
  - `GET /api/datasources` — 200 ✅
  - `GET /api/history` — 200 ✅
  - `GET /api/usage` — 200 ✅
  - `GET /api/maps` — 200 ✅
  - `GET /api/ai/check` — 405 (expected — POST only)

### Remaining TypeScript Warnings (non-blocking)
These are type-level issues that don't affect runtime:
- `src/app/api/onboarding/demo/route.ts`: arithmetic operation type narrowing
- `src/app/api/stripe/webhook/route.ts`: Stripe Session/Subscription type casting
- Some framer-motion `ease` array typing in inline JSX props

### Key Finding: Background Process Limitation
- The dev server runs successfully but **background processes don't persist** between tool calls in this sandbox environment
- To start the dev server, run: `cd /home/z/my-project && npx next dev -p 3000`
- The `bun run dev` script pipes through `tee` which can cause output buffering issues; `npx next dev` works more reliably

---

### Files Modified
1. `/home/z/my-project/.env` — Updated with all required env vars
2. `/home/z/my-project/src/middleware.ts` → Renamed to `.bak`
3. `/home/z/my-project/src/proxy.ts` — Updated as pass-through
4. `/home/z/my-project/src/utils/supabase/client.ts` — Added missing method params
5. `/home/z/my-project/src/utils/supabase/server.ts` — Added `exchangeCodeForSession`
6. `/home/z/my-project/src/components/auth/AuthModal.tsx` — Fixed type errors
7. `/home/z/my-project/src/components/app/settings/metrics-dashboard-dialog.tsx` — Added locale param
8. `/home/z/my-project/src/components/auth/WelcomeScreen.tsx` — Fixed ease tuple types

---
Task ID: api-keys-1
Agent: Z.ai Code (continuation session)
Task: Implement per-user API Keys system for DataMind BI (OpenFN/N8N integration)

Work Log:
- Cloned BIweb repo into /home/z/my-project (replaced sandbox template, preserved .zscripts)
- Read existing architecture: prisma schema (postgresql + Supabase), auth-utils (getCurrentUser/ensureUser), settings-dialog, supabase server/client, middleware
- Added ApiKey + ApiRequestLog models to prisma/schema.prisma, plus User.apiKeys relation (postgresql provider preserved)
- Implemented src/lib/api-auth.ts: generateApiKey, hashApiKey (SHA-256), authenticateApiKey (Bearer), requireScope/hasScope (admin=read+execute), parseScopes/serializeScopes, maskApiKey, getClientIp, logApiRequest, unauthorizedResponse
- Built session-auth endpoints: GET/POST /api/settings/api-keys (list + create), DELETE /api/settings/api-keys/[id] (soft-revoke, ownership check, idempotent). Zod validation, per-user cap (25)
- Built public Bearer-auth endpoint: GET /api/public/v1/me (requires read scope, returns user+apiKey+capabilities+subscription, logs every request)
- Added /api/public/v1/ to middleware PUBLIC_API_ROUTES (skip Supabase getUser for API-key endpoints)
- Built UI: dict.ts (en/es local i18n + scope metadata), new-key-reveal-dialog.tsx (one-time reveal, blocks outside-click/escape, copy + curl example), create-api-key-dialog.tsx (label + scope checkboxes + expiry select), api-keys-manager.tsx (table with masked keys, scope badges, status, last-used, request count, revoke confirmation, empty state, security note)
- Integrated "Developer / API Keys" section into settings-dialog.tsx (opens ApiKeysManager dialog)
- LOCAL sandbox testing (uncommitted): switched prisma to sqlite, added TEST_AUTH_EMAIL bypass in getCurrentUser, seeded test user + keys, ran full CRUD + scope + revoke + validation tests via curl — all passing. Reverted all sandbox-only changes before commit.

Stage Summary:
- Backend fully verified end-to-end: valid key 200, missing/invalid/revoked 401, scope enforcement 403, Zod validation 400, ownership 404, request logging to ApiRequestLog
- Landing page renders cleanly via agent-browser (no console errors); settings UI behind auth (mock Supabase) — verified via lint + compile + identical patterns to existing dialogs
- Committed feature only (postgresql schema, no test bypass, no seed scripts). db/custom.db reverted. .env gitignored.
- Pushed to main + master (Coolify auto-deploys from master)
