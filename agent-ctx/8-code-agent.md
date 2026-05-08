# Task 8 - Data Source Info Dialog

## Task
Add an info icon next to each data source in the sidebar that opens a modal showing detailed schema information.

## What was done

### 1. Created `src/components/app/sidebar/datasource-info-dialog.tsx`
- New `'use client'` dialog component
- Props: `open`, `onOpenChange`, `dataSourceId`
- Fetches from `/api/datasources/[id]` when dialog opens
- Displays:
  - **Header**: Data source name, file name/size/type, status badge
  - **AI Summary**: From `contexts[0].summary`
  - **Business Context**: From `contexts[0].semanticContext`
  - **Tables section**: Accordion with expandable tables, column details (name, type, PK badge, NOT NULL badge)
  - **Relationships**: Parsed from `contexts[0].relationships` JSON string
  - **Business Glossary**: Parsed from `contexts[0].businessGlossary` JSON string
- Loading skeleton state while fetching
- Error state if fetch fails
- Dark theme with emerald accents, max-w-2xl, max-h-[80vh] scrollable content
- File size formatting helper (e.g., "1.2 MB")
- Parses JSON strings for columns, businessGlossary, relationships

### 2. Modified `src/components/app/sidebar/datasource-list.tsx`
- Added `useState` for `infoDataSourceId` and `infoDialogOpen`
- Added Info icon button (from lucide-react) next to each data source, before delete button
- Emerald hover color (`hover:bg-emerald-500/10`, `hover:text-emerald-500`)
- Appears on hover with opacity transition (same pattern as delete button)
- Clicking opens DataSourceInfoDialog with that data source's ID
- Wrapped return in Fragment (`<>...</>`) to include both SidebarMenu and DataSourceInfoDialog

## Lint result
0 errors, 1 pre-existing warning (TanStack Table)

## Files changed
- `src/components/app/sidebar/datasource-info-dialog.tsx` (new)
- `src/components/app/sidebar/datasource-list.tsx` (modified)
- `worklog.md` (updated)
