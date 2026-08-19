# Proposal: Task State Transitions and Auto-Cleanup

## Intent

Close two gaps in the tasks lifecycle: (1) any authenticated user can currently move any task to any state with no ownership enforcement, and (2) completed tasks accumulate forever with no cleanup. Additionally, users cannot edit task description, deadline, or assignees after creation — only estado changes and delete are available.

## Scope

### In Scope
- Role + assignment guard on task state transitions
- `completed_at` column and MySQL Event Scheduler job for auto soft-delete after 2 hours
- Edit task card UI (description, fecha_limite, assignees) from kanban board
- Conditional move-button rendering based on role and assignment
- Admin "ver eliminadas" toggle for completed/deleted tasks
- Backfill strategy for existing completed tasks

### Out of Scope
- Drag-and-drop kanban (button-based stays)
- Notification system on state change
- Configurable auto-delete window (fixed at 2 hours for v1)

## Capabilities

> This section is the CONTRACT between proposal and specs phases.

### New Capabilities
- `task-state-transitions`: Role-gated state transition endpoint with ownership validation and completed_at tracking
- `task-auto-cleanup`: MySQL Event Scheduler job that soft-deletes completed tasks older than 2 hours
- `task-edit-ui`: Inline edit modal on task cards for description, fecha_limite, and assignees

### Modified Capabilities
- `tasks-management`: Update requirement to set completed_at when estado becomes "completada"; add role guard on estado changes
- `task-assignee-management`: No changes — assignee logic remains as-is; edit reuses existing updateTask assignee replacement

## Approach

1. **DB**: `ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP NULL` after `deleted_at`. Create an `ALTER TABLE` migration note (esquemaDb.sql is gitignored). Add a `CREATE EVENT` statement for the scheduler job.
2. **Backend**: Add `transitionTask(req, res)` endpoint. It reads `usuario` from JWT, checks assignment via `task_assignees`, validates role, updates `estado`, and sets `completed_at = NOW()` when transitioning to "completada". Also patch `updateTask` to set `completed_at` when estado changes to "completada" via the generic update path.
3. **Frontend**: Add an edit modal triggered from each task card. Conditionally render state-change buttons: operarios see only "pendiente → en_progreso" when assigned; enólogos/admins see all transitions. Add a countdown badge on completed tasks showing time until auto-delete. Add admin-only "ver eliminadas" toggle.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `back/src/controllers/tasks.controller.js` | Modified | Add `transitionTask`; patch `updateTask` for `completed_at` |
| `back/src/routes/tasks.routes.js` | Modified | Register `POST /transitionTask/:id` |
| `back/src/db.js` or migration SQL | New | `ALTER TABLE tasks ADD completed_at`; `CREATE EVENT` for auto-cleanup |
| `front/vineyards/src/pages/Tasks.tsx` | Modified | Edit modal, conditional buttons, countdown badge, admin toggle |
| `openspec/specs/tasks-management/spec.md` | Modified | Delta: add transition guard, completed_at behavior |
| `openspec/specs/task-assignee-management/spec.md` | No change | Assignee logic reused as-is |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| MySQL Event Scheduler disabled on dev/production | Medium | Include `SET GLOBAL event_scheduler = ON` in migration notes; verify with `SHOW VARIABLES LIKE 'event_scheduler'` |
| Existing completed tasks lack `completed_at` | High | Backfill: `UPDATE tasks SET completed_at = NOW() WHERE estado = 'completada' AND completed_at IS NULL` |
| Tasks with no assignees — who can transition? | Medium | Admin can always transition; unassigned tasks require admin intervention (documented behavior) |
| Edit modal adds complexity to card component | Low | Extract as separate component; reuse existing create-task form patterns |

## Rollback Plan

1. Drop the event: `DROP EVENT IF EXISTS auto_softdelete_completed_tasks;`
2. Remove `completed_at` column: `ALTER TABLE tasks DROP COLUMN completed_at;`
3. Remove `transitionTask` route and handler
4. Revert frontend changes (edit modal, conditional buttons)
5. No data loss — soft-deleted tasks remain soft-deleted; `deleted_at` is the source of truth

## Dependencies

- MySQL server with Event Scheduler support (MySQL 5.1+)
- Existing JWT middleware (`verificarToken`) already in place
- Existing `task_assignees` junction table already exists

## Success Criteria

- [ ] Operario cannot move a task they are not assigned to
- [ ] Operario can only transition `pendiente → en_progreso` (not to `completada`)
- [ ] Enólogo/admin can transition any task regardless of assignment
- [ ] Tasks entering "completada" get `completed_at` set within 1 second
- [ ] Completed tasks are soft-deleted within 2 hours ± 5 minutes (scheduler resolution)
- [ ] Admin can see and restore auto-deleted tasks via "ver eliminadas" toggle
- [ ] Edit modal saves description, fecha_limite, and assignees correctly
- [ ] Existing completed tasks are backfilled with `completed_at` on first migration run
