# Plant Health Map Visibility

## Problem
The PlantHealthMap renders disease (red) and treatment (blue) indicators on plant cells using `border` + `ring-1` with low opacity. On 20px cells (`w-5 h-5`), these indicators are barely visible. Users cannot quickly identify affected plants at a glance.

## Intent
Make disease and treatment visual indicators prominent and immediately distinguishable on the plant grid without changing the underlying data or health-check logic.

## Approach
1. Replace thin `border` + `ring-1` with bolder `border-2` (2px solid) for both disease and treatment states
2. Increase ring intensity or remove ring in favor of thicker border for cleaner look
3. Disease: `border-2 border-red-500` (solid red, 2px)
4. Treatment: `border-2 border-blue-500` (solid blue, 2px) — switch from cyan to blue for better contrast with varietal colors
5. Update legend swatches to match new visual weight

## Scope
- **Frontend only**: `front/vineyards/src/pages/PlantHealthMap.tsx`
- No backend changes
- No DB schema changes
- Legend swatches updated to match

## Rollback
Revert className strings to original `border` + `ring-1` values. No data migration needed.
