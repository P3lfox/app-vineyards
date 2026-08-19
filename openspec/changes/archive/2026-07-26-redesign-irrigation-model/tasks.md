# Tasks: Redesign Irrigation Model

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900-1200 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (DB + Backend) → PR 2 (Frontend foundation) → PR 3 (Interactive map + integration) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes (user accepted size:exception — all phases in one batch)
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | DB migration + all backend controllers/routes replaced | PR 1 | Manual API curl against running backend | `npm run dev` (backend only) | Revert migration SQL, restore controllers from git |
| 2 | Frontend: IrrigationSystems read-only, Plots system selector, router/nav updates | PR 2 | `cd front/vineyards && npx tsc -b` | `npm run dev` (frontend) | Revert page changes, keep backend intact |
| 3 | Frontend: IrrigationEvents rewrite + IrrigationEventMap interactive workflow | PR 3 | `cd front/vineyards && npx tsc -b` | Full UI workflow: create→start→toggle→finish | Remove new pages, keep PR 1+2 backend + Plots changes |

## Phase 1: Database Migration

- [x] 1.1 Create `back/migrations/001_redesign_irrigation_model.sql` with transactional ALTER TABLE statements: add `irrigation_system_id INT NULL` to plots, add `presion_media_bar DECIMAL(5,2) NULL` and `caudal_l_h DECIMAL(8,2) NULL` and `estado ENUM('created','in_progress','completed') DEFAULT 'created'` to irrigation_events
- [x] 1.2 Add migration step: seed 5 fixed types with `INSERT IGNORE INTO irrigation_systems (id, tipo, descripcion) VALUES (1,'goteo','Riego por goteo'), (2,'manta','Riego por manta'), (3,'aspersión','Riego por aspersión'), (4,'surco','Riego por surco'), (5,'microaspersión','Riego por microaspersión')`
- [x] 1.3 Add migration step: backfill `plots.irrigation_system_id` from most recent event's system_id per plot; copy event system_id to plot if plot is NULL
- [x] 1.4 Add migration step: add `irrigation_event_id INT NULL` to `irrigation_coverage` and `irrigation_event_impact`, backfill nearest event by plot_id+date, add FK constraints
- [x] 1.5 Add migration step: `ALTER TABLE irrigation_events DROP COLUMN irrigation_system_id`, remove soft-delete from systems (`UPDATE irrigation_systems SET deleted_at = NULL`)

## Phase 2: Backend Controllers

- [x] 2.1 Replace `back/src/controllers/irrigationSystems.controller.js` — remove all CRUD, keep only `getIrrigationSystems()` returning `SELECT id, tipo, descripcion FROM irrigation_systems ORDER BY id`
- [x] 2.2 Replace `back/src/routes/irrigationSystems.routes.js` — single `GET /getIrrigationSystems` route only, remove POST/PUT/DELETE/restore
- [x] 2.3 Replace `back/src/controllers/irrigationEvents.controller.js` — remove `irrigation_system_id` from create/update, add `presion_media_bar`, `caudal_l_h`, `estado` fields; add `startEvent(req,res)` (UPDATE estado='in_progress'), `finishEvent(req,res)` (UPDATE estado='completed'), `getIrrigationEvent(req,res)` (JOIN plots→irrigation_systems, include coverage+impact arrays)
- [x] 2.4 Update `getAllIrrigationEvents` in irrigationEvents.controller.js — change JOIN from `ie.irrigation_system_id = ist.id` to `LEFT JOIN plots p ON ie.plot_id = p.id LEFT JOIN irrigation_systems ist ON p.irrigation_system_id = ist.id`; add `presion_media_bar`, `caudal_l_h`, `estado` to SELECT
- [x] 2.5 Replace `back/src/routes/irrigationEvents.routes.js` — keep create, getIrrigationEvents/:plot_id, getAllIrrigationEvents; add `PUT /startEvent/:id`, `PUT /finishEvent/:id`, `GET /getIrrigationEvent/:id`; remove update, delete, restore
- [x] 2.6 Replace `back/src/controllers/irrigationCoverage.controller.js` — remove individual CRUD, add `createIrrigationCoverageBatch(req,res)` that accepts `{ irrigation_event_id, coverage: [{vine_row_id, cobertura}] }` and inserts all in one transaction
- [x] 2.7 Replace `back/src/routes/irrigationCoverage.routes.js` — single `POST /createBatch` route only, remove individual create/update/delete
- [x] 2.8 Replace `back/src/controllers/irrigationEventImpact.controller.js` — remove individual CRUD, add `createIrrigationEventImpactBatch(req,res)` that accepts `{ irrigation_event_id, impact: [{plant_id, llegada_agua, hubo_cortes, observaciones}] }` and inserts all in one transaction
- [x] 2.9 Replace `back/src/routes/irrigationEventImpact.routes.js` — single `POST /createBatch` route only, remove individual create/update/delete
- [x] 2.10 Update `back/src/controllers/plots.controller.js` — add `irrigation_system_id` to createPlot INSERT; add to updatePlot dynamic fields; add `LEFT JOIN irrigation_systems ist ON p.irrigation_system_id = ist.id` in getPlots and getPlot queries, include `irrigation_system_id` and `ist.tipo as sistema_tipo` in SELECT

