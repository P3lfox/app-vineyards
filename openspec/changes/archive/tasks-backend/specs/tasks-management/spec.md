# Delta for tasks-management

No test runner — scenarios are manually verifiable via HTTP with a JWT.

## ADDED Requirements

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

### Requirement: List Tasks

`GET /api/tasks/getTasks` MUST return a JSON array ordered by `created_at DESC`, each row including `parcela` (`p.nombre` via `LEFT JOIN plots`) and `fecha` = `DATE_FORMAT(COALESCE(fecha_limite, created_at), '%d/%m/%Y')`. Optional query param `plot_id` MUST filter.

#### Scenario: List with derived fields

- GIVEN a task on plot "Parcela Norte" with `fecha_limite 2026-08-01`
- WHEN GET getTasks
- THEN the row has `parcela:"Parcela Norte"`, `fecha:"01/08/2026"`

#### Scenario: Filter by plot

- GIVEN tasks on plots 1 and 2
- WHEN GET getTasks?plot_id=1
- THEN 200 with only plot-1 tasks

#### Scenario: No plot, no due date

- GIVEN a task with `plot_id NULL`, no `fecha_limite`
- WHEN GET getTasks
- THEN `parcela:null`, `fecha` = `created_at` as `DD/MM/YYYY`

### Requirement: Role-Based Visibility

Non-admin (enólogo, operario) MUST only receive tasks with `deleted_at IS NULL`; admin MUST receive all, including soft-deleted.

#### Scenario: Deleted visibility

- GIVEN a soft-deleted task
- WHEN enólogo/operario lists THEN absent
- WHEN admin lists THEN present with `deleted_at`

### Requirement: Get Single Task

`GET /api/tasks/getTask/:id` MUST return one task (with `parcela`, `fecha`) or 404 `{message}` when absent.

#### Scenario: Found and not found

- WHEN GET getTask/5 (exists) THEN 200
- WHEN GET getTask/9999 THEN 404 `{message}`

### Requirement: Create Task

`POST /api/tasks/createTask` MUST require non-empty `descripcion` (else 400). Optional: `estado` (default `'pendiente'`), `fecha_limite` (DATE), `asignado_a` (free text), `plot_id` (nullable). Empty strings in `fecha_limite`/`asignado_a` MUST coerce to NULL before INSERT (MySQL strict mode). `plot_id`, when present, MUST exist in active `plots` (else 404). The 201 MUST re-SELECT with the JOIN, including `parcela`.

#### Scenario: Empty strings coerced to NULL

- GIVEN body `{descripcion:"Podar", fecha_limite:"", asignado_a:""}`
- WHEN POST createTask
- THEN 201; row has `fecha_limite NULL`, `asignado_a NULL`, `estado 'pendiente'`

#### Scenario: Response carries parcela

- GIVEN plot 2 "Parcela Sur" exists; body has `plot_id:2`
- WHEN POST createTask
- THEN 201 body includes `parcela:"Parcela Sur"`

#### Scenario: Non-existent plot FK

- WHEN POST createTask with `plot_id:9999`
- THEN 404 `{message}`

### Requirement: Update Task

`PATCH /api/tasks/updateTask/:id` MUST apply any subset of `descripcion/estado/fecha_limite/asignado_a/plot_id` (400 if none). `""`→NULL coercion MUST apply. `estado` MUST be `pendiente|en_progreso|completada` (else 400). Missing or soft-deleted tasks MUST 404, never resurrect.

#### Scenario: Partial estado update

- GIVEN active task 3, `estado 'pendiente'`
- WHEN PATCH updateTask/3 with `{estado:"en_progreso"}`
- THEN 200; only `estado` changed

#### Scenario: Invalid estado rejected

- WHEN PATCH updateTask/3 with `{estado:"hecha"}`
- THEN 400 `{message}`; row unchanged

#### Scenario: Soft-deleted task not updatable

- GIVEN task 4 is soft-deleted
- WHEN PATCH updateTask/4 with `{estado:"completada"}`
- THEN 404; `deleted_at` unchanged

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
