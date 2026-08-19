# Design: Task State Transitions and Auto-Cleanup

## Technical Approach

Enforce role-gated state transitions on tasks via a dedicated `POST /api/tasks/transitionTask/:id` endpoint, add `completed_at` lifecycle tracking, and auto-soft-delete completed tasks after 2 hours using MySQL Event Scheduler with a query-time fallback. Frontend receives conditional button rendering, an edit modal, and a countdown indicator. All transition rules are backend-enforced; the UI is a progressive enhancement.

## Architecture Decisions

### Decision: Dedicated transitionTask endpoint vs. reuse updateTask

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Dedicated `POST /transitionTask/:id` | Clear separation of concerns, explicit authorization, easy to audit transition logs later | **Chosen** |
| Extend `PATCH /updateTask/:id` with transition guard | Simpler surface, but mixes state-transition auth with general edit auth | Rejected |

**Rationale**: State transitions have different authorization rules (assignee-or-admin) than general edits (which will also need an ownership guard). A dedicated endpoint avoids conflating two different permission models. `updateTask` still sets/clears `completed_at` when estado changes via the general path, but does NOT enforce transition rules — that's the transition endpoint's job.

### Decision: MySQL Event Scheduler vs. application-level cron

| Option | Tradeoff | Decision |
|--------|----------|----------|
| MySQL Event Scheduler | No extra process, runs inside DB, 5-min resolution | **Chosen** |
| Node.js `setInterval` / `node-cron` | Requires always-on process, adds dependency | Rejected |
| External cron job | Infrastructure dependency, harder to deploy | Rejected |

**Rationale**: The app already depends on MySQL. Event Scheduler is built-in, requires zero extra infrastructure, and the 5-minute resolution is acceptable for a 2-hour window. Query-time fallback in `getTasks` covers the case where the scheduler is disabled.

### Decision: Operario transition constraints

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Operario: pendiente → en_progreso only | Simple, matches real workflow (operarios start work, enólogos/admins complete) | **Chosen** |
| Operario: all transitions | No enforcement, defeats the purpose | Rejected |

**Rationale**: Operarios are field workers — they start tasks but shouldn't mark them complete without oversight. Enólogos and admins have full transition freedom.

### Decision: completed_at backfill strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Backfill with `NOW()` on migration | Simple, predictable, tasks become eligible for cleanup after 2h from migration time | **Chosen** |
| Leave as NULL forever | Legacy tasks never auto-clean, requires manual intervention | Rejected |

**Rationale**: Setting `completed_at = NOW()` for existing completed tasks means they'll be cleaned up within 2 hours of migration. This is acceptable — if a task has been completed for days, 2 more hours won't matter.

## Data Flow

### State Transition Flow

```
User clicks "Iniciar" / "Completar"
         │
         ▼
  POST /api/tasks/transitionTask/:id
  { estado: "en_progreso" }
         │
         ▼
  verificarToken → req.usuario = { id, role, ... }
         │
         ▼
  1. Check task exists AND NOT soft-deleted → 404 if missing
  2. Check user role:
     - admin → skip assignment check
     - else → query task_assignees for user_id → 403 if not found
  3. Validate transition per role matrix → 400 if invalid
  4. UPDATE tasks SET estado = ?, completed_at = ? WHERE id = ?
     - completed_at = NOW() if new estado = 'completada'
     - completed_at = NULL if old estado = 'completada'
     - completed_at unchanged otherwise
         │
         ▼
  200 → { id, descripcion, estado, completed_at, asignados: [...] }
         │
         ▼
  Frontend: optimistic update → card moves to new column
```

### Auto-Cleanup Flow

```
MySQL Event Scheduler (every 5 min)
         │
         ▼
  UPDATE tasks SET deleted_at = NOW()
  WHERE estado = 'completada'
    AND completed_at IS NOT NULL
    AND completed_at < NOW() - INTERVAL 2 HOUR
    AND deleted_at IS NULL
         │
         ▼
  If event_scheduler = OFF:
  getTasks runs the same UPDATE before SELECT
```

### Edit Flow

```
User clicks "Editar" on card
         │
         ▼
  Modal opens with current values pre-filled
  (descripcion, fecha_limite, asignados checkboxes)
         │
         ▼
  User modifies → submits
         │
         ▼
  PATCH /api/tasks/updateTask/:id
  { descripcion?, fecha_limite?, asignado_a_ids? }
         │
         ▼
  Backend: ownership guard (admin OR assigned) → 403 if fail
  Backend: validate, update in transaction, return updated task
         │
         ▼
  Frontend: optimistic update → card reflects changes
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `back/migrations/003_task_state_transitions.sql` | Create | ALTER TABLE + CREATE EVENT + backfill + enable scheduler |
| `back/src/controllers/tasks.controller.js` | Modify | Add `transitionTask`; patch `updateTask` for `completed_at`; add `canUserAccessTask` helper; add ownership guard to `updateTask` and `deleteTask` |
| `back/src/routes/tasks.routes.js` | Modify | Add `POST /transitionTask/:id` route |
| `front/vineyards/src/pages/Tasks.tsx` | Modify | Edit modal, conditional buttons, countdown badge, admin "ver eliminadas" toggle, `include_deleted` query param |

## Interfaces / Contracts

### Transition Matrix (backend-enforced)

```js
const TRANSITIONS = {
  operario: {
    pendiente: ["en_progreso"],
    en_progreso: [],
    completada: [],
  },
  enologo: {
    pendiente: ["en_progreso", "completada"],
    en_progreso: ["pendiente", "completada"],
    completada: ["pendiente", "en_progreso"],
  },
  admin: {
    pendiente: ["en_progreso", "completada"],
    en_progreso: ["pendiente", "completada"],
    completada: ["pendiente", "en_progreso"],
  },
}
```

### New Endpoint

```
POST /api/tasks/transitionTask/:id
Authorization: Bearer <jwt>
Body: { estado: "pendiente" | "en_progreso" | "completada" }

