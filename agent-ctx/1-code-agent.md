# Task 1 - Code Agent Work Record

## Task: Handle schema questions in chat

### Problem
When users ask questions like "¿Cuáles tablas tenemos en la base de datos?", the AI tries to generate a SQL query to `sqlite_master`, which gets blocked by the security validator. The AI should recognize this as a schema question and respond with stored schema metadata directly.

### Changes Made

#### 1. `src/lib/prompts.ts`
- Rewrote `textToSQL` prompt to include two-part classification
- AI must classify questions as "query" or "schema_question"
- Added explicit examples in English and Spanish
- Added rule: never query sqlite_master — classify as schema_question instead
- Updated response JSON format with `type` field

#### 2. `src/lib/ai.ts`
- Added `SQLGenerationResult` exported type with `type: 'query' | 'schema_question'`
- Updated inline system prompt with classification instructions
- Backward compatible: defaults to 'query' if `type` field missing
- Robust parsedJson extraction with type checks

#### 3. `src/app/api/chat/route.ts`
- Added early-return handler for `sqlResult.type === 'schema_question'`
- Builds rich response from stored metadata: tables, columns, row counts, summary, relationships, glossary
- No SQL validation or execution for schema questions
- Still saves messages to database

#### 4. Bug fix
- Fixed missing `<SidebarMenu>` opening tag in `datasource-list.tsx`

### Lint Result
0 errors, 1 pre-existing warning (TanStack Table)
