# Tasks: Non-Rectangular Plot Shape Support

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~350-450 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Full change: migration + backend + frontend + maps | PR 1 | `cd front/vineyards && npx tsc -b` | `npm run dev` (both services) | Revert all file changes + DROP COLUMNs |

## Phase 1: Database Migration

- [x] 1.1 Create `back/migrations/004_plot_shapes.sql` with ALTER TABLE for `plots` (add `forma_parcela` ENUM, `terreno` ENUM with defaults), `vine_rows` (add `longitud_m` DECIMAL, `num_plantas_esperadas` INT NULL), `plants` (add `posicion_en_fila` INT NULL)
- [x] 1.2 Add backfill SQL in same migration: set `posicion_en_fila` per vine_row using row-number variable ordered by `id` within each `vine_row_id` group
- [x] 1.3 Add rollback DROP statements as comments at bottom of migration file

## Phase 2: Backend Controllers

- [x] 2.1 Update `back/src/controllers/plots.controller.js`: accept `forma_parcela`, `terreno` in `createPlot` INSERT; include both in SELECT queries for `getPlot`, `getVineyards`; add to `updatePlot` SET clause
- [x] 2.2 Update `back/src/controllers/vineRows.controller.js`: accept `longitud_m`, `num_plantas_esperadas` in `createVineRow` INSERT and `updateVineRow` SET; include in SELECT for `getVineRows` and `getVineRow`
- [x] 2.3 Update `back/src/controllers/plants.controller.js`: accept `posicion_en_fila` in `createPlant` INSERT and `updatePlant` SET; add `ORDER BY vr.numero, p.posicion_en_fila, p.id` to `getPlants` query; handle `posicion_en_fila` in `createPlantsBatch` (auto-assign sequential if NULL)

## Phase 3: Frontend Forms

- [x] 3.1 Update `front/vineyards/src/pages/Plots.tsx`: add `forma_parcela` select (rectangular/trapezoidal/abanicado/terrazas/irregular) and `terreno` select (plano/ladera/pendiente/con_cauce) to create/edit forms; pass both fields to API calls; show shape icon badge on plot cards
- [x] 3.2 Update `front/vineyards/src/pages/VineRows.tsx`: add optional `longitud_m` (number input) and `num_plantas_esperadas` (number input) fields to create form; pass to API; include in edit form if present

## Phase 4: Grid Rendering (All 4 Maps)

- [x] 4.1 Extract shared helper `getPlantsForRow(plants, rowId)` and `getAlignment(formaParcela, rowNumero)` utility to `front/vineyards/src/lib/plot-grid-utils.ts`
- [x] 4.2 Update `front/vineyards/src/pages/PlotMap.tsx`: fetch plot shape via `getPlot(id)`; replace `maxPlantsInRow` Array.from with per-row `getPlantsForRow`; apply alignment via `justifyContent` + `marginLeft` for terrazas stagger
- [x] 4.3 Update `front/vineyards/src/pages/IrrigationEventMap.tsx`: apply same per-row rendering pattern; verify clickable cells match actual plant count per row
- [x] 4.4 Update `front/vineyards/src/pages/PlantHealthMap.tsx`: apply same per-row rendering pattern (if file exists; skip if removed)
- [x] 4.5 Update `front/vineyards/src/pages/PlotMap3D.tsx`: apply same per-row rendering pattern (if file exists; skip if removed)

## Phase 5: Plant Creation Flow

- [x] 5.1 Update `front/vineyards/src/pages/Plants.tsx`: compute `nextPosition = existingPlantsInRow.length`; auto-assign `posicion_en_fila` on plant creation; show "Planta X de Y" indicator when `num_plantas_esperadas` is set; allow manual override of position field
- [x] 5.2 Verify tooltip in PlotMap shows "Fila N, Posición M, Varietal" using `row.numero` and `posicion_en_fila`

## Phase 6: Verification

- [x] 6.1 Run `cd front/vineyards && npx tsc -b` — zero new TypeScript errors
- [x] 6.2 Run `cd front/vineyards && npm run lint` — zero new lint errors
- [ ] 6.3 Manual API test: create plot with `forma_parcela: trapezoidal`, `terreno: ladera` → verify response includes both fields
- [ ] 6.4 Manual API test: create row with `longitud_m: 45.5`, `num_plantas_esperadas: 30` → verify persistence
- [ ] 6.5 Manual UI test: create trapezoidal plot with varying row lengths → verify center-aligned rows in PlotMap
- [ ] 6.6 Manual UI test: create row with `num_plantas_esperadas=5`, create plants → verify "Planta X de 5" progress indicator
