# DataMind BI — Project State Snapshot
> Generated: 2025-06-27 | Version: v1.1-stable  
> Purpose: Context offset for AI agent session continuity

---

## Project Overview

**DataMind BI** is an AI-powered business intelligence platform built with **Next.js 16 (App Router) + SQLite + TypeScript**. Users upload SQLite databases, ask questions in natural language (Spanish/English/Portuguese/French), and get SQL queries auto-generated, executed, and visualized with charts, tables, and geographic heat maps.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend (React 19 + Zustand + shadcn/ui)          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │  Chat     │ │Dashboard │ │ History  │ │Schema  │ │
│  │Interface  │ │  View    │ │  View    │ │Explorer│ │
│  └────┬─────┘ └──────────┘ └──────────┘ └────────┘ │
│       │                                             │
│  ┌────▼─────────────────────────────────────────┐   │
│  │  Visualization Layer                          │   │
│  │  Recharts · DataTable · DRHeatMap             │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │ API calls
┌──────────────────────▼──────────────────────────────┐
│  Backend (Next.js API Routes + Prisma + SQLite)      │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │
│  │/api/chat │ │/api/data │ │ /api/dashboards etc. │ │
│  │NL→SQL    │ │sources   │ │                      │ │
│  └────┬─────┘ └──────────┘ └──────────────────────┘ │
│       │                                              │
│  ┌────▼──────────────────────────────────────────┐   │
│  │  AI Service Layer                              │   │
│  │  Z-AI (built-in) · OpenRouter (15 models)     │   │
│  │  Language Detection (ES/EN/PT/FR)             │   │
│  └───────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.3 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Database | Prisma ORM + SQLite |
| AI (built-in) | z-ai-web-dev-sdk (no key needed) |
| AI (optional) | OpenRouter (OpenAI-compatible API) |
| State | Zustand (client) + Prisma (server) |
| Charts | Recharts 2.15 |
| Tables | @tanstack/react-table |
| Maps | Custom SVG (DR provinces) |
| Icons | Lucide React |
| Markdown | react-markdown + remark-gfm |

---

## File Structure (src/)

```
src/
├── app/
│   ├── api/
│   │   ├── route.ts                          (Health check)
│   │   ├── chat/route.ts                     (★ Main NL→SQL pipeline)
│   │   ├── chat/sessions/route.ts            (GET list, POST create)
│   │   ├── chat/sessions/[id]/route.ts       (PATCH rename, DELETE)
│   │   ├── chat/sessions/[id]/messages/route.ts (GET messages)
│   │   ├── dashboards/route.ts               (GET list, POST create)
│   │   ├── dashboards/[id]/route.ts          (GET, PUT, DELETE)
│   │   ├── dashboards/widgets/route.ts       (★ POST create, GET list)
│   │   ├── dashboards/widgets/[id]/route.ts  (★ PUT update, DELETE)
│   │   ├── datasources/route.ts              (GET list, POST upload)
│   │   ├── datasources/[id]/route.ts         (GET, DELETE)
│   │   ├── datasources/[id]/analyze/route.ts (POST re-analyze)
│   │   ├── history/route.ts                  (GET query history)
│   │   ├── query/execute/route.ts            (POST direct SQL)
│   │   ├── schema/table-data/route.ts        (GET paginated data)
│   │   └── visualization/suggest/route.ts    (POST viz suggestion)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                              (★ Single page app entry)
├── components/
│   ├── app/
│   │   ├── app-layout.tsx                    (Root layout)
│   │   ├── chat/
│   │   │   ├── chat-interface.tsx            (Chat orchestrator)
│   │   │   ├── chat-report.tsx               (★ Printable report generator)
│   │   │   ├── message-input.tsx             (Text input + send)
│   │   │   ├── message-item.tsx              (Message bubble + viz + copy)
│   │   │   ├── message-list.tsx              (Scrollable list)
│   │   │   ├── pin-to-dashboard-button.tsx   (★ Pin viz to dashboard)
│   │   │   ├── report-markdown.tsx           (Markdown renderer)
│   │   │   └── welcome-screen.tsx            (Empty state)
│   │   ├── dashboard/
│   │   │   ├── add-widget-dialog.tsx        (★ Widget creation dialog)
│   │   │   ├── dashboard-view.tsx            (Dashboard + widgets)
│   │   │   └── widget-renderer.tsx           (★ Widget type renderer)
│   │   ├── history/
│   │   │   └── query-history.tsx             (Query history list)
│   │   ├── settings/
│   │   │   └── ai-settings-dialog.tsx        (AI config + language selector)
│   │   ├── locale-switcher.tsx               (★ Language dropdown EN/ES)
│   │   ├── sidebar/
│   │   │   ├── app-sidebar.tsx               (Main sidebar)
│   │   │   ├── chat-session-list.tsx         (Session list per DS)
│   │   │   ├── datasource-info-dialog.tsx    (DS details dialog)
│   │   │   ├── datasource-list.tsx           (Uploaded DS list)
│   │   │   ├── datasource-upload.tsx         (SQLite file upload)
│   │   │   └── schema-explorer.tsx           (Table/column browser)
│   │   └── visualization/
│   │       ├── chart-renderer.tsx            (Recharts renderer)
│   │       ├── data-table.tsx                (TanStack Table grid)
│   │       └── dr-map.tsx                    (DR geographic heatmap)
│   └── ui/                                   (50 shadcn/ui components)
├── hooks/
│   ├── use-mobile.ts
│   ├── use-toast.ts
│   ├── use-i18n.ts                           (i18n translation hook)
│   └── use-widget-data.ts                    (Widget data fetch with cache)
├── lib/
│   ├── ai.ts                                 (★ AI service + language detection)
│   ├── db.ts                                 (Prisma client singleton)
│   ├── dr-map-constants.ts                   (DR map SVG path data)
│   ├── dr-map-data.json                      (DR province data)
│   ├── i18n.ts                               (★ Translation dictionaries EN/ES)
│   ├── prompts.ts                            (Prompt templates)
│   ├── sql-security.ts                       (SQL validation/sanitization)
│   ├── sqlite.ts                             (Schema extraction, query exec)
│   └── utils.ts                              (cn utility)
└── stores/
    ├── ai-config-store.ts                    (AI provider/model config)
    ├── app-store.ts                          (App state + navigation)
    ├── chat-store.ts                         (★ Chat messages + parsing)
    ├── dashboard-store.ts                    (Dashboard state)
    └── locale-store.ts                       (★ UI language preference)
```

