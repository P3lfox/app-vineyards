# Tasks: Enhance Plant Registration

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~250-320 (1 migration + 1 controller ~80 lines + 3 frontend files ~200 lines) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | DB migration + backend controller updates | PR 1 | Manual API POST/GET | `curl` or Postman against `/api/plants` | Revert migration (DROP columns, restore NOT NULL) |
| 2 | Frontend form + type updates (Plants.tsx + constants) | PR 2 | `cd front/vineyards && npx tsc -b` | Manual UI: create plant with/without varietal | Revert git — no data impact |
| 3 | PlotMap + PlantDetail UI updates | PR 3 | `cd front/vineyards && npx tsc -b` | Manual UI: toggle "sin tutor", view sin planta cells | Revert git — no data impact |

## Phase 1: Database Migration

- [x] 1.1 Create `back/migrations/002_enhance_plant_registration.sql` with ALTER TABLE: ADD `vigor` VARCHAR(50) NULL, `tutor` BOOLEAN NOT NULL DEFAULT FALSE, `fecha_plantacion` DATE NULL, `metodo_propagacion` VARCHAR(50) NULL, `observaciones` TEXT NULL; MODIFY `varietal_id` INT NULL.
- [ ] 1.2 Update `esquemaDb.sql` (reference only, gitignored) to reflect new `plants` table schema with all 5 new columns and nullable `varietal_id`.

## Phase 2: Backend Controller Updates

- [x] 2.1 In `back/src/controllers/plants.controller.js` `createPlant`: remove `varietal_id` from required check (line 7), accept `vigor`, `tutor`, `fecha_plantacion`, `metodo_propagacion`, `observaciones` from `req.body`. Skip varietal existence check when `varietal_id` is null/undefined.
- [x] 2.2 Update `createPlant` INSERT query to include new columns: `vigor`, `tutor`, `fecha_plantacion`, `metodo_propagacion`, `observaciones`. Return them in the 201 response.
- [x] 2.3 In `createPlantsBatch`: update values mapping to include `p.vigor`, `p.tutor`, `p.fecha_plantacion`, `p.metodo_propagacion`, `p.observaciones`. Update placeholders from 6 to 11 params per plant.
- [x] 2.4 In `updatePlant`: add dynamic field handling for `vigor`, `tutor`, `fecha_plantacion`, `metodo_propagacion`, `observaciones` (same pattern as existing fields).
- [x] 2.5 In `getPlants`: change `JOIN varietals v` to `LEFT JOIN varietals v`. Add `p.vigor`, `p.tutor`, `p.fecha_plantacion`, `p.metodo_propagacion`, `p.observaciones` to SELECT clause.
- [ ] 2.6 Manual API test: POST `/plants/createPlant` with `varietal_id: null` → expect 201. POST with all new fields → verify persisted values. GET `/plants/getPlants` → verify `varietal_nombre` is null for sin planta records.

## Phase 3: Frontend — Constants and Types

- [x] 3.1 Create `front/vineyards/src/constants/plantOptions.ts` exporting `vigorOptions = ["sin_crecimiento", "pequeña", "mediana", "grande"] as const` and `propagationMethodOptions = ["injerto", "estaca", "acodo", "micropropagacion"] as const`.
- [x] 3.2 Update `Plant` type in `Plants.tsx`: `varietal_id: number | null`, `varietal_nombre: string | null`, `varietal_tipo: string | null`, add `vigor: string | null`, `tutor: boolean`, `fecha_plantacion: string | null`, `metodo_propagacion: string | null`, `observaciones: string | null`.
- [x] 3.3 Update `Plant` type in `PlotMap.tsx`: add `varietal_id: number | null`, `varietal_tipo: string | null`, `tutor: boolean`.
- [x] 3.4 Update `Plant` type in `PlantDetail.tsx`: `varietal_id: number | null`, `varietal_nombre: string | null`, `varietal_tipo: string | null`, add `vigor`, `tutor`, `fecha_plantacion`, `metodo_propagacion`, `observaciones` fields.

## Phase 4: Frontend — Plants.tsx Form Updates

- [x] 4.1 Update creation form varietal `<select>`: remove `required` attribute, add `<option value="">Sin planta</option>` as first option.
- [x] 4.2 Add vigor `<select>` to creation form using `vigorOptions`, placed after varietal select.
- [x] 4.3 Add `fecha_plantacion` `<input type="date">` to creation form (optional, default today).
- [x] 4.4 Add `metodo_propagacion` `<select>` using `propagationMethodOptions` to creation form.
- [x] 4.5 Add `observaciones` `<textarea>` to creation form (already exists for status, keep separate for plant-level notes).
- [x] 4.6 Update `handleCreatePlant`: send `varietal_id: form.varietal_id ? parseInt(form.varietal_id) : null`, include `vigor`, `fecha_plantacion`, `metodo_propagacion` in POST body.
- [x] 4.7 Update edit form: add same new fields (vigor, tutor, fecha_plantacion, metodo_propagacion, observaciones) and update `handleEditSubmit` to send them.
- [x] 4.8 Update plant list cards: handle `varietal_nombre === null` → display "Sin planta" instead of empty text.

## Phase 5: Frontend — PlotMap.tsx Updates

- [x] 5.1 Add `showSinTutor` state: `const [showSinTutor, setShowSinTutor] = useState(false)`.
- [x] 5.2 Add "Mostrar sin tutor" toggle button in header area next to legend.
- [x] 5.3 Update cell rendering: when `plant && plant.varietal_id === null`, render slate gray cell with "Sin planta" styling (`bg-slate-700 border-slate-600`).
- [x] 5.4 When `showSinTutor` is true and `plant?.tutor === false`, add orange border class (`border-orange-400`) to the cell.
- [x] 5.5 Update cell popup modal: handle `!plant` (no cell) vs `plant && plant.varietal_id === null` (sin planta) vs planted cell. Show assign varietal option for sin planta cells.
- [x] 5.6 Update `getPlantForCell` logic: cells without any plant record still render as empty; cells with `varietal_id === null` render as "Sin planta" (distinct from truly empty cells).

## Phase 6: Frontend — PlantDetail.tsx Updates

- [x] 6.1 Update header: show "Sin planta" when `plant.varietal_id === null` instead of `plant.varietal_nombre`.
- [x] 6.2 Add conditional display in header: vigor badge (if non-null), tutor status icon/text ("Con tutor" / "Sin tutor"), fecha_plantacion (if non-null), metodo_propagacion (if non-null), observaciones block (if non-null).
- [x] 6.3 When `varietal_id === null`, show empty state message "Esta celda no tiene planta registrada" with varietal assignment action (reuse existing replace varietal UI).
- [x] 6.4 Ensure all tabs remain accessible for sin planta cells (status, diseases, treatments, etc.).

## Phase 7: Verification

- [x] 7.1 Run `cd front/vineyards && npx tsc -b` — zero NEW compilation errors (14 pre-existing in CreateVineyard.tsx).
- [x] 7.2 Run `cd front/vineyards && npm run lint` — no new ESLint errors.
- [ ] 7.3 Manual API: create plant with all new fields, verify 201 and persisted data.
- [ ] 7.4 Manual API: create plant with `varietal_id: null`, verify 201.
- [ ] 7.5 Manual UI: create plant without varietal via Plants.tsx form → verify "Sin planta" option works.
- [ ] 7.6 Manual UI: PlotMap shows "Sin planta" cells in slate gray, toggle "Mostrar sin tutor" highlights tutor=false with orange border.
- [ ] 7.7 Manual UI: PlantDetail for sin planta cell shows empty state message + assign varietal action.
