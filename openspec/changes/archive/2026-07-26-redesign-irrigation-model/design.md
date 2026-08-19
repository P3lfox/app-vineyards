# Design: Redesign Irrigation Model

## Technical Approach

Convert `irrigation_systems` from a user-managed CRUD catalog into a fixed seed of 5 types. Move `irrigation_system_id` from events to plots (system inherited per plot). Move `presion_media_bar` and `caudal_l_h` from systems to events (measured per-event, not per-type). Link orphaned `irrigation_coverage` and `irrigation_event_impact` records to specific events via new FKs. Replace the flat create/edit/delete event workflow with a 3-phase interactive workflow: create → start (map) → finish (bulk save).

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `irrigation_system_id` on plots vs events | On plots = set once per parcel, inherited by all events; on events = manual pick every time | **On plots** — matches reality: a parcel has one physical system installed |
| `presion_media_bar` / `caudal_l_h` on systems vs events | On systems = static spec; on events = actual measured values | **On events** — pressure/flow vary per watering session |
| Remove CRUD endpoints vs keep read-only | Remove = less code; keep = admin can add custom types | **Remove** — 5 types are fixed domain constants, not user data |
| `irrigation_event_id` on coverage/impact vs orphaned | Linked = queryable history; orphaned = no event context | **Add FK** — every coverage/impact record must belong to an event |
| Single bulk-save transaction vs individual POSTs | Transaction = atomic, all-or-nothing; individual = partial saves possible | **Single transaction** — event data is meaningless if partially saved |
| Reuse PlotMap vs new component | Reuse = less code, consistent UX; new = tailored for irrigation | **New `IrrigationEventMap`** — needs watered-state toggles, row coverage labels, impact forms — too different from PlotMap's read-only click-to-detail |
| Keep `deleted_at` on irrigation_systems | Keep = soft-delete support; remove = seed table is immutable | **Remove soft-delete** — seed types are domain constants, never deleted |

## Data Flow

### Event Creation → Completion Sequence

```
User                          Frontend                        Backend
  │                              │                               │
  │  1. Fill create form          │                               │
  │─────────────────────────────>│                               │
  │                              │  2. POST /irrigation-events   │
  │                              │──────────────────────────────>│
  │                              │     (plot_id, fecha,          │
  │                              │      presion, caudal)          │
  │                              │                               │ 2a. INSERT event
  │                              │                               │     (system_id from plot)
  │                              │  3. { id }                    │
  │                              │<──────────────────────────────│
  │  4. "Iniciar evento"         │                               │
  │─────────────────────────────>│                               │
  │                              │  5. PUT /irrigation-events/   │
  │                              │     startEvent/:id            │
  │                              │──────────────────────────────>│ 5a. UPDATE status=in_progress
  │                              │                               │
  │                              │  6. GET /vine-rows + /plants  │
  │                              │     (for plot)                │
  │                              │──────────────────────────────>│
  │                              │  7. rows[] + plants[]         │
  │                              │<──────────────────────────────│
  │                              │                               │
  │  8. Toggle cells on map      │                               │
  │     (client-side state)      │                               │
  │                              │                               │
  │  9. "Finalizar evento"       │                               │
  │─────────────────────────────>│                               │
  │                              │  10. PUT /irrigation-events/  │
  │                              │      finishEvent/:id          │
  │                              │      { coverage[], impact[] } │
  │                              │──────────────────────────────>│ 10a. BEGIN
  │                              │                               │ 10b. INSERT coverage (batch)
  │                              │                               │ 10c. INSERT impact (batch)
  │                              │                               │ 10d. UPDATE status=completed
  │                              │                               │ 10e. COMMIT / ROLLBACK
  │                              │  11. { success }              │
  │                              │<──────────────────────────────│
  │  12. Navigate to event list  │                               │
  │<─────────────────────────────│                               │
```

### System Inheritance Chain

```
irrigation_systems (5 seed rows)
        ↑ FK
    plots.irrigation_system_id
        ↑ FK (implicit)
irrigation_events.plot_id  →  JOIN plots → JOIN irrigation_systems
        ↑ FK
irrigation_coverage.irrigation_event_id
irrigation_event_impact.irrigation_event_id
```

