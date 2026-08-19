# Design: Replace Free-Text Task Assignee with Many-to-Many User Relation

## Technical Approach

Create `task_assignees` junction table. Backend wraps junction ops in transactions, returns `asignados` arrays. Frontend swaps text input for multi-select, renders badges. Legacy `asignado_a` column preserved.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|---------|----------|--------|
| User list for dropdown | (a) New `GET /api/users/active` (b) Modify `getUsers` (c) Reuse existing | (b) breaks role contract; (c) defeats multi-assignee | (a) Dedicated endpoint — explicit, no side effects |
| `getTasks` aggregation | (a) Two-query (b) LEFT JOIN + GROUP BY (c) Correlated subquery | (b) GROUP BY edge cases; (c) N+1 | (a) Matches `vineyards.controller.js` pattern |
| User validation | (a) Pre-validate before transaction (b) Let constraints catch (c) Inside transaction | (b) unclear errors; (c) rollback overhead | (a) Single `IN()` query fails fast with 404 |
| Duplicate user_id | (a) Frontend + backend dedup (b) UNIQUE constraint only | (b) requires parsing SQL error codes | (a) `new Set()` dedup; UNIQUE as safety net |

## Junction Table DDL

```sql
CREATE TABLE task_assignees (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  task_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_task_user (task_id, user_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
```

**Migration**: `esquemaDb.sql` gitignored — apply manually per env. `asignado_a` NOT dropped.

**ON DELETE**: CASCADE on hard delete only (soft-delete preserves rows). SET NULL on user hard-delete preserves record.

## Data Flow

```
createTask:  validate users → BEGIN → INSERT task → bulk INSERT junction → COMMIT → re-SELECT → 201
updateTask:  validate task + users → BEGIN → DELETE junction → INSERT junction → UPDATE task → COMMIT → 200
getTasks:    Q1: tasks LEFT JOIN plots → Q2: assignees WHERE task_id IN (...) → merge in JS
getTask/:id:  LEFT JOIN task_assignees → users → build asignados
deleteTask:  soft-delete only — CASCADE does NOT fire (junction rows persist)
restoreTask: no changes needed (rows survived soft-delete)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `esquemaDb.sql` | Manual | Append `task_assignees` DDL |
| `back/src/controllers/tasks.controller.js` | Modify | Transaction + validation + bulk-insert + aggregation |
| `back/src/controllers/users.controller.js` | Modify | Add `getActiveUsers()` |
| `back/src/routes/users.routes.js` | Modify | Register `GET /active` |
| `back/src/routes/tasks.routes.js` | Unchanged | — |
| `front/vineyards/src/pages/Tasks.tsx` | Modify | Multi-select, badges, `asignado_a_ids` payload |

## Interfaces / Contracts

**`GET /api/users/active`** → `[{id, nombre, apellido, rol}, ...]` (all active, no role filter)

**Task response**: gains `asignados: [{id, nombre, apellido, rol}, ...]`, loses `asignado_a`. Empty when none.

**Create/Update payload**: `asignado_a_ids: number[]` (optional). Absent = junction untouched; present = junction replaced.

**Frontend types**:
```typescript
type Task = { ...; asignados?: { id: number; nombre: string; apellido: string; rol: string }[] }
type UserOption = { id: number; nombre: string; apellido: string; rol: string }
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Manual HTTP | Create 0/1/3 assignees | POST, verify 201 + junction rows |
| Manual HTTP | Bad user_id (missing/deleted) | POST, verify 404 + no rows |
| Manual HTTP | Duplicate user_id | POST `[1,1]`, verify error + rollback |
| Manual HTTP | List with aggregation | GET getTasks, verify `asignados` per task |
| Manual HTTP | Update replace/clear/skip | PATCH with various `asignado_a_ids` |
| Manual HTTP | Delete cascade / restore | Soft-delete + restore, verify rows survive |
| Manual HTTP | `GET /api/users/active` | All active users, 4 fields |
| Frontend | Multi-select, badges, payload | Open form, create, inspect network |
| TypeScript | Types compile | `npx tsc -b` |
| Linter | No new violations | `npm run lint` |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

1. Manual DDL per environment
2. Deploy backend + `GET /api/users/active`
3. Deploy frontend (multi-select + badges)
4. No data migration — legacy `asignado_a` ignored
5. Rollback: revert to text input + original backend

## Open Questions

- None