200 → { id, descripcion, estado, completed_at, asignados: [...] }
400 → { message: "Transición no permitida para tu rol" }
403 → { message: "No tienes permiso para mover esta tarea" }
404 → { message: "Tarea no encontrada" }
```

### Modified Endpoint: updateTask ownership guard

```
PATCH /api/tasks/updateTask/:id
Authorization: Bearer <jwt>

New behavior: if usuario.role !== 'admin', validate user is in task_assignees → 403 if not.
Admin bypasses this check (can edit any task).
```

### Modified Endpoint: getTasks include_deleted

```
GET /api/tasks/getTasks?include_deleted=1&plot_id=?
Authorization: Bearer <jwt>

- include_deleted=1 only effective for admin users
- Non-admin: parameter ignored, always returns only active tasks
- Response includes `deleted_at` field when present
```

### Task type extension (frontend)

```ts
type Task = {
  // ... existing fields
  completed_at?: string  // ISO timestamp or undefined
  deleted_at?: string    // ISO timestamp or undefined (for admin view)
}
```

### Helper: canUserAccessTask

```js
// Returns true if user is admin OR is in task's assignees
const canUserAccessTask = async (conn, taskId, userId, userRole) => {
  if (userRole === 'admin') return true
  const [rows] = await conn.query(
    "SELECT 1 FROM task_assignees WHERE task_id = ? AND user_id = ?",
    [taskId, userId]
  )
  return rows.length > 0
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Transition matrix validation per role | Test each role × current state × target state combination (3 roles × 3 states × 3 targets = 27 cases) |
| Unit | `completed_at` set/cleared logic | Verify NOW() set on → completada, NULL set on ← completada, unchanged otherwise |
| Unit | `canUserAccessTask` helper | Admin always true, assigned true, unassigned false |
| Integration | transitionTask endpoint | Full HTTP request with JWT, verify DB state change, verify response |
| Integration | updateTask with completed_at | PATCH estado to completada, verify completed_at set; PATCH from completada, verify cleared |
| Integration | updateTask ownership guard | Non-admin unassigned → 403; admin unassigned → 200 |
| Integration | getTasks with include_deleted | Admin with param → includes deleted; non-admin → ignores param |
| Integration | deleteTask ownership guard | Non-admin unassigned → 403; admin → 200 |
| E2E | Operario flow: create → start → cannot complete | UI: sees "Iniciar" only, no "Completar" button |
| E2E | Enólogo flow: complete → reopen | UI: sees all buttons, completes, reopens |
| E2E | Edit modal: change description, deadline, assignees | Submit → card updates optimistically |
| E2E | Admin: "ver eliminadas" toggle → shows soft-deleted with opacity-50 | Toggle on/off, verify visibility |
| E2E | Countdown on completed tasks | Mock completed_at, verify "se eliminará en Xh Ym" or "pendiente de eliminación" |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. This change operates entirely within the existing Express API and React SPA.

## Migration / Rollout

### Migration Script (`back/migrations/003_task_state_transitions.sql`)

```sql
-- 1. Add completed_at column
ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP NULL AFTER deleted_at;

-- 2. Backfill existing completed tasks
UPDATE tasks SET completed_at = NOW()
WHERE estado = 'completada' AND completed_at IS NULL;

-- 3. Create auto-cleanup event
DELIMITER //
CREATE EVENT IF NOT EXISTS auto_delete_completed_tasks
ON SCHEDULE EVERY 5 MINUTE
DO
BEGIN
  UPDATE tasks SET deleted_at = NOW()
  WHERE estado = 'completada'
    AND completed_at IS NOT NULL
    AND completed_at < NOW() - INTERVAL 2 HOUR
    AND deleted_at IS NULL;
END //
DELIMITER ;

-- 4. Enable event scheduler (requires SUPER privilege)
SET GLOBAL event_scheduler = ON;
```

### Rollout Steps

1. Run migration on dev → verify `completed_at` column exists, event created, scheduler ON
2. Verify with `SHOW VARIABLES LIKE 'event_scheduler'` → should be `ON`
3. Verify with `SHOW EVENTS FROM <db_name>` → should show `auto_delete_completed_tasks`
4. Deploy backend → new endpoint active
5. Deploy frontend → edit modal, conditional buttons, countdown visible
6. Monitor: check that completed tasks are soft-deleted within 2h ± 5min

### Rollback

1. `DROP EVENT IF EXISTS auto_delete_completed_tasks;`
2. `ALTER TABLE tasks DROP COLUMN completed_at;`
3. Remove `transitionTask` route and handler
4. Revert frontend changes
5. No data loss — soft-deleted tasks remain soft-deleted

## Open Questions

- [ ] Should the migration script be idempotent (check if column exists before ALTER)? Current pattern in `001` and `002` does not include guards.
- [ ] The `SET GLOBAL event_scheduler = ON` requires SUPER privilege — will the deployment user have this? If not, it needs to be a manual step documented in README.