## File Changes

### Backend

| File | Action | Description |
|------|--------|-------------|
| `back/src/controllers/irrigationSystems.controller.js` | Replace | Remove CRUD. Single `getIrrigationSystems()` returns 5 seed rows ordered by id. |
| `back/src/controllers/irrigationEvents.controller.js` | Replace | Remove `irrigation_system_id` from create/update. Add `presion_media_bar`, `caudal_l_h`. Add `startEvent/:id`, `finishEvent/:id`, `getIrrigationEvent/:id`. Update `getAllIrrigationEvents` to JOIN plots → irrigation_systems. Add `estado` field (created/in_progress/completed). |
| `back/src/controllers/irrigationCoverage.controller.js` | Replace | Require `irrigation_event_id`. Add `createIrrigationCoverageBatch()` for bulk insert in transaction. Remove individual update/delete. |
| `back/src/controllers/irrigationEventImpact.controller.js` | Replace | Require `irrigation_event_id`. Add `createIrrigationEventImpactBatch()` for bulk insert. Remove individual update/delete. |
| `back/src/controllers/plots.controller.js` | Modify | Add `irrigation_system_id` to createPlot INSERT. Add to updatePlot dynamic fields. Add LEFT JOIN irrigation_systems in getPlot and getPlots for `sistema_tipo`. |
| `back/src/routes/irrigationSystems.routes.js` | Replace | Single GET route only. |
| `back/src/routes/irrigationEvents.routes.js` | Replace | Add startEvent, finishEvent, getIrrigationEvent routes. Remove restore route. |
| `back/src/routes/irrigationCoverage.routes.js` | Replace | Add batch create route. Remove update/delete. |
| `back/src/routes/irrigationEventImpact.routes.js` | Replace | Add batch create route. Remove update/delete. |
| `back/src/app.js` | Modify | No changes to mount points — route prefixes stay the same. |
| `back/migrate-irrigation.sql` | Create | Migration script: ALTER TABLE statements, data backfill, seed. |

### Frontend

| File | Action | Description |
|------|--------|-------------|
| `front/vineyards/src/pages/IrrigationSystems.tsx` | Replace | Read-only list of 5 seed types. No create/edit/delete. Simple card list with tipo + descripcion. |
| `front/vineyards/src/pages/IrrigationEvents.tsx` | Replace | Event list + inline create form (no system selector — inherited from plot). Cards show presion/caudal. "Iniciar" button navigates to map. "Ver detalle" shows event + coverage + impact. |
| `front/vineyards/src/pages/IrrigationEventMap.tsx` | Create | Interactive map component: fetches rows+plants for event's plot, renders cell grid (reuse varietalColors), toggles watered state, shows row coverage level (completa/parcial/ninguna), "Finalizar" button triggers bulk save. |
| `front/vineyards/src/pages/Plots.tsx` | Modify | Add irrigation system dropdown (5 types) to create/edit forms. Display `sistema_tipo` in plot cards. |
| `front/vineyards/src/app/router.tsx` | Modify | Add `/irrigation-events/:eventId/map` route. Keep `/irrigation-systems` (read-only). |
| `front/vineyards/src/components/layout/Layout.tsx` | Modify | No nav changes — both "Riego" (read-only reference) and "Eventos de Riego" remain. |
| `front/vineyards/src/services/api.ts` | No change | Existing baseURL `/api` pattern continues. |

## Interfaces / Contracts

### Event States
```
created      → event exists, no plants selected
in_progress  → map is open, user selecting plants
completed    → coverage + impact saved
```

### Event Create Body (POST /api/irrigation-events/create)
```json
{
  "plot_id": 3,
  "fecha": "2026-07-26",
  "duracion_min": 45,
  "mm_aplicados": 12.5,
  "presion_media_bar": 2.3,
  "caudal_l_h": 150.0,
  "observaciones": "Riego matutino"
}
```