---

## Key Features (Current State)

### 1. NL→SQL Chat Pipeline (`/api/chat`)
- User asks question → AI classifies as "query" or "schema_question"
- If query: generates SQLite SELECT → validates security → executes
- Auto-retry: if SQL fails (hallucinated column/table/syntax), feeds error back to AI (max 2 retries)
- If schema_question: builds rich markdown response from stored metadata
- After success: suggests visualization → AI analyzes results in executive report format
- All responses match user's language (auto-detected)

### 2. Language Matching System
- `detectLanguage(text)` in `ai.ts`: heuristic scoring for ES/EN/PT/FR
- `getLanguageInstruction(userMsg)` appended to ALL AI prompts
- Backend `i18n` dictionary in `route.ts` with `t(lang, key)` helper
- Localized: schema headers, error messages, success messages, retry notes
- AI analysis prompt includes LANGUAGE RULE instruction
- Charts/heatmap titles localized

### 3. DR Geographic Heat Map
- Triggered by geographic keywords or DR province data detection
- Shows BOTH bar chart + SVG heat map stacked vertically
- 32 provinces with name normalization (accents, abbreviations, old names)
- Emerald gradient coloring, hover tooltips, color scale legend
- SVG path data loaded from local constants (avoids Turbopack issue with node_modules TS)

### 4. SQL Security
- AST-based validation via `node-sql-parser`
- Only SELECT statements allowed
- Blocks: DDL, DML, PRAGMA, sqlite_master queries
- Configurable row limits (default 500, 0 = unlimited)

### 5. AI Provider System
- **Z-AI** (default, no API key needed)
- **OpenRouter** (15 models: Claude, Gemini, Grok, Llama, Mistral, DeepSeek)
- Configurable via Settings dialog (provider, model, temperature, tokens, row limit)

### 6. Data Source Management
- Upload SQLite .db files → auto-extract schema → AI semantic analysis
- Schema explorer view with table/column browsing
- Paginated table data preview
- Re-analyze option

### 7. Dashboard Widget System
- Full widget lifecycle: Create → Render → Delete
- Widget types: chart (ChartRenderer), table (DataTable), metric (big numbers), text (Markdown)
- Add Widget dialog: title, type, data source, SQL query, run preview, auto-suggest viz
- Widget data fetching with 5-min cache via `useWidgetData` hook
- Pin-to-dashboard from chat: one-click pin any visualization to any dashboard
- Widget API: POST/GET/PUT/DELETE at /api/dashboards/widgets

### 8. Chat Report Generation
- "Report" button in chat header (appears when messages exist)
- Full-screen report view rendering all messages as print-ready HTML
- Includes: header with branding, questions, AI analysis, SQL, charts, data tables
- Print/Save PDF via browser print dialog (window.print())
- Professional print CSS: page breaks, clean typography, hidden interactive elements

### 9. Copy to Clipboard
- User messages: copy button appears on hover (copies plain text)
- Assistant messages: copy button appears on hover in top-right of report card (copies as Markdown)
- SQL code blocks: existing copy button preserved
- Visual feedback: icon changes to checkmark for 2 seconds

### 10. UI Internationalization (i18n)
- Full EN/ES support with `useI18n()` hook and `t('key')` function
- `src/stores/locale-store.ts` — Zustand store, persisted to localStorage
- `src/lib/i18n.ts` — ~130 translation keys in both languages
- LocaleSwitcher component in sidebar footer AND settings dialog
- Default language: ES (Spanish)
- Parameterized translations: `{count}`, `{current}`, `{total}` for dynamic text

