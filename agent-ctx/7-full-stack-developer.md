# Task 7: Create MapLibrary API routes

## Work Summary
Created 4 API routes for the MapLibrary feature:

### Files Created
1. `src/app/api/maps/route.ts` — GET list of available maps
2. `src/app/api/maps/upload/route.ts` — POST upload custom SVG map
3. `src/app/api/maps/[id]/route.ts` — GET single map + DELETE
4. `src/app/api/maps/detect-country/route.ts` — POST detect country from data

### Key Design Decisions
- System maps use virtual IDs (`system-XX`) based on MAP_REGISTRY country codes
- User custom maps are stored in DB with real cuid IDs
- SVG validation: max 2MB, must contain `<path data-name="...">` elements
- Regions can be explicitly provided or auto-extracted from SVG
- DELETE only allowed for custom maps owned by the current user
- All routes follow project patterns: requireAuth(), consistent error handling, NextRequest/NextResponse
- Country detection reuses existing `detectCountryFromData()` from map-registry.ts

### Lint Status
- 0 errors, 1 pre-existing TanStack Table warning