### Finish Event Body (PUT /api/irrigation-events/finishEvent/:id)
```json
{
  "coverage": [
    { "vine_row_id": 10, "cobertura": "completa" },
    { "vine_row_id": 11, "cobertura": "parcial" }
  ],
  "impact": [
    { "plant_id": 101, "llegada_agua": true, "hubo_cortes": false, "observaciones": null },
    { "plant_id": 102, "llegada_agua": false, "hubo_cortes": true, "observaciones": "Tubo tapado" }
  ]
}
```

### Event Detail Response (GET /api/irrigation-events/getIrrigationEvent/:id)
```json
{
  "id": 5,
  "plot_id": 3,
  "plot_nombre": "Parcela Norte",
  "sistema_tipo": "goteo",
  "fecha": "2026-07-26",
  "duracion_min": 45,
  "mm_aplicados": 12.5,
  "presion_media_bar": 2.3,
  "caudal_l_h": 150.0,
  "observaciones": "Riego matutino",
  "estado": "completed",
  "coverage": [
    { "id": 20, "vine_row_id": 10, "cobertura": "completa", "row_numero": 1 }
  ],
  "impact": [
    { "id": 30, "plant_id": 101, "llegada_agua": true, "hubo_cortes": false, "observaciones": null }
  ]
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual API | Create event without system_id → inherits from plot | curl/Postman against running backend |
| Manual API | Finish event with coverage + impact → verify DB rows | Check MySQL after bulk save |
| Manual API | Start event → verify estado changes to in_progress | GET event detail after start |
| Manual API | Bulk save rollback → send invalid data, verify no rows inserted | Send coverage with non-existent vine_row_id |
| Manual UI | Create event → start → toggle plants → finish → verify list | Full workflow in browser |
| Manual UI | Plot create/edit → irrigation system dropdown persists | Create plot with system, edit to change |
| Type check | `cd front/vineyards && npx tsc -b` | Frontend build must pass |
| Lint | `cd front/vineyards && npm run lint` | No new ESLint errors |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

### Migration Script (`back/migrate-irrigation.sql`)

1. **Seed 5 fixed types** — `INSERT IGNORE INTO irrigation_systems (id, tipo, descripcion) VALUES ...`
2. **Backfill plot systems** — For each plot, find its most recent event's `irrigation_system_id` and copy to `plots.irrigation_system_id`. Plots with no events get NULL.
3. **Backfill event system to plots** — Before dropping `irrigation_system_id` from events, copy each event's system_id to its plot if the plot is NULL.
4. **Add columns** — `ALTER TABLE plots ADD COLUMN irrigation_system_id INT NULL`, `ALTER TABLE irrigation_events ADD COLUMN presion_media_bar DECIMAL(5,2) NULL`, `ALTER TABLE irrigation_events ADD COLUMN caudal_l_h DECIMAL(8,2) NULL`, `ALTER TABLE irrigation_events ADD COLUMN estado ENUM('created','in_progress','completed') DEFAULT 'created'`.
5. **Link coverage/impact to events** — For existing coverage/impact records, find the nearest event by plot_id + date and assign `irrigation_event_id`. Records with no match get flagged.
6. **Add FKs** — `ALTER TABLE irrigation_coverage ADD COLUMN irrigation_event_id`, `ALTER TABLE irrigation_event_impact ADD COLUMN irrigation_event_id`, then add constraints.
7. **Drop old column** — `ALTER TABLE irrigation_events DROP COLUMN irrigation_system_id`.
8. **Remove soft-delete from systems** — `UPDATE irrigation_systems SET deleted_at = NULL`.

### Rollback
1. Restore pre-migration SQL backup of all 4 irrigation tables + plots.
2. Re-add `irrigation_system_id` to events, re-create CRUD endpoints from git history.
3. Revert frontend pages to previous versions.

## Open Questions

- [ ] Should `estado` be a MySQL ENUM or a VARCHAR? ENUM is stricter but harder to extend.
- [ ] For the migration backfill of orphaned coverage/impact records: if no matching event exists, should we create a synthetic "migrated" event or leave them NULL with a warning?
- [ ] Should the IrrigationEventMap support multi-row selection (select all plants in a row with one click) or only individual cell toggles?
