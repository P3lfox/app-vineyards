# Exploration: Tasks backend

Date: 2026-07-24 · Mode: openspec · Change: `tasks-backend`

## Current State

The Tasks frontend is fully built but has no backend. Two frontend consumers exist:

1. **`front/vineyards/src/pages/Tasks.tsx`** — kanban board (pendiente / en_progreso / completada) with create form, estado transitions, delete. Reached via `/tasks`, `/tasks/create`, and `/plots/:plotId/tasks` (`front/vineyards/src/app/router.tsx:49,56,57`; nav link in `components/layout/Layout.tsx:9`).
2. **`front/vineyards/src/pages/Dashboard.tsx`** — "Tareas recientes" section calls `GET /tasks/getTasks` and slices the first 5 (`Dashboard.tsx:44-47`).

Backend has NO tasks artifacts: no routes/controller (confirmed via `back/src/app.js:3-22` imports) and **no tasks/tareas table** in `esquemaDb.sql` (full 253-line read; 18 tables, none for tasks). `esquemaDb.sql` is gitignored — schema changes need explicit migration notes per `openspec/config.yaml:49`.

`GET /api/stats` (Dashboard.tsx:43) is also unimplemented but is OUT of scope for this change (Dashboard tolerates it via `.catch()`).

## Exact API Surface the Frontend Expects

| Verb | Endpoint | Caller evidence | Request | Expected response |
|------|----------|-----------------|---------|-------------------|
| GET | `/api/tasks/getTasks` | Tasks.tsx:56, Dashboard.tsx:44 | Optional query `plot_id` | JSON array of task objects (empty array OK) |
| POST | `/api/tasks/createTask` | Tasks.tsx:78 | `{ descripcion, estado, fecha_limite, plot_id?, asignado_a }` | 201 + the created task object (frontend prepends it to the kanban, Tasks.tsx:79) |
| PATCH | `/api/tasks/updateTask/:id` | Tasks.tsx:89 | `{ estado }` (only field ever sent) | Any 2xx (body ignored) |
| DELETE | `/api/tasks/deleteTask/:id` | Tasks.tsx:101 | — | Any 2xx |

### Task object fields read by the UI (field by field)

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `id` | number | Tasks.tsx:6 | PK |
| `descripcion` | string | Tasks.tsx:7,134 (required textarea) | NOT NULL |
| `estado` | `"pendiente" \| "en_progreso" \| "completada"` | Tasks.tsx:8,21-37 | ENUM, exactly 3 values |
| `fecha_limite` | string (date), optional | Tasks.tsx:9,144; rendered via `toLocaleDateString("es-AR")` (line 240) | DATE, nullable |
| `plot_id` | number, optional | Tasks.tsx:10,159-172 | Nullable — UI offers "Sin parcela asignada" |
| `parcela` | string, optional | Tasks.tsx:11,232; Dashboard.tsx:18,149 | **Derived**: `plots.nombre` via LEFT JOIN, aliased `parcela` |
| `asignado_a` | string, optional | Tasks.tsx:12,151 (free-text input, placeholder "Asignado a (opcional)") | **Free text, NOT a user select** — displayed verbatim (line 236) |
| `fecha` | string | Dashboard.tsx:19,154 **only** | Ambiguity — see Open Question 2 |

### Payload gotcha (concrete, from Tasks.tsx:47-53,74-77)

The form always sends `fecha_limite: ""` and `asignado_a: ""` as **empty strings** when unset (spread of `form`), while `plot_id` becomes `undefined` (dropped from JSON by axios). Backend MUST normalize `""` → `NULL` for `fecha_limite`/`asignado_a`, or MySQL strict mode will reject `INSERT` with `Incorrect date value: ''`.

Also: `createTask`'s response should re-SELECT the row with the plots JOIN so `parcela` is present immediately in the prepended kanban card (Tasks.tsx:232 reads it without refetch).

## Proposed Schema (no tasks table exists today)

Follows conventions: English table names, Spanish columns, `created_at` + `deleted_at`, InnoDB FK.

