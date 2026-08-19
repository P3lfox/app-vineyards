# Proposal: Enhance Plant Registration

## Intent

Plant registration currently captures minimal data (varietal, conduccion, codigo, lat/long). Operators need to register plants with richer agronomic data at creation time — vigor, tutor status, planting date, propagation method, and observations — without requiring a separate propagation step. Additionally, cells in the plot map that have no plant should be explicitly marked as "sin planta" rather than implicitly empty.

## Scope

### In Scope
- Add `vigor`, `tutor`, `fecha_plantacion`, `metodo_propagacion`, `observaciones` columns to `plants` table
- Make `varietal_id` nullable to support explicit "sin planta" cells
- Update backend CRUD (create, read, update) to handle new fields and nullable varietal
- Update frontend creation form (`Plants.tsx`) with new fields inline
- Update `PlotMap.tsx` to show "sin planta" cells with explicit state and filter toggle
- Update `PlantDetail.tsx` to display new fields in plant header
- DB migration script for schema changes

### Out of Scope
- Modifying `plant_propagation` table structure (kept as historical log)
- Batch plant creation flow changes (separate change)
- 3D map (`PlotMap3D.tsx`) changes
- Irrigation, diseases, treatments, or other plant sub-entities

## Capabilities

> This section is the CONTRACT between proposal and specs phases.

### New Capabilities
- `plant-registration`: Enhanced plant creation with vigor, tutor, planting date, propagation method, observations, and nullable varietal support for "sin planta" cells

### Modified Capabilities
- None — no existing spec-level behavior changes; this extends the plant entity without altering current requirements

## Approach

1. **DB migration**: ALTER TABLE `plants` ADD columns (`vigor` VARCHAR, `tutor` BOOLEAN DEFAULT FALSE, `fecha_plantacion` DATE, `metodo_propagacion` VARCHAR, `observaciones` TEXT). ALTER `varietal_id` to allow NULL.
2. **Backend**: Update `createPlant`, `createPlantsBatch`, `updatePlant`, `getPlants` in `plants.controller.js`. Change `varietal_id` validation from required to optional. Use LEFT JOIN for varietals in `getPlants`.
3. **Frontend**: Add fields to creation form. Make varietal select optional with "Sin planta" option. Add filter toggle in PlotMap. Show new fields in PlantDetail header.
4. **Keep `plant_propagation` table** as detailed historical log. `metodo_propagacion` on `plants` is the current/latest value.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `back/src/controllers/plants.controller.js` | Modified | Accept new fields, nullable varietal, LEFT JOIN varietals |
| `back/src/routes/plants.js` | Modified | No route changes, but validation shifts |
| `front/vineyards/src/pages/Plants.tsx` | Modified | Add vigor, tutor, fecha_plantacion, metodo_propagacion, observaciones fields; optional varietal |
| `front/vineyards/src/pages/PlotMap.tsx` | Modified | Explicit "sin planta" cell rendering, filter toggle |
| `front/vineyards/src/pages/PlantDetail.tsx` | Modified | Display new fields in plant info header |
| DB schema (`plants` table) | Modified | 5 new columns, `varietal_id` becomes nullable |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing queries with `JOIN varietals` break on NULL | Medium | Audit all JOINs; use LEFT JOIN consistently |
| Frontend assumes `varietal_id` is always present | Medium | Update TypeScript types; add null guards |
| Data migration for existing plants | Low | New columns have sensible defaults (NULL/FALSE) |
| `esquemaDb.sql` is gitignored — schema drift | Medium | Document migration steps explicitly; update seed reference |

## Rollback Plan

1. Revert code changes via git
2. Run reverse migration: DROP new columns, restore `varietal_id` NOT NULL constraint
3. Any plants created with `varietal_id = NULL` must be assigned a varietal or deleted before rollback
4. No data loss expected — new columns are nullable with defaults

## Dependencies

- None — self-contained change within existing plant domain

## Success Criteria

- [ ] Plants can be created with vigor, tutor, fecha_plantacion, metodo_propagacion, and observaciones
- [ ] Plants can be created without a varietal (marked as "sin planta")
- [ ] PlotMap renders "sin planta" cells distinctly from planted cells
- [ ] PlotMap filter "mostrar sin tutor" works correctly
- [ ] PlantDetail displays all new fields in the header section
- [ ] All existing plant queries continue to work (no regression)
- [ ] TypeScript types updated — no compilation errors in frontend
