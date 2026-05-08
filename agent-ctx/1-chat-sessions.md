# Task 1 — Multiple chats per datasource + remember last selected datasource + chat management

## Work Completed

### Backend API
1. **`/api/chat/sessions/route.ts`** — Added POST handler for creating new chat sessions
   - Accepts `{ dataSourceId, title? }`
   - Verifies data source exists, creates session, returns 201
2. **`/api/chat/sessions/[id]/route.ts`** — New file with PATCH (rename) and DELETE
3. **`/api/chat/sessions/[id]/messages/route.ts`** — New file, GET messages for a session

### Stores
4. **`app-store.ts`** — Added `chatSessions`, `chatSessionsLoading`, persist `activeDataSourceId` via Zustand persist middleware, new CRUD actions
5. **`chat-store.ts`** — Added `loadMessages(sessionId)` async action that fetches and parses messages from API

### Frontend
6. **`app-sidebar.tsx`** — Added "Chats" sidebar group with "+" button to create new chats
7. **`chat-session-list.tsx`** — New component with session list, inline rename (double-click or pencil icon), delete with AlertDialog confirmation
8. **`chat-interface.tsx`** — Shows active chat title in header
9. **`message-input.tsx`** — Auto-creates session via API if no activeSessionId before sending message

### Lint
- 0 errors, 1 pre-existing warning (TanStack Table)