```sql
CREATE TABLE tasks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  descripcion TEXT NOT NULL,
  estado ENUM('pendiente','en_progreso','completada') NOT NULL DEFAULT 'pendiente',
  fecha_limite DATE NULL,
  asignado_a VARCHAR(150) NULL,      -- free text per current UI
  plot_id INT UNSIGNED NULL,          -- nullable: "Sin parcela asignada"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (plot_id) REFERENCES plots(id)
) ENGINE=InnoDB;
```

Must be appended to `esquemaDb.sql` (gitignored) AND applied manually to each dev DB — migration note required in proposal.

## Patterns to Follow (template analysis)

**Best template: `back/src/controllers/plots.controller.js`** — matches on every axis:

- `createPlot` (lines 3-36): required-field validation → FK existence check (`SELECT id FROM vineyards WHERE id = ? AND deleted_at IS NULL`, 404 if missing) → INSERT → 201 with created object. Maps 1:1 to `createTask` (optional `plot_id` validated only when present).
- `getPlots` (lines 60-87): role filter `usuario?.role === "admin" ? "" : "AND p.deleted_at IS NULL"` (line 65) + optional query-param parent filter (`vineyard_id`, lines 74-77) + JOIN for parent name (`v.nombre as vineyard_nombre`, line 68) + `ORDER BY created_at DESC`. This is EXACTLY the `getTasks` shape (`plot_id` filter + `p.nombre AS parcela`).
- `updatePlot` (lines 89-112): dynamic-fields PATCH (`fields.push(...)` per defined field, 400 if none). Maps to `updateTask`.
- `deletePlot`/`restorePlot` (lines 114-202): transaction cascade. Tasks is a **leaf entity — no cascade needed**; simple single-statement soft delete/restore suffices (closer to diseases/treatments controllers).

**Secondary reference: `vineRows.controller.js:36-63`** — parent query-param filter with LEFT JOIN aggregate, but its `plot_id` is mandatory; tasks' is optional (plots' `vineyard_id` pattern is the correct analog).

**Routes**: mirror `back/src/routes/plots.routes.js` naming — `/createTask`, `/getTasks`, `/getTask/:id` (optional, unused by UI), `/updateTask/:id`, `/deleteTask/:id`, `/restoreTask/:id` (convention parity).

**Mounting**: add `app.use("/api/tasks", verificarToken, tasksRoutes)` in `back/src/app.js` (after line 50), per config rule "all new API routes MUST sit behind JWT" (`openspec/config.yaml:65`).

**Auth context**: JWT payload is `{ id, role }` (`auth.controller.js:26`); controllers read `req.usuario.role` / `req.usuario.id`.

## Role Matrix Implications (as enforced by existing backend)

| Capability | admin | enólogo | operario | Evidence |
|-----------|-------|---------|----------|----------|
| List active tasks | ✅ | ✅ | ✅ | default filter `deleted_at IS NULL` (plots.controller.js:65) |
| See soft-deleted tasks | ✅ | ❌ | ❌ | same admin-only pattern |
| Create / update estado | ✅ | ✅ | ✅ | no role checks exist on writes in ANY controller |
| Delete | ✅ | ✅ | ✅ (API-level) | **Backend never blocks delete by role** — operario restriction is frontend-only (hidden buttons). Tasks.tsx:257-262 currently shows delete to all roles — pre-existing frontend inconsistency with the documented matrix; flag, don't fix here. |
| Restore | ✅ (implicit) | ❌ | ❌ | only admin sees deleted records to restore |

## Affected Areas

- `back/src/controllers/tasks.controller.js` — NEW (create/get/getAll/update/delete/restore)
- `back/src/routes/tasks.routes.js` — NEW (verb-named routes, plots convention)
- `back/src/app.js` — EDIT: import + `app.use("/api/tasks", verificarToken, tasksRoutes)`
- `esquemaDb.sql` — EDIT: append `tasks` table (gitignored → migration note in proposal)
- `front/vineyards/src/pages/Tasks.tsx`, `Dashboard.tsx` — NO changes required for base scope (consumers already written)

