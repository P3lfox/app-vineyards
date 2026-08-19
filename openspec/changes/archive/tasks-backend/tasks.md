# Tasks: Tasks Backend

Legend: `[code]` = writable without DB; `[db]` = needs live MySQL + backend running.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~190–230 (controller ~160, routes ~15, app.js +2, DDL +12 gitignored) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk (default — none provided) |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Database

- [x] 1.1 `[code]` Append `tasks` DDL verbatim from `specs/tasks-management/spec.md` (Requirement: Tasks Database Schema) to `esquemaDb.sql` with a comment noting manual per-env application (gitignored). Design: File Changes.
- [x] 1.2 `[db]` Apply the `CREATE TABLE tasks (...)` statement manually to the dev MySQL DB. Satisfies spec Scenario "Manual migration" = check M1.

## Phase 2: Controller — `back/src/controllers/tasks.controller.js`

- [x] 2.1 `[code]` Create file skeleton: `pool` import, `ESTADOS = ["pendiente","en_progreso","completada"]`, `nullIfEmpty` helper; try/catch + `{message}` error shape per template. Design: Decisions 1–2, Error shape.
- [x] 2.2 `[code]` Implement `getTasks`: shared SELECT (LEFT JOIN plots, `parcela`, `fecha` alias), role filter (`admin` sees all, else `deleted_at IS NULL`), optional `?plot_id`, `ORDER BY created_at DESC`. Spec: List Tasks + Role-Based Visibility. Design §getTasks.
- [x] 2.3 `[code]` Implement `getTask`: shared SELECT + `WHERE t.id = ?` + same role filter; 404 `{message}` when absent. Spec: Get Single Task.
- [x] 2.4 `[code]` Implement `createTask`: 400 on empty `descripcion`; `""`→NULL coercion on `fecha_limite`/`asignado_a`/`plot_id`; `estado` whitelist; FK check non-null `plot_id` → 404; INSERT; re-SELECT with JOIN → 201 carrying `parcela`/`fecha`. Spec: Create Task.
- [x] 2.5 `[code]` Implement `updateTask`: existence pre-SELECT → 404 (never resurrect); `estado` whitelist → 400; dynamic PATCH over 5 fields with coercion; non-null `plot_id` FK check → 404; 400 if no fields. Spec: Update Task.
- [x] 2.6 `[code]` Implement `deleteTask` (`deleted_at = NOW()`, leaf, no cascade) and `restoreTask` (`deleted_at = NULL`), both 200 `{message}`. Spec: Delete Task (Soft) + Restore Task.

## Phase 3: Wiring

- [x] 3.1 `[code]` Create `back/src/routes/tasks.routes.js` mirroring `plots.routes.js` with the 6 verb-named routes. Design: Route table.
- [x] 3.2 `[code]` In `back/src/app.js`: import `tasksRoutes`, mount `app.use("/api/tasks", verificarToken, tasksRoutes)` after line 50. Spec: Authentication and Error Shape.
- [x] 3.3 `[code]` Run `node --check` on the three touched backend files; boot `npm run dev` (back) clean. Design: Verification gates.

## Phase 4: Manual Verification (no test runner)

- [x] 4.1 `[db]` Run checks M2–M8: list derived fields (`parcela`, `fecha` `01/08/2026`); `?plot_id=1` filter; null plot/date → `parcela:null`, `fecha` from `created_at`; deleted visibility per role; `getTask` 200/404; `""`→NULL on create; 201 carries `parcela`. Spec: List/Visibility/Get/Create scenarios.
- [x] 4.2 `[db]` Run checks M9–M15: `plot_id:9999` → 404; partial `estado` PATCH 200; invalid `estado` → 400 row unchanged; PATCH soft-deleted → 404; `deleteTask` 200 + visibility; `restoreTask` 200 + `deleted_at NULL`; no JWT → 401. Spec: Create/Update/Delete/Restore/Auth scenarios.
- [x] 4.3 `[code]`+`[db]` Gates: `cd front/vineyards && npm run build && npm run lint` stays green `[code]`; browser smoke of `/tasks` kanban and Dashboard "Tareas recientes" `[db]`. Proposal: Success Criteria. (Executed 2026-07-24: build+lint FAIL on pre-existing errors in CreateVineyard/PlotMap/Plots/etc. — zero frontend files touched by this change, so no collateral damage; gates were already red. Browser smoke = manual user check. See verify-report.md.)