## Phase 3: Frontend Pages

- [x] 3.1 Replace `front/vineyards/src/pages/IrrigationSystems.tsx` — read-only card list of 5 types from `GET /api/irrigation-systems/getIrrigationSystems`, no create/edit/delete buttons, no soft-delete toggle, simple tipo+descripcion display
- [x] 3.2 Update `front/vineyards/src/pages/Plots.tsx` — add `irrigation_system_id` to Plot type; fetch systems on mount; add system dropdown to create form and edit form (optional, clearable); display `sistema_tipo` in plot cards; include `irrigation_system_id` in create/edit payloads
- [x] 3.3 Rewrite `front/vineyards/src/pages/IrrigationEvents.tsx` — remove system selector from create form (inherited from plot), add `presion_media_bar` and `caudal_l_h` fields, add `estado` badge on cards, add "Iniciar" button (PUT startEvent/:id → navigate to map), add "Ver detalle" button (GET getIrrigationEvent/:id → show modal with coverage+impact), remove edit/delete/restore buttons
- [x] 3.4 Create `front/vineyards/src/pages/IrrigationEventMap.tsx` — route `/irrigation-events/:eventId/map`; fetch event + rows + plants for event's plot; render cell grid reusing `varietalColor` from PlotMap pattern; toggle watered state per plant (client-side Set); auto-calculate row coverage level (completa/parcial/ninguna); "Finalizar" button sends PUT finishEvent/:id with coverage[] + impact[] arrays; handle loading/empty/error states
- [x] 3.5 Update `front/vineyards/src/app/router.tsx` — add import for `IrrigationEventMap`; add route `{ path: "irrigation-events/:eventId/map", element: <IrrigationEventMap /> }`; keep existing irrigation routes
- [x] 3.6 Verify `front/vineyards/src/components/layout/Layout.tsx` — nav items stay unchanged per design ("Riego" read-only + "Eventos de Riego" remain); no modifications needed

## Phase 4: Verification

- [ ] 4.1 Run migration SQL against local MySQL — verify 5 seed rows exist, plots have irrigation_system_id column, events have presion/caudal/estado columns, coverage/impact have irrigation_event_id FK
- [ ] 4.2 Manual API: POST `/api/irrigation-events/create` with plot_id, fecha, presion_media_bar, caudal_l_h (no system_id) → verify event created with estado='created' and system inherited from plot
- [ ] 4.3 Manual API: PUT `/api/irrigation-events/startEvent/:id` → verify estado changes to 'in_progress'
- [ ] 4.4 Manual API: PUT `/api/irrigation-events/finishEvent/:id` with coverage[] + impact[] → verify rows inserted in both tables, evento estado='completed'
- [ ] 4.5 Manual API: GET `/api/irrigation-events/getIrrigationEvent/:id` → verify response includes event + coverage array + impact array with sistema_tipo
- [ ] 4.6 Manual API: POST `/api/irrigation-events/create` for plot with null irrigation_system_id → verify event created with null system
- [ ] 4.7 Manual API: Send invalid finishEvent (non-existent vine_row_id) → verify transaction rollback, no rows inserted
- [x] 4.8 TypeScript check: `cd front/vineyards && npx tsc -b` — zero new errors (verified — no new errors in modified files)
- [ ] 4.9 Lint check: `cd front/vineyards && npm run lint` — no new ESLint errors
- [ ] 4.10 Manual UI: Create plot with irrigation system → verify system persists in card
- [ ] 4.11 Manual UI: Full event workflow — create event → Iniciar → toggle plants on map → Finalizar → verify event list shows completed status with coverage/impact detail
- [ ] 4.12 Manual UI: Verify IrrigationSystems page shows read-only 5 types with no CRUD controls
