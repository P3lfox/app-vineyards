# Design: Tasks Backend

## Technical Approach

Clone the `plots.controller.js` shape into a new tasks module: verb-named routes mounted behind `verificarToken`, role-conditional list filter, dynamic-field PATCH, leaf soft delete/restore. Spec-mandated deviations from the template: `updateTask` existence check (404), ENUM whitelist validation, `""`→NULL coercion, JOIN re-SELECT on create so the 201 carries `parcela`.

## Architecture Decisions

### Decision: `""`→NULL coercion helper

**Choice**: Module-level helper in `tasks.controller.js` — `const nullIfEmpty = (v) => (v === "" ? null : v)` — applied to `fecha_limite`, `asignado_a`, **and** `plot_id`, in both create and update.
**Alternatives**: coerce only the two documented fields; fix the frontend payload.
**Rationale**: Tasks.tsx:74-77 spreads `form`, so `fecha_limite:""` and `asignado_a:""` are always sent; `plot_id` arrives as `number | undefined` today (Tasks.tsx:76) and never as `""`. Coercing `plot_id` too is free and prevents a strict-mode 500 if any future client sends `""` (MySQL rejects `''` for DATE and INT). Frontend stays untouched per scope.

### Decision: `updateTask` 404 on missing or soft-deleted — CONFIRMED (spec deviation from template)

**Choice**: Pre-SELECT `SELECT id FROM tasks WHERE id = ? AND deleted_at IS NULL`; 404 `{message:"Tarea no encontrada"}` before any UPDATE. `updatePlot` lacks this check; we add it deliberately.
**Rationale**: Consistent with role-visibility rules — non-admin never sees soft-deleted rows, so no role may mutate them; admin must go through `restoreTask` ("never resurrect" via update). One uniform mutation path, matches spec scenario "Soft-deleted task not updatable".

### Decision: ENUM validation via whitelist before query