## Approaches

1. **Minimal pass-through (recommended)** — 4 endpoints the UI consumes + `restoreTask`/`getTask` for CRUD parity; `asignado_a` as free-text VARCHAR; nullable `plot_id` FK; zero frontend changes.
   - Pros: exact UI contract; zero scope creep; ~200 lines, single review unit; follows plots.controller.js line-by-line
   - Cons: `asignado_a` stays unstructured text (no user linkage, typos possible)
   - Effort: **Low**

2. **Full assignment model** — `asignado_a` → `asignado_a_user_id INT UNSIGNED NULL FK users(id)` + JOIN returning user name; frontend input becomes a users `<select>`; optionally fold in `/api/stats`.
   - Pros: relational integrity; enables "my tasks" filtering later; fixes Dashboard stats
   - Cons: requires frontend changes (out of declared scope); two review surfaces; stats endpoint mixes concerns into this change
   - Effort: **Medium**

## Recommendation

Approach 1. The frontend contract is unambiguous except where noted below; match it exactly with the plots.controller.js template. Defer user-FK assignment and `/api/stats` to separate changes.

## Open Questions (need user decision before/at proposal)

1. **`asignado_a`: free text or users FK?** UI is a free-text input (Tasks.tsx:151-157).
   - (a) VARCHAR(150) free text — matches UI, zero frontend changes *(recommended for this scope)*
   - (b) FK to `users(id)` + JOIN — requires changing the frontend input to a select
2. **Dashboard reads `task.fecha`, not `fecha_limite`** (Dashboard.tsx:19,154) — it will render an empty date.
   - (a) Alias in `getTasks` SELECT, e.g. `DATE_FORMAT(COALESCE(fecha_limite, created_at), '%d/%m/%Y') AS fecha` — zero frontend change *(recommended)*
   - (b) Small frontend fix: Dashboard uses `fecha_limite`
   - (c) Ignore (cosmetic gap stays)
3. **`updateTask` scope**: UI only ever sends `{ estado }`.
   - (a) Full dynamic-field update (descripcion, fecha_limite, asignado_a, plot_id, estado) following updatePlot pattern *(recommended — same effort, future-proof)*
   - (b) Estado-only endpoint
4. **Include `restoreTask` + `getTask/:id`?** UI never calls them, but config mandates soft-delete + role filtering "like existing controllers" and all sibling entities expose restore.
   - (a) Include both for CRUD parity *(recommended)*
   - (b) YAGNI — only the 4 consumed endpoints
5. **`/api/stats`** (Dashboard.tsx:43, unimplemented, shows "—" fallbacks): confirm OUT of scope? *(recommended: separate change)*

## Risks

- **Empty-string DATE insert**: `fecha_limite: ""` from the form will crash INSERT under MySQL strict mode unless normalized to NULL (highest-probability bug in apply).
- **Gitignored schema**: `esquemaDb.sql` is not in the repo; every environment must apply the `tasks` table manually — proposal must carry the migration SQL verbatim.
- **No test runner**: verification is manual (HTTP calls) + front build/lint only (`openspec/config.yaml:67-74`); acceptance scenarios must be hand-checked.
- **Pre-existing frontend deviations** (do NOT fix in this change, but record): operario sees the delete button in Tasks.tsx; Dashboard `fecha` vs `fecha_limite` mismatch; `/tasks/create` route just renders the board without auto-opening the form.
- **Scope creep pressure**: Dashboard also wants `/api/stats` — keep it out or the change balloons.

## Out of Scope

- `/api/stats` endpoint and Dashboard stat cards
- User-FK task assignment (unless Open Question 1 resolves to (b))
- Harvests backend (the other unimplemented page)
- Any frontend modifications (unless OQ2 resolves to (b))

## Ready for Proposal

**Yes** — the frontend contract is fully known from real code, the schema is derivable, and the plots controller is a line-by-line template. The orchestrator should surface Open Questions 1-5 to the user; all have recommended defaults, so proposal can proceed even with defaults accepted.
