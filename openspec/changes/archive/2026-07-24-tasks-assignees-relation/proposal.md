# Proposal: Replace Free-Text Task Assignee with Many-to-Many User Relation

## Intent

The `tasks.asignado_a` column is a free-text `VARCHAR(150)` with no referential integrity, no validation against actual users, and no support for multi-assignee tasks. Replace it with a proper junction table `task_assignees` so assignments are typed, queryable, and support zero-to-many users per task.

## Scope

### In Scope
- DDL for `task_assignees` junction table (manual migration per environment)
- Backend: `createTask`, `getTask`, `getTasks`, `updateTask` — replace `asignado_a` string handling with junction inserts/LEFT JOINs
- Frontend: Replace text input with multi-select of active users; card display shows user badges instead of free text
- API contract: `asignado_a: string` → `asignados: { id, nombre, apellido, rol }[]` in responses; `asignado_a_ids: number[]` in create/update payloads

### Out of Scope
- Migration of legacy `asignado_a` free-text values into the junction table (legacy data stays as-is)
- Audit trail on assignee changes (simple junction, no history)
- Assignment restrictions (self-assignment allowed, all roles can assign)
- Removing the `asignado_a` column from the `tasks` table (kept for backward compat with legacy data)

## Capabilities

### New Capabilities
- `task-assignee-management`: Many-to-many relationship between tasks and users via `task_assignees` junction table, with CRUD support in the tasks API and multi-select UI.

### Modified Capabilities
- `tasks-management`: Response shape changes (`asignado_a` string → `asignados` array), create/update payloads change (`asignado_a` string → `asignado_a_ids` number[]), listing queries need LEFT JOIN + aggregation to build assignee arrays.

## Approach

**Database**: Create `task_assignees(id PK, task_id FK→tasks(id) ON DELETE CASCADE, user_id INT UNSIGNED NULL FK→users(id) ON DELETE SET NULL, created_at, UNIQUE(task_id, user_id))`. The `asignado_a` column remains in `tasks` for legacy data but is no longer written by new task operations.

**Backend** (pattern: `vineyards.controller.js` junction bulk-insert):
- `createTask`: Transaction — INSERT task, then bulk-INSERT junction rows with flattened values array. Return task with `asignados` aggregated via subquery or second query.
- `getTask`/`getTasks`: LEFT JOIN `task_assignees` → `users`, aggregate into JSON array (or application-level grouping). Admin sees all; non-admin filters by `deleted_at`.
- `updateTask`: If `asignado_a_ids` present, DELETE existing junction rows for task + bulk-INSERT new rows in transaction. Other fields update as before.
- `deleteTask`: `ON DELETE CASCADE` on `task_assignees` handles cleanup automatically.
- `restoreTask`: No junction changes needed (cascade only fires on hard delete).

**Frontend**:
- Fetch active users via existing `GET /api/users/getUsers` (admin gets all active, non-admin gets self — sufficient for assignee selection).
- Replace `<input name="asignado_a">` with a multi-select component (native `<select multiple>` or custom badge-based selector).
- Form submits `asignado_a_ids: number[]` instead of `asignado_a: string`.
- Card display: render each assignee as a badge (`{nombre} {apellido}`) instead of free text.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `esquemaDb.sql` | New | `task_assignees` DDL appended |
| `back/src/controllers/tasks.controller.js` | Modified | All 5 endpoints: junction inserts, LEFT JOIN aggregation, transaction wrapping |
| `back/src/routes/tasks.routes.js` | Unchanged | Routes stay the same; only payload/response shape changes |
| `front/vineyards/src/pages/Tasks.tsx` | Modified | Form: text → multi-select; cards: text → badges; payload: `asignado_a_ids` |
| `front/vineyards/src/services/api.ts` | Unchanged | Axios client unchanged; payload shape handled in component |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| API contract break: frontend expects `asignado_a` string, now receives `asignados` array | High | Frontend is the only consumer; update both in same change. No external clients. |
| Legacy tasks with `asignado_a` populated but no junction rows show empty assignees | Medium | Acceptable — legacy data is frozen. UI shows nothing for old tasks. |
| `getTasks` performance: LEFT JOIN + aggregation per row on large task sets | Low | Tasks table is small (<1000 rows). If it grows, add index on `task_assignees(task_id)`. |
| Non-admin users see limited user list for assignment (only themselves) | Medium | Current `getUsers` for non-admin returns only self. Consider adding a lightweight `GET /api/users/active` endpoint if cross-assignment is needed. |

## Rollback Plan

1. Revert frontend: restore text input for `asignado_a`, revert card display to show `asignado_a` string.
2. Revert backend: restore original controller methods that read/write `asignado_a` VARCHAR.
3. Keep `task_assignees` table in place (harmless if unused) or drop it manually.
4. No data migration needed — `asignado_a` column was never removed.

## Dependencies

- `esquemaDb.sql` is gitignored — DDL must be applied manually per environment (dev, staging, prod).
- No new npm packages required.
- Existing `GET /api/users/getUsers` endpoint reused for user selection (admin gets full list, non-admin gets self only).

## Success Criteria

- [ ] Creating a task with multiple assignees stores one junction row per assignee
- [ ] `GET /api/tasks/getTasks` returns each task with `asignados: [{ id, nombre, apellido, rol }, ...]`
- [ ] Updating a task's assignees replaces all junction rows (no orphaned rows)
- [ ] Deleting a task cascades to `task_assignees` (no orphaned rows)
- [ ] Frontend form shows multi-select of users, sends `asignado_a_ids` array
- [ ] Frontend cards display assignee badges instead of free text
- [ ] Legacy tasks with `asignado_a` populated still render without errors
