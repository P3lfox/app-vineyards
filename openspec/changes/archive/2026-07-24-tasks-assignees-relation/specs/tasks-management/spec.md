# Delta for tasks-management

## ADDED Requirements

### Requirement: Junction Table DDL

The system MUST create a `task_assignees` table (see `task-assignee-management` spec for full DDL). The legacy `asignado_a` VARCHAR(150) column remains in `tasks` and is NOT dropped.

#### Scenario: Manual migration

- GIVEN a dev DB without `task_assignees`
- WHEN the DDL is applied
- THEN all task endpoints below succeed with `asignados` array responses

## MODIFIED Requirements

### Requirement: Create Task

`POST /api/tasks/createTask` MUST require non-empty `descripcion` (else 400). Optional: `estado` (default `'pendiente'`), `fecha_limite` (DATE), `plot_id` (nullable), `asignado_a_ids` (number[], defaults to `[]`). Empty strings in `fecha_limite` MUST coerce to NULL. `plot_id`, when present, MUST exist in active `plots` (else 404). Each `user_id` in `asignado_a_ids` MUST exist in `users` with `deleted_at IS NULL` (else 404). The endpoint MUST wrap task INSERT + junction bulk-INSERT in a transaction. The 201 MUST re-SELECT with JOINs, including `parcela` and `asignados: [{id, nombre, apellido, rol}, ...]`.
(Previously: accepted `asignado_a` free-text string, no transaction, no junction inserts)

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

### Requirement: List Tasks

`GET /api/tasks/getTasks` MUST return a JSON array ordered by `created_at DESC`, each row including `parcela` (`p.nombre` via `LEFT JOIN plots`), `fecha` = `DATE_FORMAT(COALESCE(fecha_limite, created_at), '%d/%m/%Y')`, and `asignados: [{id, nombre, apellido, rol}, ...]` aggregated via LEFT JOIN `task_assignees` → `users`. Optional query param `plot_id` MUST filter. The legacy `asignado_a` column is NOT included in responses.
(Previously: returned `asignado_a` VARCHAR string, no assignee aggregation)

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

### Requirement: Get Single Task

`GET /api/tasks/getTask/:id` MUST return one task (with `parcela`, `fecha`, `asignados`) or 404 `{message}` when absent. The `asignados` array is built from LEFT JOIN `task_assignees` → `users`.
(Previously: returned `asignado_a` VARCHAR string)

#### Scenario: Found and not found

- WHEN GET getTask/5 (exists) THEN 200 with `asignados` array
- WHEN GET getTask/9999 THEN 404 `{message}`

### Requirement: Update Task

`PATCH /api/tasks/updateTask/:id` MUST apply any subset of `descripcion/estado/fecha_limite/plot_id` (400 if none). `""`→NULL coercion MUST apply. `estado` MUST be `pendiente|en_progreso|completada` (else 400). Missing or soft-deleted tasks MUST 404, never resurrect. If `asignado_a_ids` is present, DELETE all existing junction rows for the task and bulk-INSERT new rows in a transaction; each `user_id` MUST exist and be active (else 404). If `asignado_a_ids` is absent, junction rows are untouched.
(Previously: accepted `asignado_a` free-text string, no junction handling)

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

## REMOVED Requirements

### Requirement: Create Task — asignado_a free-text field

(Reason: Replaced by junction-based `asignado_a_ids` array for typed, multi-assignee support)
(Migration: Frontend form sends `asignado_a_ids: number[]` instead of `asignado_a: string`. Backend no longer reads or writes `asignado_a` on create.)

### Requirement: Update Task — asignado_a free-text field

(Reason: Replaced by junction-based `asignado_a_ids` array)
(Migration: Backend ignores `asignado_a` in PATCH body; uses `asignado_a_ids` for junction replacement.)
