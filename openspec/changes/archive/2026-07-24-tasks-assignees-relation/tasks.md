# Tasks: Replace Free-Text Task Assignee with Many-to-Many User Relation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~280–340 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR (backend + frontend in one slice) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | DDL + backend (users endpoint + tasks controller rewrite) | PR 1 | `curl` POST/GET/PATCH per design.md | Running MySQL + `npm run dev` (back) | Revert controller + route files; DDL harmless if unused |
| 2 | Frontend (multi-select + badges + types) | PR 2 (optional) | `npx tsc -b`, `npm run lint` | `npm run dev` (front), inspect network tab | Revert Tasks.tsx types + form; API still returns `asignados` |

## Phase 1: Database — Junction Table DDL

- [x] 1.1 Append `task_assignees` DDL to `esquemaDb.sql` (Req: Junction Table DDL) — `id PK`, `task_id FK→tasks(id) ON DELETE CASCADE`, `user_id FK→users(id) ON DELETE SET NULL`, `UNIQUE(task_id, user_id)`. **Needs DB running.**
- [x] 1.2 Apply DDL to dev MySQL via Node script — table created and verified with `SHOW CREATE TABLE task_assignees`.

## Phase 2: Backend — Active Users Endpoint

- [x] 2.1 Add `getActiveUsers()` to `back/src/controllers/users.controller.js` — query `SELECT id, nombre, apellido, rol FROM users WHERE deleted_at IS NULL ORDER BY nombre, apellido`. (Req: Non-Admin User List Limitation)
- [x] 2.2 Register `GET /api/users/active` in `back/src/routes/users.routes.js` — import + `router.get("/active", getActiveUsers)`. (Req: Non-Admin User List Limitation)

## Phase 3: Backend — Tasks Controller Rewrite

- [x] 3.1 Rewrite `createTask` in `back/src/controllers/tasks.controller.js` — accept `asignado_a_ids`, validate users exist + active via `IN()` query (404 if any missing/deleted), dedup with `new Set()`, wrap INSERT task + bulk INSERT junction in transaction, re-SELECT with JOINs returning `asignados` array. (Req: Create Task with Assignees, delta: Create Task)
- [x] 3.2 Rewrite `getTasks` in `back/src/controllers/tasks.controller.js` — two-query pattern: Q1 fetch tasks with parcela/fecha, Q2 fetch assignees WHERE `task_id IN (...)`, merge in JS into `asignados` per task. (Req: Get Task(s) with Assignees, delta: List Tasks)
- [x] 3.3 Rewrite `getTask` in `back/src/controllers/tasks.controller.js` — LEFT JOIN `task_assignees` → `users`, build `asignados` array from rows. Return 404 if task not found. (Req: Get Task(s) with Assignees, delta: Get Single Task)
- [x] 3.4 Rewrite `updateTask` in `back/src/controllers/tasks.controller.js` — if `asignado_a_ids` present: validate users, DELETE existing junction rows + bulk INSERT new rows in transaction alongside task UPDATE. If absent, junction untouched. (Req: Update Task Assignees, delta: Update Task)
- [x] 3.5 Verify `deleteTask` and `restoreTask` need no changes — soft-delete does not fire CASCADE; junction rows persist. Confirmed: implementation unchanged, CASCADE only fires on hard DELETE. (Req: Junction Table DDL — cascade scenario)

## Phase 4: Frontend — Multi-Select UI

- [x] 4.1 Update `Task` type in `front/vineyards/src/pages/Tasks.tsx` — replace `asignado_a?: string` with `asignados?: { id: number; nombre: string; apellido: string; rol: string }[]`. Add `UserOption` type. (Req: Frontend Multi-Select)
- [x] 4.2 Add `useEffect` to fetch `GET /api/users/active` on mount → store in `users` state. (Req: Frontend Multi-Select, Req: Non-Admin User List Limitation)
- [x] 4.3 Replace `<input name="asignado_a">` with checkbox-based multi-select bound to `users` state; form tracks `asignado_a_ids: number[]`. (Req: Frontend Multi-Select)
- [x] 4.4 Update `handleSubmit` — send `asignado_a_ids` array instead of `asignado_a` string. (Req: Create Task with Assignees)
- [x] 4.5 Replace card display with assignee badges. (Req: Frontend Multi-Select — card badges)
- [x] 4.6 Run `cd front/vineyards && npx tsc -b` — zero NEW type errors from Tasks.tsx. Pre-existing 17 errors in other files unchanged.

## Phase 5: Verification — Manual HTTP Checks

- [x] 5.1 **Create with 0 assignees**: POST `/tasks/createTask` `{descripcion:"Regar", asignado_a_ids:[]}` → 201, `asignados:[]`. (Scenario: Create with no assignees)
- [x] 5.2 **Create with 3 assignees**: POST `{descripcion:"Podar fila 1", asignado_a_ids:[2,3,4]}` → 201, 3 assignees in response. (Scenario: Create with multiple assignees)
- [x] 5.3 **Create omitting asignado_a_ids**: POST `{descripcion:"Podar"}` → 201, `asignados:[]`. (Scenario: Create omitting asignado_a_ids)
- [x] 5.4 **Non-existent user_id**: POST `{descripcion:"Podar", asignado_a_ids:[9999]}` → 404, no rows inserted. (Scenario: Non-existent user_id returns 404)
- [x] 5.5 **Duplicate user_id**: POST `{descripcion:"Podar", asignado_a_ids:[2,2]}` → 201 with 1 assignee (dedup via `new Set()`). (Scenario: Transaction rollback on duplicate assignee)
- [x] 5.6 **List with aggregation**: GET `/tasks/getTasks` → each task has `asignados` array. (Scenario: List tasks with assignee aggregation)
- [x] 5.7 **Single task**: GET `/tasks/getTask/:id` → 200 with `asignados`. (Scenario: Single task with assignees)
- [x] 5.8 **Update replace**: PATCH `/tasks/updateTask/:id` `{asignado_a_ids:[4,5]}` → junction replaced. (Scenario: Replace all assignees)
- [x] 5.9 **Update clear**: PATCH `{asignado_a_ids:[]}` → all junction rows deleted. (Scenario: Clear all assignees)
- [x] 5.10 **Update skip assignees**: PATCH `{estado:"en_progreso"}` (no `asignado_a_ids`) → estado changed, junction untouched. (Scenario: Update other fields without changing assignees)
- [x] 5.11 **GET /api/users/active**: → array of `{id, nombre, apellido, rol}` for all active users. (Scenario: GET /api/users/active)
- [x] 5.12 **Frontend E2E**: Code inspection confirms multi-select, `asignado_a_ids` payload, badge rendering. (Scenario: Card displays assignee badges)
