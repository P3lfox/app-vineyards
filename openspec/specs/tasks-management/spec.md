# Tasks Management Specification

## Purpose

Manage the lifecycle of agricultural tasks (create, list, update, delete, restore) with multi-assignee support via the `task_assignees` junction table.

## Requirements

### Requirement: Tasks Database Schema

The system MUST persist tasks in a `tasks` table with this DDL, appended to `esquemaDb.sql` (gitignored):

```sql
CREATE TABLE tasks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  descripcion TEXT NOT NULL,
  estado ENUM('pendiente','en_progreso','completada') NOT NULL DEFAULT 'pendiente',
  fecha_limite DATE NULL,
  asignado_a VARCHAR(150) NULL,
  plot_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (plot_id) REFERENCES plots(id)
) ENGINE=InnoDB;
```

#### Scenario: Manual migration

- GIVEN a dev DB without `tasks`
- WHEN the DDL is applied
- THEN all endpoints below succeed

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

### Requirement: List Tasks

`GET /api/tasks/getTasks` MUST return a JSON array ordered by `created_at DESC`, each row including `parcela` (`p.nombre` via `LEFT JOIN plots`), `fecha` = `DATE_FORMAT(COALESCE(fecha_limite, created_at), '%d/%m/%Y')`, and `asignados: [{id, nombre, apellido, rol}, ...]` aggregated via LEFT JOIN `task_assignees` → `users`. Optional query param `plot_id` MUST filter. The legacy `asignado_a` column is NOT included in responses.

#### Scenario: List with derived fields

- GIVEN a task on plot "Parcela Norte" with `fecha_limite 2026-08-01`
- WHEN GET getTasks
- THEN the row has `parcela:"Parcela Norte"`, `fecha:"01/08/2026"`, `asignados:[]`

#### Scenario: Filter by plot

- GIVEN tasks on plots 1 and 2
- WHEN GET getTasks?plot_id=1
- THEN 200 with only plot-1 tasks

#### Scenario: No plot, no due date

- GIVEN a task with `plot_id NULL`, no `fecha_limite`
- WHEN GET getTasks
- THEN `parcela:null`, `fecha` = `created_at` as `DD/MM/YYYY`, `asignados:[]`

### Requirement: Role-Based Visibility

Non-admin (enólogo, operario) MUST only receive tasks with `deleted_at IS NULL`; admin MUST receive all, including soft-deleted.

#### Scenario: Deleted visibility

- GIVEN a soft-deleted task
- WHEN enólogo/operario lists THEN absent
- WHEN admin lists THEN present with `deleted_at`

### Requirement: Get Single Task

`GET /api/tasks/getTask/:id` MUST return one task (with `parcela`, `fecha`, `asignados`) or 404 `{message}` when absent. The `asignados` array is built from LEFT JOIN `task_assignees` → `users`.

#### Scenario: Found and not found

- WHEN GET getTask/5 (exists) THEN 200 with `asignados` array
- WHEN GET getTask/9999 THEN 404 `{message}`

### Requirement: Create Task

`POST /api/tasks/createTask` MUST require non-empty `descripcion` (else 400). Optional: `estado` (default `'pendiente'`), `fecha_limite` (DATE), `plot_id` (nullable), `asignado_a_ids` (number[], defaults to `[]`). Empty strings in `fecha_limite` MUST coerce to NULL. `plot_id`, when present, MUST exist in active `plots` (else 404). Each `user_id` in `asignado_a_ids` MUST exist in `users` with `deleted_at IS NULL` (else 404). The endpoint MUST wrap task INSERT + junction bulk-INSERT in a transaction. The 201 MUST re-SELECT with JOINs, including `parcela` and `asignados: [{id, nombre, apellido, rol}, ...]`.

#### Scenario: Empty strings coerced to NULL

- GIVEN body `{descripcion:"Podar", fecha_limite:""}`
- WHEN POST createTask
- THEN 201; row has `fecha_limite NULL`, `asignados:[]`

#### Scenario: Response carries parcela

- GIVEN plot 2 "Parcela Sur" exists; body has `plot_id:2`
- WHEN POST createTask
- THEN 201 body includes `parcela:"Parcela Sur"`

#### Scenario: Non-existent plot FK

- WHEN POST createTask with `plot_id:9999`
- THEN 404 `{message}`

#### Scenario: Create with multiple assignees

- GIVEN active users 1, 2 exist
- WHEN POST createTask with `{descripcion:"Podar", asignado_a_ids:[1,2]}`
- THEN 201; `asignados:[{id:1,...},{id:2,...}]`; 2 junction rows inserted

### Requirement: Update Task

`PATCH /api/tasks/updateTask/:id` MUST apply any subset of `descripcion/estado/fecha_limite/plot_id` (400 if none). `""`→NULL coercion MUST apply. `estado` MUST be `pendiente|en_progreso|completada` (else 400). Missing or soft-deleted tasks MUST 404, never resurrect. If `asignado_a_ids` is present, DELETE all existing junction rows for the task and bulk-INSERT new rows in a transaction; each `user_id` MUST exist and be active (else 404). If `asignado_a_ids` is absent, junction rows are untouched.

#### Scenario: Partial estado update

- GIVEN active task 3, `estado 'pendiente'`
- WHEN PATCH updateTask/3 with `{estado:"en_progreso"}`
- THEN 200; only `estado` changed; junction rows unchanged

#### Scenario: Invalid estado rejected

- WHEN PATCH updateTask/3 with `{estado:"hecha"}`
- THEN 400 `{message}`; row unchanged

#### Scenario: Soft-deleted task not updatable

- GIVEN task 4 is soft-deleted
- WHEN PATCH updateTask/4 with `{estado:"completada"}`
- THEN 404; `deleted_at` unchanged

#### Scenario: Replace assignees

- GIVEN task 3 assigned to users [1, 2]
- WHEN PATCH updateTask/3 with `{asignado_a_ids:[3]}`
- THEN 200; junction rows for (3,1) and (3,2) deleted; (3,3) inserted

### Requirement: Delete Task (Soft)

`DELETE /api/tasks/deleteTask/:id` MUST set `deleted_at = NOW()` (leaf — no cascade) and return 200 `{message}`.

#### Scenario: Soft delete visibility

- GIVEN active task 3
- WHEN DELETE deleteTask/3
- THEN 200; hidden from non-admin, visible to admin

### Requirement: Restore Task

`PATCH /api/tasks/restoreTask/:id` MUST clear `deleted_at` and return 200 `{message}`.

#### Scenario: Restore reappears

- GIVEN soft-deleted task 3
- WHEN PATCH restoreTask/3
- THEN 200; `deleted_at NULL`; visible to all roles

### Requirement: Authentication and Error Shape

All `/api/tasks/*` routes MUST sit behind `verificarToken` (401 unauthenticated). Errors MUST be JSON `{message}` with 400/404/500 per existing controllers.

#### Scenario: No JWT

- WHEN GET getTasks without `Authorization: Bearer`
- THEN 401 `{message}`
