# Task 2 — Generic GeoMap Component + Map Registry

## Summary
Created a generic geographic heat map component that replaces the DR-only `DRHeatMap` with support for ANY country's map data.

## Files Created
- `src/lib/map-registry.ts` — Map registry with types (MapRegion, MapConfig), registry (MAP_REGISTRY), and helpers (getMapConfig, normalizeRegionName, detectCountryFromData, detectGeographicColumn)
- `src/components/app/visualization/geo-map.tsx` — Generic GeoMap component with mapConfig prop, i18n support, same visual output as DRHeatMap

## Files Modified
- `src/components/app/visualization/dr-map.tsx` — Replaced with backward-compatible wrapper around GeoMap, re-exports detectGeographicColumn
- `src/lib/i18n.ts` — Added `regionsWithData` i18n key (EN + ES)

## Backward Compatibility
- All existing imports (`DRHeatMap`, `detectGeographicColumn`) from `./dr-map` continue to work
- `normalizeProvinceName`, `DR_PROVINCES`, `DRProvince` kept as deprecated exports
- chart-renderer.tsx, message-item.tsx, chat-report.tsx, widget-renderer.tsx, add-widget-dialog.tsx — no changes needed

## Key Decisions
- DR config built from existing `dr-map-constants.ts` data (drawPath + stateCode)
- normalizeRegionName uses 5-step resolution matching original normalizeProvinceName logic
- detectCountryFromData checks ALL registered countries simultaneously
- Region match count uses `t('regionsWithData', {...})` i18n key with config-provided regionLabel
