# Plant Health Map Visibility - Technical Design

## Architecture

This is a **frontend-only** visual enhancement. No backend, API, or database changes.

### Component: PlantHealthMap.tsx

**File**: `front/vineyards/src/pages/PlantHealthMap.tsx`

**Changes**:
1. Update `healthIndicator` className logic (line ~309-313):
   - Disease: `border-2 border-red-500` (replaces `border-red-500 ring-1 ring-red-500/40`)
   - Treatment: `border-2 border-blue-500` (replaces `border-cyan-400 ring-1 ring-cyan-400/40`)

2. Update legend swatches (line ~279-284):
   - Disease swatch: `border-2 border-red-500`
   - Treatment swatch: `border-2 border-blue-500`

3. Base cell border remains `border` (1px) — only health states get the thicker border.

### Visual Design Rationale

- **`border-2` over `ring`**: Rings render outside the element box and can be clipped or blend with adjacent cells. A thicker border stays within the cell boundary and is more predictable.
- **Blue over cyan for treatment**: Cyan (`cyan-400`) has low contrast against light varietal fills (lime/white grapes). Blue (`blue-500`) provides stronger contrast across all varietal colors.
- **No ring overlay**: Removing `ring-1` simplifies the visual — one thick border is cleaner than border + ring combo.

### No Breaking Changes

- Cell size remains `w-5 h-5` (20px)
- Click handlers, modal, catalog drawer unchanged
- Health data fetch logic unchanged
- Role-based access unchanged
