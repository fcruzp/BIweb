
---
Task ID: 2-6
Agent: main
Task: Implement DR heat map for geographic queries

Work Log:
- Created `/src/components/app/visualization/dr-map.tsx` - SVG map of Dominican Republic with all 32 provinces (31 + Distrito Nacional)
- Added province name normalization with accent handling, abbreviations, old names (e.g., Salcedo → Hermanas Mirabal)
- Implemented heat map coloring with emerald gradient (darker = higher value)
- Added hover tooltips showing province name + value
- Added color scale legend bar
- Added `detectGeographicColumn()` function for auto-detection of province columns
- Updated `VisualizationConfig` in chat-store to add 'heatmap' chartType + `provinceColumn` and `valueColumn` fields
- Updated `suggestVisualization()` in ai.ts with geographic detection logic before AI call
- Detects geo keywords in query (provincia, mapa, region, heatmap, etc.)
- Detects DR province names in data values (column name match + value match)
- Returns heatmap with provinceColumn/valueColumn when geographic data detected
- Updated `chart-renderer.tsx` to handle 'heatmap' chartType via DRHeatMap component
- Updated `message-item.tsx` to show BOTH bar chart AND heat map stacked vertically for heatmap responses
- Added "Mapa geográfico" badge in metadata strip for heatmap queries

Stage Summary:
- Full geographic query flow: question → AI SQL → data → geo detection → heatmap + chart rendering
- Files created: `/src/components/app/visualization/dr-map.tsx`
- Files modified: `chat-store.ts`, `ai.ts`, `chart-renderer.tsx`, `message-item.tsx`
- 32 DR provinces with SVG paths, flexible name matching, emerald heat gradient

---
Task ID: 3
Agent: main
Task: Implement language-matching for AI responses — always respond in the same language as the user's question

Work Log:
- Added `detectLanguage()` function in `src/lib/ai.ts` — heuristic language detection supporting Spanish, English, Portuguese, and French based on common word patterns, accents, and special characters
- Added `getLanguageInstruction()` function in `src/lib/ai.ts` — generates a LANGUAGE RULE prompt section telling the AI to respond in the detected language
- Added `getLanguageInstruction(naturalQuery)` to ALL AI system prompts:
  - `generateSQLFromNaturalLanguage` — explanation field now matches user's language
  - `regenerateSQLWithFeedback` — retry explanation matches user's language
  - `suggestVisualization` — title and description match user's language
- Made heatmap title/description language-aware in `suggestVisualization()` using `detectLanguage()`
- Added i18n message dictionary with Spanish, English, Portuguese, French translations in `src/app/api/chat/route.ts`
- Added `t()` helper function for localized string lookup
- Localized ALL hardcoded English strings in route.ts:
  - Schema question response (headers: "Esquema de la Base de Datos", "Glosario de Negocio", "Relaciones")
  - Error messages ("No se pudo generar la consulta", "Consulta bloqueada", "Error de ejecución de consulta")
  - Success message ("Consulta ejecutada exitosamente", auto-correction notes)
  - Row count labels ("filas", "rows", "linhas", "lignes")
- Added LANGUAGE RULE instruction to the analysis prompt in route.ts — AI now writes the full executive analysis in the user's language
- Updated `report-markdown.tsx` to use language-agnostic regex patterns for the success message preprocessing (handles all language variants)

Stage Summary:
- When user asks in Spanish → entire response (analysis, explanations, chart titles, error messages) is in Spanish
- When user asks in English → English responses as before
- Also supports Portuguese and French for future internationalization
- Files modified: `src/lib/ai.ts`, `src/app/api/chat/route.ts`, `src/components/app/chat/report-markdown.tsx`
- No new files created
