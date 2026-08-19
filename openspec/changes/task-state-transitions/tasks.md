# Tasks: Task State Transitions and Auto-Cleanup

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~400-500 (backend ~180, frontend ~220, migration ~30, routes ~5) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Full change: migration + backend + frontend | PR 1 | `cd front/vineyards && npx tsc -b` + `npm run lint` | `npm run dev` (both services), manual API calls via curl/Postman | Drop event, remove column, revert controller/route/frontend changes |

## Phase 1: Database Migration

- [x] 1.1 Create `back/migrations/003_task_state_transitions.sql` with: `ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP NULL AFTER deleted_at;`
- [x] 1.2 Add backfill: `UPDATE tasks SET completed_at = NOW() WHERE estado = 'completada' AND completed_at IS NULL;`
- [x] 1.3 Add `CREATE EVENT IF NOT EXISTS auto_delete_completed_tasks ON SCHEDULE EVERY 5 MINUTE` that sets `deleted_at = NOW()` where `estado = 'completada' AND completed_at < NOW() - INTERVAL 2 HOUR AND deleted_at IS NULL`
- [x] 1.4 Add `SET GLOBAL event_scheduler = ON;` with comment noting SUPER privilege requirement

## Phase 2: Backend — Transition Endpoint

- [x] 2.1 Add `canUserAccessTask(conn, taskId, userId, userRole)` helper: returns `true` if `userRole === 'admin'` OR user exists in `task_assignees` for the task
- [x] 2.2 Add `TRANSITIONS` constant matrix per role (operario: `{pendiente: ['en_progreso']}`, enologo/admin: all transitions)
- [x] 2.3 Add `transitionTask(req, res)` controller: validate JWT user, check task exists and not soft-deleted (404), call `canUserAccessTask` (403 if false), validate transition against matrix (400 if invalid), UPDATE `estado` + set `completed_at = NOW()` when target is `completada` or `completed_at = NULL` when source is `completada`, return updated task with assignees
- [x] 2.4 Register route in `back/src/routes/tasks.routes.js`: `router.post("/transitionTask/:id", verificarToken, transitionTask)`

## Phase 3: Backend — Patch Existing Endpoints

- [x] 3.1 Patch `updateTask`: when `estado` in body changes TO `completada`, add `completed_at = NOW()` to fields; when changing FROM `completada`, add `completed_at = NULL`
- [x] 3.2 Patch `updateTask`: add ownership guard — if `usuario.role !== 'admin'`, call `canUserAccessTask` before UPDATE (403 if not assigned)
- [x] 3.3 Patch `deleteTask`: add ownership guard — if `usuario.role !== 'admin'`, call `canUserAccessTask` before UPDATE (403 if not assigned)
- [x] 3.4 Patch `getTasks`: add `include_deleted` query param support — when `req.query.include_deleted === '1'` AND `usuario.role === 'admin'`, omit `AND t.deleted_at IS NULL` filter; non-admin ignores param
- [x] 3.5 Update `SELECT_TASK_BASE` and `SELECT_TASK_WITH_ASSIGNEES` to include `t.completed_at` in SELECT columns

## Phase 4: Frontend — Conditional Rendering and Edit Modal

- [x] 4.1 Extend `Task` type: add `completed_at?: string` and `deleted_at?: string` fields
- [x] 4.2 Add `useAuth` hook or extract `usuario` from localStorage JWT to get current user's `id` and `role`
- [x] 4.3 Add helper `canUserModifyTask(task, usuario)`: returns true if `usuario.role === 'admin'` OR `usuario.id` is in `task.asignados`
- [x] 4.4 Conditionally render move buttons: only when `canUserModifyTask` is true; operario sees only "Iniciar" on `pendiente` tasks, enologo/admin sees all transitions
- [x] 4.5 Conditionally render delete button: only when `canUserModifyTask` is true
- [x] 4.6 Add "Editar" button on each card: visible only when `canUserModifyTask` is true
- [x] 4.7 Create edit modal state: `editingTask`, `editForm` (descripcion, fecha_limite, asignado_a_ids), `showEditModal`
- [x] 4.8 Build edit modal UI: textarea for descripcion, date input for fecha_limite, multi-select checkboxes for assignees (reuse create form pattern), pre-fill with current task values
- [x] 4.9 Wire edit submit: `PATCH /tasks/updateTask/:id` with `{descripcion, fecha_limite, asignado_a_ids}`; optimistic update on success
- [x] 4.10 Replace `handleEstadoChange` to use `POST /tasks/transitionTask/:id` instead of `PATCH /tasks/updateTask/:id`
- [x] 4.11 Add `includeDeleted` state + admin-only "Ver eliminadas" toggle; when enabled, fetch `GET /tasks/getTasks?include_deleted=1`; render deleted tasks with `opacity-50`
- [x] 4.12 Add countdown helper: compute `timeUntilAutoDelete(completed_at)` → returns "se eliminará en Xh Ym" if < 2h, "pendiente de eliminación" if >= 2h, null if no `completed_at`
- [x] 4.13 Render countdown badge on completed task cards (only when `completed_at` is not null)

## Phase 5: Verification

- [x] 5.1 Run `cd front/vineyards && npx tsc -b` — zero TypeScript errors in Tasks.tsx
- [x] 5.2 Run `cd front/vineyards && npm run lint` — zero lint errors in Tasks.tsx
- [ ] 5.3 Manual: run migration SQL on dev DB, verify `completed_at` column exists and event is created
- [ ] 5.4 Manual: test `POST /api/tasks/transitionTask/:id` with operario (assigned → 200, unassigned → 403, invalid transition → 400)
- [ ] 5.5 Manual: test edit modal — change description, deadline, assignees; verify card updates optimistically
- [ ] 5.6 Manual: verify admin sees "Ver eliminadas" toggle, non-admin does not; toggle shows soft-deleted tasks with `opacity-50`
- [ ] 5.7 Manual: verify countdown displays on completed tasks with valid `completed_at`
