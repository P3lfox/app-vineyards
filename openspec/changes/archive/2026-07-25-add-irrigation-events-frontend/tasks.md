# Tasks: Add Irrigation Events Frontend

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~200-250 (1 new file ~180 lines, 4 small modifications) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Backend: getAllIrrigationEvents + restoreIrrigationEvent endpoints | PR 1 (single) | `curl localhost:3000/api/irrigation-events/getAllIrrigationEvents` | Manual API call with valid JWT | Remove 2 controller functions + 2 route lines — no schema change |
| 2 | Frontend: IrrigationEvents page + route + nav | PR 1 (single) | `cd front/vineyards && npx tsc -b && npm run build` | Navigate to `/irrigation-events` in browser | Delete IrrigationEvents.tsx, remove route line, remove nav item |

## Phase 1: Backend — New Endpoints

- [x] 1.1 Add `getAllIrrigationEvents` function to `back/src/controllers/irrigationEvents.controller.js` — query all non-deleted events JOINed with `plots` (for `plot_nombre`) and `irrigation_systems` (for `sistema_tipo`), ordered by `ie.fecha DESC`. Acceptance: `GET /api/irrigation-events/getAllIrrigationEvents` returns array with `plot_nombre` and `sistema_tipo` fields on each event.
- [x] 1.2 Add `restoreIrrigationEvent` function to `back/src/controllers/irrigationEvents.controller.js` — `UPDATE irrigation_events SET deleted_at = NULL WHERE id = ?` with validation (404 if not found, 400 if already active). Acceptance: `PUT /api/irrigation-events/restore/:id` restores a soft-deleted event and returns `{ message: "Evento de riego restaurado" }`.
- [x] 1.3 Register both routes in `back/src/routes/irrigationEvents.routes.js`: `router.get("/getAllIrrigationEvents", getAllIrrigationEvents)` and `router.put("/restore/:id", restoreIrrigationEvent)`, importing the new controller functions. Acceptance: both endpoints respond behind JWT middleware.

## Phase 2: Frontend — IrrigationEvents Page

- [x] 2.1 Create `front/vineyards/src/pages/IrrigationEvents.tsx` following the exact `IrrigationSystems.tsx` pattern: card grid layout, inline create/edit forms, soft-delete toggle, role-based actions. Acceptance: page compiles with `tsc -b` and renders without runtime errors.
- [x] 2.2 Define TypeScript types: `IrrigationEvent` (id, plot_id, plot_nombre, irrigation_system_id, sistema_tipo, fecha, duracion_min, mm_aplicados, observaciones, deleted_at), `Plot` (id, nombre, deleted_at), `IrrigationSystem` (id, tipo, deleted_at). Acceptance: types match design contracts and backend response shape.
- [x] 2.3 Implement data fetching on mount: `GET /irrigation-events/getAllIrrigationEvents`, `GET /plots/getPlots` (all active for dropdown), `GET /irrigation-systems/getIrrigationSystems` (all active for dropdown). Acceptance: three parallel requests on mount, loading state shown until all resolve, error alert on failure.
- [x] 2.4 Implement inline create form with fields: plot selector (dropdown of active plots), system selector (dropdown of active systems), fecha (date input, default today), duracion_min (number, optional), mm_aplicados (number, optional), observaciones (textarea, optional). On submit: `POST /irrigation-events/create`, optimistic append to events[], clear form. Acceptance: required fields validated (plot, system, fecha), optional fields sent as null when empty, new event appears at top of list (fecha DESC).
- [x] 2.5 Implement inline edit form (same fields as create, pre-filled with current values). On submit: `PUT /irrigation-events/update/:id`, map update in events[]. Acceptance: edit button visible for admin/enólogo only, cancel closes form without API call, updated values reflect immediately.
- [x] 2.6 Implement soft delete: `DELETE /irrigation-events/delete/:id` with `confirm()` dialog, mark `deleted_at` locally. Acceptance: delete button visible only when `canDelete()` (admin/enólogo), event removed from active list after deletion.
- [x] 2.7 Implement restore: `PUT /irrigation-events/restore/:id`, set `deleted_at = null` locally. Acceptance: restore button visible on deleted cards when `showDeleted` is true and user is admin, event moves back to active list.
- [x] 2.8 Implement "Ver eliminados" toggle (admin only via `canSeeDeleted()`): when enabled, show deleted events with `opacity-50` styling. Acceptance: toggle only visible to admin, deleted events render with `opacity-50` and `bg-slate-800/50` styling, restore button available on each.
- [x] 2.9 Implement empty state ("No hay eventos de riego registrados") and loading state ("Cargando..."). Acceptance: loading shown during fetch, empty state shown when events array is empty after fetch completes.

## Phase 3: Frontend — Routing and Navigation

- [x] 3.1 Add import `IrrigationEvents` and route `{ path: "irrigation-events", element: <IrrigationEvents /> }` to `front/vineyards/src/app/router.tsx` inside the Layout children array. Acceptance: navigating to `/irrigation-events` renders the IrrigationEvents page behind auth guard.
- [x] 3.2 Add nav item `{ to: "/irrigation-events", label: "Eventos de Riego", icon: "🚿" }` to the `navItems` array in `front/vineyards/src/components/layout/Layout.tsx`. Acceptance: sidebar shows "Eventos de Riego" link visible to all authenticated users, active state highlights correctly.

## Phase 4: Verification

- [x] 4.1 Run type check: `cd front/vineyards && npx tsc -b` — must pass with no new errors. Acceptance: zero type errors introduced by IrrigationEvents.tsx.
- [x] 4.2 Run lint: `cd front/vineyards && npm run lint` — must pass. Acceptance: no new ESLint violations.
- [x] 4.3 Run build: `cd front/vineyards && npm run build` — must succeed. Acceptance: production bundle includes IrrigationEvents route.
- [x] 4.4 Manual verification: navigate to `/irrigation-events`, create an event, edit it, delete it, toggle "Ver eliminados", restore it. Acceptance: all CRUD flows work, role permissions enforced (operario sees no delete/edit, enólogo sees delete but no restore toggle, admin sees all).
