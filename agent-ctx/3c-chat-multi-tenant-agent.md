# Task 3c — Multi-Tenant Chat API Routes

## Work Log

- Read auth-utils.ts to confirm signatures: requireAuth() → Promise<User>, verifyOwnership(resourceUserId) → Promise<boolean>
- Read all 4 target files and Prisma schema to understand model relationships
- Updated src/app/api/chat/sessions/route.ts:
  - GET: Added requireAuth() with try/catch → 401 on auth failure
  - GET: Fetches data source, verifies ownership (verifyOwnership(dataSource.userId)) → 403 if not owner
  - GET: Filters chat sessions by userId: user.id in addition to dataSourceId
  - POST: Added requireAuth() with try/catch → 401 on auth failure
  - POST: Fetches data source, verifies ownership (verifyOwnership(dataSource.userId)) → 403 if not owner
  - POST: Added userId: user.id to chatSession.create data
- Updated src/app/api/chat/sessions/[id]/route.ts:
  - PATCH: Added requireAuth() with try/catch → 401 on auth failure
  - PATCH: Added verifyOwnership(existing.userId) check → 403 if not owner
  - DELETE: Added requireAuth() with try/catch → 401 on auth failure
  - DELETE: Added verifyOwnership(existing.userId) check → 403 if not owner
- Updated src/app/api/chat/sessions/[id]/messages/route.ts:
  - GET: Added requireAuth() with try/catch → 401 on auth failure
  - GET: Added verifyOwnership(session.userId) check → 403 if not owner
- Updated src/app/api/chat/route.ts:
  - POST: Added requireAuth() with try/catch → 401 on auth failure at the very start
  - POST: Added verifyOwnership(datasource.userId) check after fetching data source → 403 if not owner
  - POST: Added userId: user.id when creating new chat sessions (chatSession.create)
  - POST: Added ownership verification for existing sessions when sessionId is provided (verifyOwnership(existingSession.userId) → 403 if not owner)
  - POST: Chat messages don't have a userId field, so no userId added there (ownership is via the session)
- Lint passes (0 errors, 1 pre-existing warning from TanStack Table)
- Dev server running correctly

## Stage Summary

- All 4 chat API route files now enforce multi-tenant data isolation
- Chat sessions list filtered by userId (users only see their own sessions)
- New chat sessions are created with userId: user.id
- Existing session access (PATCH, DELETE, GET messages) verifies ownership → 403 if not owner
- Chat POST route verifies data source ownership before creating sessions/messages
- Chat POST route also verifies existing session ownership when sessionId is provided
- Combined with Tasks 3b, 3d, 3e, all data-access API routes are now multi-tenant aware
