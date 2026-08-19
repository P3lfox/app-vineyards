# Verify Report: tasks-backend

- **Date**: 2026-07-24
- **Mode**: openspec | strict_tdd: false | no test runner → manual HTTP checks + build/lint gates
- **Target**: live API on http://localhost:3000 (nodemon), dev MySQL
- **Auth strategy**: two temporary users created via SQL with locally generated bcrypt hash (`tmpverify.admin@test.local` id=6, `tmpverify.enologo@test.local` id=7), JWTs via `POST /api/auth/login` (both 200). Both users hard-deleted after checks.

## Manual Checks (design.md M1–M15)

| # | Result | Evidence |
|---|--------|----------|
| M1 | PASS | `SHOW COLUMNS FROM tasks` matches spec DDL exactly (id, descripcion, estado ENUM, fecha_limite, asignado_a, plot_id, created_at, deleted_at) |
| M2 | PASS | create=201; list row `parcela="N1"`, `fecha="01/08/2026"` (fecha_limite 2026-08-01, plot 1) |
| M3 | PASS | `getTasks?plot_id=1` → 200, 1 row, all plot_id=1; plot-2 task excluded |
| M4 | PASS | create without plot/date → 201 `parcela:null`, `fecha_limite:null`, `fecha="24/07/2026"` (created_at fallback, DD/MM/YYYY) |
| M5 | PASS | after delete: enólogo list absent; admin list present with `deleted_at=2026-07-24T05:33:38Z` |
| M6 | PASS | `getTask/1` → 200 with parcela/fecha; `getTask/9999` → 404 `{"message":"Tarea no encontrada"}` |
| M7 | PASS | `POST {fecha_limite:"", asignado_a:""}` → 201, both NULL, `estado="pendiente"` |
| M8 | PASS | `POST {plot_id:2}` → 201 body `parcela="Jo"` |
| M9 | PASS | `POST {plot_id:9999}` → 404 `{"message":"Parcela no encontrada"}` |
| M10 | PASS | `PATCH {estado:"en_progreso"}` → 200; descripcion/fecha_limite/asignado_a/plot_id unchanged |
| M11 | PASS | `PATCH {estado:"hecha"}` → 400 `{"message":"Estado inválido"}`; row unchanged |
| M12 | PASS | PATCH soft-deleted → 404 `{"message":"Tarea no encontrada"}`; `deleted_at` and `estado` unchanged (never resurrect) |
| M13 | PASS | `DELETE deleteTask/2` → 200 `{"message":"Tarea eliminada"}`; visibility per M5 |
| M14 | PASS | `PATCH restoreTask/2` → 200 `{"message":"Tarea restaurada"}`; `deleted_at=null`; visible to enólogo again |
| M15 | PASS | `GET getTasks` without Authorization → 401 `{"message":"Token no proporcionado"}` |

Extra shape checks (spec: Create Task / Update Task requirements):
- `POST {descripcion:"   "}` → 400 `{"message":"La descripción es obligatoria"}` — PASS
- `PATCH {}` (no fields) → 400 `{"message":"No hay campos para actualizar"}` — PASS

Note: design's example plot names ("Parcela Norte"/"Parcela Sur") don't exist in dev DB; actual plots are id=1 "N1" and id=2 "Jo". Checks validated the JOIN behavior with the real names.

## Gates (task 4.3)

| Gate | Result | Detail |
|------|--------|--------|
| `front/vineyards: npm run build` | FAIL (pre-existing) | exit 2 — 17 TS errors in `CreateVineyard.tsx` (14), `PlotMap.tsx` (1), `Plots.tsx` (2). None in files related to this change. |
| `front/vineyards: npm run lint` | FAIL (pre-existing) | exit 1 — 24 errors + 4 warnings across Diseases/GetUsers/GetVineyards/IrrigationSystems/PlantDetail/Plants/PlotMap/Plots/Profile/Treatments/VineRows. `Tasks.tsx` has only 1 warning (exhaustive-deps), zero errors. |
| Browser smoke (`/tasks` kanban, Dashboard) | NOT RUN | not feasible from this executor — **manual user check** |

**Collateral-damage analysis**: `git status` confirms this change touched zero frontend files (only `back/src/controllers/tasks.controller.js`, `back/src/routes/tasks.routes.js`, `back/src/app.js`). The failing files are unrelated pages and were already failing before this change — the "stays green" gate assumption was incorrect; the gates were already red. Proposal success criterion "Build + lint pass" is NOT met, but for reasons entirely outside this change's scope.

## Issues

- **CRITICAL**: none.
- **WARNING**: frontend build+lint gates are red (pre-existing, out of scope) — recommend a separate hygiene change for `CreateVineyard.tsx` TS errors (`never[]` state inference, implicit any) and the `no-explicit-any` lint sweep.
- **SUGGESTION**: `deleteTask`/`restoreTask` return 200 even for non-existent ids (UPDATE affects 0 rows silently). Matches codebase convention (same as plots); not a spec violation.

## Cleanup Confirmation

- 5 test tasks hard-deleted (`tasks` table back to 0 rows, as found)
- 2 temporary users (ids 6, 7) hard-deleted; users table back to original 4 rows
- 5 temp scripts (`back/_verify_*.mjs`) deleted — no repo residue
- No processes killed; no implementation code modified; no git mutations

## Verdict

**PASS WITH WARNINGS** — all 15 manual spec checks + 2 extra error-shape checks pass against the live API; implementation matches spec, design, and tasks. The only failing gate (frontend build/lint) is pre-existing and provably unrelated to this change.

**Ready to archive**: YES, after the user runs the browser smoke check (`/tasks` kanban + Dashboard "Tareas recientes" against the dev server) — that is the one remaining item of task 4.3 that cannot be automated here.