**Choice**: `const ESTADOS = ["pendiente", "en_progreso", "completada"]`; if `estado` is present and not in the list → 400, before any SQL (create and update).
**Alternatives**: rely on MySQL ENUM rejection.
**Rationale**: Spec requires 400 with row unchanged; a MySQL ENUM error would surface as 500 via the catch block (wrong status, leaky message) or silently insert `''` under non-strict sql_mode. Pre-validation matches codebase style (`createPlot`'s required-field 400).

### Decision: FK check only when `plot_id` is non-null

**Choice**: `SELECT id FROM plots WHERE id = ? AND deleted_at IS NULL` → 404, in create and in update when `plot_id` is a non-null value.
**Rationale**: 1:1 with `createPlot`'s vineyard check; `plot_id NULL` ("Sin parcela asignada") must skip the check.

### Decision: No transactions

**Choice**: Plain `pool.query` single statements everywhere; no `pool.getConnection()`/`beginTransaction`.
**Rationale**: `tasks` is a leaf entity — its only FK is outbound (`plot_id → plots.id`), nothing cascades. Contrast `deletePlot`, which needs a transaction for the 4-table cascade. Matches the diseases/treatments leaf pattern.

## Data Flow

Simple request/response CRUD — no complex flows, no sequence diagram needed.

    Tasks.tsx / Dashboard.tsx ──HTTP──> Express /api/tasks (verificarToken)
                                            │
                                    tasks.routes.js ──> tasks.controller.js
                                            │
                                    pool.query ──> MySQL (tasks LEFT JOIN plots)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `back/src/controllers/tasks.controller.js` | Create | 6 handlers + `ESTADOS` + `nullIfEmpty`; Spanish messages, try/catch per handler |
| `back/src/routes/tasks.routes.js` | Create | Verb-named routes, mirrors `plots.routes.js` |
| `back/src/app.js` | Modify | Import + `app.use("/api/tasks", verificarToken, tasksRoutes)` after line 50 |
| `esquemaDb.sql` | Modify | Append `tasks` DDL verbatim from spec (gitignored — **manual migration per environment**: run the `CREATE TABLE tasks (...)` statement from `specs/tasks-management/spec.md` against each dev DB) |

## Interfaces / Contracts

**Route table** (middleware applied at mount in `app.js`, per plots convention):

| Verb | Path | Handler |
|------|------|---------|
| POST | `/api/tasks/createTask` | createTask |
| GET | `/api/tasks/getTasks` | getTasks |
| GET | `/api/tasks/getTask/:id` | getTask |
| PATCH | `/api/tasks/updateTask/:id` | updateTask |
| DELETE | `/api/tasks/deleteTask/:id` | deleteTask |
| PATCH | `/api/tasks/restoreTask/:id` | restoreTask |

**Shared SELECT shape** (getTasks, getTask, createTask re-SELECT):

```sql
SELECT t.id, t.descripcion, t.estado, t.fecha_limite, t.asignado_a, t.plot_id,
       t.created_at, t.deleted_at,
       p.nombre AS parcela,
       DATE_FORMAT(COALESCE(t.fecha_limite, t.created_at), '%d/%m/%Y') AS fecha
FROM tasks t
LEFT JOIN plots p ON t.plot_id = p.id
```

Plain LEFT JOIN with no `p.deleted_at` condition: a task on a soft-deleted plot keeps showing its historical plot name; the active-plot rule is enforced only at write time via the FK check.

- **getTasks**: `WHERE 1=1 ${filter}` — `filter = usuario?.role === "admin" ? "" : "AND t.deleted_at IS NULL"`; optional `AND t.plot_id = ?` when `req.query.plot_id`; `ORDER BY t.created_at DESC`. → 200 array.
- **getTask**: shared SELECT + `WHERE t.id = ? ${filter}` (same role filter — non-admin must not read invisible rows). → 200 row, else 404.
- **createTask**: 400 if `!descripcion?.trim()`; coerce the three nullable fields; validate `estado` if present; FK-check `plot_id` if non-null → 404; then
  `INSERT INTO tasks (descripcion, estado, fecha_limite, asignado_a, plot_id) VALUES (?, ?, ?, ?, ?)` with `estado ?? "pendiente"`; re-SELECT by `insertId` with the JOIN → 201 (carries `parcela`, `fecha`).
- **updateTask**: existence check → 404; `estado` whitelist → 400; dynamic builder over `descripcion/estado/fecha_limite/asignado_a/plot_id` (`if (x !== undefined) fields.push(...)`, coercion applied; `plot_id` non-null → FK check → 404); 400 if no fields; `UPDATE tasks SET ${fields.join(", ")} WHERE id = ?` → 200 `{message}` (UI ignores body, Tasks.tsx:89).
- **deleteTask**: `UPDATE tasks SET deleted_at = NOW() WHERE id = ?` → 200 `{message:"Tarea eliminada"}`.
- **restoreTask**: `UPDATE tasks SET deleted_at = NULL WHERE id = ?` → 200 `{message:"Tarea restaurada"}`. No backend role gate, per codebase convention (no write endpoint checks role); only admin sees deleted rows to restore.

**Error shape**: JSON `{message}`; 400 validation, 401 no token / 403 bad token (existing middleware), 404 not-found/FK, 500 `console.error(error)` + generic message. Try/catch per handler, per template.

## Testing Strategy

No test runner exists (config: `strict_tdd: false`) — verification is manual HTTP plus build/lint gates; see below.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Pure REST CRUD behind existing JWT middleware.

## Migration / Rollout

Apply the `tasks` DDL manually per environment (file is gitignored); no backfill, no feature flag. Rollback: revert the `app.js` mount, delete the two new files, `DROP TABLE tasks`. Frontend tolerates absent endpoints.

## Verification Approach (manual — no test runner)

Setup: apply DDL; restart API; obtain admin and enólogo JWTs via `POST /api/auth/login`. Then, mapped to spec scenarios:

| # | Scenario | Manual check |
|---|----------|--------------|
| M1 | Manual migration | DDL applied; all checks below succeed |
| M2 | List with derived fields | Create task (`fecha_limite 2026-08-01`, plot "Parcela Norte") → `GET getTasks` → `parcela:"Parcela Norte"`, `fecha:"01/08/2026"` |
| M3 | Filter by plot | `GET getTasks?plot_id=1` → only plot-1 tasks |
| M4 | No plot, no due date | Task without `plot_id`/`fecha_limite` → `parcela:null`, `fecha` = created date `DD/MM/YYYY` |
| M5 | Deleted visibility | Delete a task → enólogo list: absent; admin list: present with `deleted_at` |
| M6 | Found and not found | `GET getTask/{id}` → 200; `GET getTask/9999` → 404 `{message}` |
| M7 | Empty strings coerced | `POST {descripcion:"Podar", fecha_limite:"", asignado_a:""}` → 201; both NULL; `estado "pendiente"` |
| M8 | Response carries parcela | `POST` with `plot_id:2` → 201 body has `parcela:"Parcela Sur"` |
| M9 | Non-existent plot FK | `POST` with `plot_id:9999` → 404 |
| M10 | Partial estado update | `PATCH updateTask/3 {estado:"en_progreso"}` → 200; other fields unchanged |
| M11 | Invalid estado | `PATCH {estado:"hecha"}` → 400; row unchanged |
| M12 | Soft-deleted not updatable | `PATCH` on deleted task → 404; `deleted_at` unchanged |
| M13 | Soft delete | `DELETE deleteTask/3` → 200; visibility per M5 |
| M14 | Restore | `PATCH restoreTask/3` → 200; `deleted_at NULL`; visible to all roles |
| M15 | No JWT | `GET getTasks` without `Authorization` → 401 `{message}` |

Gates: `node --check` on new/edited backend files; server boots clean; `cd front/vineyards && npm run build && npm run lint` stays green (frontend untouched). Kanban + Dashboard smoke test in browser.

## Open Questions

- None blocking. Pre-existing frontend deviations (operario sees delete button in Tasks.tsx; Dashboard `fecha` rendering) are recorded in exploration.md and intentionally out of scope.
