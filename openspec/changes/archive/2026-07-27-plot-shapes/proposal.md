# Proposal: Non-Rectangular Plot Shape Support

## Intent

Real vineyard plots are rarely perfect rectangles. Currently all plots render as uniform rectangular grids where every row has `maxPlantsInRow` cells, regardless of actual terrain. This produces inaccurate maps for trapezoidal, fan-shaped, terraced, or irregular plots — the most common shapes in real vineyards. GPS coordinates (`latitud`/`longitud`) already exist on plants but are unused for rendering.

This change adds minimal shape metadata to plots and rows, then fixes grid rendering to use actual plant counts per row instead of the maximum.

## Scope

### In Scope
- Add `forma_parcela` and `terreno` ENUM columns to `plots` table
- Add `longitud_m` and `num_plantas_esperadas` to `vine_rows` table
- Add `posicion_en_fila` to `plants` table for explicit ordering
- Update plot create/edit forms with shape and terrain selectors
- Update vine row creation with length and expected plant count fields
- Fix grid rendering in PlotMap, IrrigationEventMap, PlantHealthMap, and PlotMap3D to use per-row plant counts
- Center-align rows for trapezoidal/fan shapes to visualize narrowing effect
- Backend controller updates for new fields (create, read, update)
- Database migration script with sensible defaults for existing data

### Out of Scope
- True polygonal/GPS-based rendering (Phase 2)
- Shape-based area calculation or yield estimation
- 3D terrain visualization
- Changing the plant creation workflow (continuous flow remains)

## Capabilities

> This section is the CONTRACT between proposal and specs phases.

### New Capabilities
- `plot-shape-model`: Shape and terrain classification for plots; row-level length and expected plant count; explicit plant position within rows
- `shape-aware-grid-rendering`: Grid maps render each row with its actual plant count, with alignment strategy based on plot shape type

### Modified Capabilities
- `plant-data-model`: `plants` table gains `posicion_en_fila` column; plant ordering uses explicit position instead of implicit array order
- `irrigation-event-workflow`: Interactive map must render rows with actual plant counts, not uniform max

## Approach

1. **Schema migration** (single ALTER script): Add columns with NULL defaults so existing data is unaffected. Existing rows get `num_plantas_esperadas = plant_count` (computed from existing plants), `longitud_m = NULL`, `posicion_en_fila` populated from current implicit order. Plots default to `forma_parcela = 'rectangular'`, `terreno = 'plano'`.

2. **Backend**: Extend `plots.controller.js` (create/update accept new fields), `vineRows.controller.js` (accept `longitud_m`, `num_plantas_esperadas`), `plants.controller.js` (accept `posicion_en_fila`, batch create uses it). No new endpoints — extend existing ones.

3. **Frontend**: Add shape/terrain selectors to plot forms. Add row length/expected count to row creation. Replace `Array.from({ length: maxPlantsInRow })` with `Array.from({ length: row.plant_count })` in all 4 map components. Apply center-alignment CSS for non-rectangular shapes.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `back/src/controllers/plots.controller.js` | Modified | Accept `forma_parcela`, `terreno` in create/update |
| `back/src/controllers/vineRows.controller.js` | Modified | Accept `longitud_m`, `num_plantas_esperadas` |
| `back/src/controllers/plants.controller.js` | Modified | Accept `posicion_en_fila` in create/batch |
| `front/vineyards/src/pages/Plots.tsx` | Modified | Shape/terrain selectors in create/edit forms |
| `front/vineyards/src/pages/VineRows.tsx` | Modified | Row length and expected count fields |
| `front/vineyards/src/pages/PlotMap.tsx` | Modified | Per-row rendering, shape-based alignment |
| `front/vineyards/src/pages/PlotMap3D.tsx` | Modified | Per-row rendering, shape-based alignment |
| `front/vineyards/src/pages/IrrigationEventMap.tsx` | Modified | Per-row rendering, shape-based alignment |
| `front/vineyards/src/pages/PlantHealthMap.tsx` | Modified | Per-row rendering, shape-based alignment |
| `esquemaDb.sql` | Modified | New columns on plots, vine_rows, plants |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| All 4 map components must be updated together | High | Single task group for all map changes; verify all 4 render correctly |
| Existing data needs sensible defaults | Medium | Migration populates `posicion_en_fila` from current order; defaults to rectangular/plano |
| Frontend build has pre-existing TS errors | High | Scope changes to avoid touching files with existing errors where possible |
| Row alignment CSS may break on edge cases | Medium | Test with 0-plant rows, 1-plant rows, and large row count differences |

## Rollback Plan

1. Revert schema: `ALTER TABLE plots DROP COLUMN forma_parcela, DROP COLUMN terreno`, same for vine_rows and plants
2. Revert controller changes from git (no endpoints added, only extended)
3. Revert frontend form and map changes from git
4. Existing plants remain intact — new columns are NULL-able, dropping them loses only the new metadata

## Dependencies

- MySQL ALTER TABLE with DEFAULT values for safe migration
- Existing `plant_count` computed field in vine row queries (already present)

## Success Criteria

- [ ] Plots can be created/edited with shape type and terrain selection
- [ ] Vine rows can specify length and expected plant count
- [ ] All 4 map components render rows with actual plant counts (not maxPlantsInRow)
- [ ] Trapezoidal/fan shapes show center-aligned rows
- [ ] Existing plots render identically (default rectangular, no visual change)
- [ ] Migration script runs without data loss on existing database
