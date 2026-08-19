# Task Assignee Management Specification

## Purpose

Manage many-to-many task-to-user assignments via the `task_assignees` junction table, replacing the legacy free-text `asignado_a` column with typed, queryable, multi-assignee support.

## Requirements

### Requirement: Junction Table DDL

The system MUST create a `task_assignees` table appended to `esquemaDb.sql` with this DDL:

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

**Migration note**: `esquemaDb.sql` is gitignored; DDL must be applied manually per environment. The legacy `asignado_a` VARCHAR(150) column remains in `tasks` and is NOT dropped.

#### Scenario: Manual migration succeeds

- GIVEN a dev DB with `tasks` and `users` tables
- WHEN the DDL is applied
- THEN `task_assignees` exists with FK to `tasks(id)` (CASCADE) and `users(id)` (SET NULL)

#### Scenario: Cascade on task hard delete

- GIVEN a task with 3 junction rows
- WHEN the task row is hard-deleted (`DELETE FROM tasks WHERE id = ?`)
- THEN all 3 junction rows are removed automatically

#### Scenario: SET NULL on user deletion

- GIVEN a junction row with `user_id = 5`
- WHEN user 5 is hard-deleted
- THEN `user_id` becomes NULL; junction row persists

### Requirement: Create Task with Assignees

`POST /api/tasks/createTask` MUST accept `asignado_a_ids: number[]` (optional, defaults to `[]`). The endpoint MUST wrap the task INSERT and junction bulk-INSERT in a single transaction. Each `user_id` in the array MUST exist in `users` with `deleted_at IS NULL`; non-existent or soft-deleted user_id MUST return 404. Empty array creates a task with no assignees.

#### Scenario: Create with multiple assignees

- GIVEN active users 1, 2, 3 exist
- WHEN POST createTask with `{descripcion:"Podar fila 1", asignado_a_ids:[1,2,3]}`
- THEN 201; `tasks` has 1 row; `task_assignees` has 3 rows; response includes `asignados:[{id:1,nombre,apellido,rol},{id:2,...},{id:3,...}]`

#### Scenario: Create with no assignees

- WHEN POST createTask with `{descripcion:"Regar", asignado_a_ids:[]}`
- THEN 201; no junction rows; response `asignados:[]`

#### Scenario: Create omitting asignado_a_ids

- WHEN POST createTask with `{descripcion:"Podar"}` (no `asignado_a_ids` field)
- THEN 201; no junction rows; response `asignados:[]`

#### Scenario: Non-existent user_id returns 404

- WHEN POST createTask with `{descripcion:"Podar", asignado_a_ids:[9999]}`
- THEN 404 `{message}`; no task row inserted; no junction rows

#### Scenario: Soft-deleted user_id returns 404

- GIVEN user 5 has `deleted_at IS NOT NULL`
- WHEN POST createTask with `{descripcion:"Podar", asignado_a_ids:[5]}`
- THEN 404 `{message}`; no task row inserted

#### Scenario: Transaction rollback on duplicate assignee

- GIVEN unique constraint on `(task_id, user_id)`
- WHEN POST createTask with `{descripcion:"Podar", asignado_a_ids:[1,1]}` (duplicate)
- THEN 400 or 500; transaction rolls back; no task or junction rows persist

### Requirement: Get Task(s) with Assignees

`GET /api/tasks/getTasks` and `GET /api/tasks/getTask/:id` MUST LEFT JOIN `task_assignees` → `users` and aggregate assignees into `asignados: [{id, nombre, apellido, rol}, ...]`. The legacy `asignado_a` column is NOT read for new responses. Tasks with no junction rows return `asignados:[]`.

#### Scenario: List tasks with assignee aggregation

- GIVEN task 1 assigned to users 1 and 2; task 2 with no assignees
- WHEN GET getTasks
- THEN task 1 has `asignados:[{id:1,...},{id:2,...}]`; task 2 has `asignados:[]`

#### Scenario: Single task with assignees

- GIVEN task 5 assigned to user 3 ("Juan Pérez", rol "enólogo")
- WHEN GET getTask/5
- THEN 200; `asignados:[{id:3,nombre:"Juan",apellido:"Pérez",rol:"enólogo"}]`

#### Scenario: Legacy task with no junction rows

- GIVEN a legacy task with `asignado_a = "Juan"` but zero junction rows
- WHEN GET getTask/{legacy_id}
- THEN 200; `asignados:[]`; legacy `asignado_a` value is ignored

### Requirement: Update Task Assignees

`PATCH /api/tasks/updateTask/:id` MUST accept `asignado_a_ids: number[]`. When present, the endpoint MUST DELETE all existing junction rows for the task and bulk-INSERT new rows in a transaction. User validation (existence + not soft-deleted) applies per createTask rules. Other task fields update as before.

#### Scenario: Replace all assignees

- GIVEN task 3 assigned to users [1, 2]
- WHEN PATCH updateTask/3 with `{asignado_a_ids:[2, 3]}`
- THEN junction rows for (3,1) deleted; (3,2) kept; (3,3) inserted; response 200

#### Scenario: Clear all assignees

- GIVEN task 3 assigned to users [1, 2]
- WHEN PATCH updateTask/3 with `{asignado_a_ids:[]}`
- THEN all junction rows for task 3 deleted; 200

#### Scenario: Update other fields without changing assignees

- GIVEN task 3 with assignees [1]
- WHEN PATCH updateTask/3 with `{estado:"en_progreso"}` (no `asignado_a_ids`)
- THEN `estado` updated; junction rows unchanged

### Requirement: Frontend Multi-Select

The Tasks page MUST replace the `asignado_a` text input with a multi-select of active users. The form MUST send `asignado_a_ids: number[]`. Task cards MUST render each assignee as a badge (`{nombre} {apellido}`) instead of free text.

#### Scenario: Admin sees all active users in selector

- GIVEN 5 active users exist
- WHEN admin opens task form
- THEN multi-select shows all 5 users

#### Scenario: Non-admin sees limited user list

- GIVEN `GET /api/users/getUsers` returns only self for non-admin
- WHEN enólogo opens task form
- THEN multi-select shows only the enólogo's own user (current behavior)

#### Scenario: Card displays assignee badges

- GIVEN task with assignees [{nombre:"Ana",apellido:"García"}, {nombre:"Luis",apellido:"Díaz"}]
- WHEN task card renders
- THEN two badges shown: "Ana García" and "Luis Díaz"

### Requirement: Non-Admin User List Limitation

The system SHOULD note that `GET /api/users/getUsers` returns only the requesting user for non-admin roles. If cross-assignment (assigning tasks to other users) is required for enólogo/operario roles, a lightweight `GET /api/users/active` endpoint returning all active users (id, nombre, apellido, rol) MUST be added.

#### Scenario: Current limitation documented

- GIVEN non-admin calls getUsers
- WHEN response contains only self
- THEN assignee dropdown is limited to self; no cross-assignment possible
