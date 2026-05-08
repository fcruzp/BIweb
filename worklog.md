
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