---

## Database Schema (Prisma/SQLite)

| Model | Key Fields |
|-------|-----------|
| **DataSource** | id, name, fileName, filePath, status (uploaded/analyzing/ready/error) |
| **SourceSchema** | dataSourceId, tableName, columns (JSON), rowCount, sampleData (JSON) |
| **SourceContext** | dataSourceId, semanticContext, businessGlossary (JSON), relationships (JSON), summary |
| **ChatSession** | id, dataSourceId, title |
| **ChatMessage** | sessionId, role, content, sqlQuery?, queryResult? (JSON), visualization? (JSON) |
| **QueryHistory** | dataSourceId, sessionId?, naturalQuery, sqlQuery, resultData (JSON), status, errorMessage? |
| **Dashboard** | name, description?, layout (JSON) |
| **DashboardWidget** | dashboardId, title, widgetType, sqlQuery?, visualization?, config, position/size |

**Critical note**: `ChatMessage.queryResult` is stored as `JSON.stringify({ data: [...], columns: [...], rowCount: N, executionTime: N })` — the FULL QueryResult object. Previously was storing only the bare array (caused charts/data to be empty on reload).

---

## Known Issues & Fixes Applied

### Bug: `toLocaleString()` crash on chat switch
- **Cause**: `message.queryResult` was truthy but `rowCount` was undefined (schema_question messages)
- **Fix**: Added `typeof message.queryResult.rowCount === 'number'` guard + optional chaining

### Bug: `data is not iterable` in DRHeatMap
- **Cause**: `queryResult.data` was undefined when loading from DB (old format stored bare array)
- **Fix**: `Array.isArray(data)` guard in DRHeatMap, ChartRenderer, DataTable

### Bug: Empty charts/tables on chat reload
- **Cause**: `queryResult` was stored as `JSON.stringify(slicedData)` (bare array) instead of full QueryResult
- **Fix**: Changed to `JSON.stringify({ data, columns, rowCount, executionTime })` in route.ts
- **Backward compat**: `loadMessages` in chat-store handles both old (bare array) and new (full object) formats

### Bug: Turbopack "Missing module type" for @react-map/dominican-republic
- **Fix**: Extracted SVG path data to local `src/lib/dr-map-constants.ts`

---

## Zustand Stores Detail

### `useAppStore` (persisted: `datamind-app-state`)
- activeDataSourceId, activeSessionId, activeDashboardId
- currentView: 'chat' | 'dashboard' | 'history' | 'schema'
- sidebarOpen, sidebarCollapsed
- dataSources[], chatSessions[]
- CRUD actions for all state

### `useChatStore` (NOT persisted)
- messages[], isLoading, error
- currentVisualization, currentQueryResult, currentSQL
- loadMessages(sessionId) — fetches + parses from API with defensive JSON handling

### `useAIConfigStore` (persisted: `datamind-ai-config`)
- provider: 'z-ai' | 'openrouter'
- openrouterApiKey, modelId, customModelId
- temperature (default 0.3), maxTokens (4096), queryRowLimit (500)
- 15 pre-configured model options

### `useDashboardStore` (NOT persisted)
- dashboards[], activeDashboard, editMode
- Widget CRUD

---

## AI Prompt Architecture

All prompts in `src/lib/ai.ts`:

1. **`generateSQLFromNaturalLanguage`** — Classifies as query/schema_question, generates safe SELECT SQL. Has LANGUAGE RULE.
2. **`regenerateSQLWithFeedback`** — Fixes failed SQL with error feedback. Has LANGUAGE RULE.
3. **`suggestVisualization`** — Auto-detects geographic data (DR provinces) → returns heatmap with provinceColumn/valueColumn. Otherwise asks AI for chart type. Has LANGUAGE RULE.
4. **`analyzeSchemaWithContext`** — Generates semantic metadata from schema+sample data.
5. **Analysis prompt** (in route.ts) — Writes executive BI report. Has LANGUAGE RULE.

---

## Features NOT Yet Implemented (Backlog)

1. **Dashboard widget editing** — Update widget SQL/title/type after creation
2. **Dashboard layout management** — Drag-and-drop widget positioning, resize
3. **Chat rename** — Patch endpoint exists but UI button missing
4. **Chat export/share** — Not implemented
5. **Query bookmarks/pins** — Not implemented
6. **Additional locales** — Portuguese and French UI translations (AI responses already support them)

---

## Development Notes

- Dev server: `bun run dev` on port 3000
- Lint: `bun run lint` (ESLint)
- DB push: `bun run db:push` (after schema changes)
- Only `/` route is exposed to user (single-page app)
- API calls use relative paths; for cross-port: `?XTransformPort=XXXX`
- Z-AI SDK must only be used server-side (backend)
- `next-intl` package is installed but NOT yet configured for UI i18n
