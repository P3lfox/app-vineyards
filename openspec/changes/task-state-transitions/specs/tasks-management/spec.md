# Delta for Tasks Management

## ADDED Requirements

### Requirement: Admin "Ver Eliminadas" Toggle

The Tasks page MUST display a "Ver eliminadas" toggle visible only to admin users. When enabled, soft-deleted tasks MUST appear in the kanban board (visually distinguished, e.g., `opacity-50`). When disabled, only active tasks are shown.

#### Scenario: Admin toggles deleted visibility

- GIVEN admin is on Tasks page with 3 active and 2 soft-deleted tasks
- WHEN admin enables "Ver eliminadas"
- THEN all 5 tasks are shown; deleted tasks appear with `opacity-50`

#### Scenario: Non-admin does not see toggle

- GIVEN enólogo is on Tasks page
- WHEN page renders
- THEN "Ver eliminadas" toggle is NOT visible

### Requirement: Auto-Delete Countdown Indicator

Task cards with `estado = 'completada'` and a valid `completed_at` MUST display a countdown indicator showing time remaining until auto-deletion (e.g., "se eliminará en 1h 23m"). When `completed_at` is older than 2 hours, the indicator MUST show "pendiente de eliminación". If `completed_at` is NULL, no indicator is shown.

#### Scenario: Countdown shows remaining time

- GIVEN task with `estado = 'completada'`, `completed_at` = 1 hour ago
- WHEN card renders
- THEN indicator shows "se eliminará en ~1h"

#### Scenario: Expired completed task shows pending deletion

- GIVEN task with `estado = 'completada'`, `completed_at` = 3 hours ago
- WHEN card renders
- THEN indicator shows "pendiente de eliminación"

#### Scenario: Legacy completed task shows no indicator

- GIVEN task with `estado = 'completada'`, `completed_at = NULL`
- WHEN card renders
- THEN no countdown indicator is shown

## MODIFIED Requirements

### Requirement: Role-Based Visibility

Non-admin (enólogo, operario) MUST only receive tasks with `deleted_at IS NULL`; admin MUST receive all, including soft-deleted. The GET endpoint MUST accept an optional `include_deleted=1` query parameter; when present and the user is admin, soft-deleted tasks are included in the response.

(Previously: No `include_deleted` parameter existed; admin always received deleted tasks without opt-in)

#### Scenario: Deleted visibility

- GIVEN a soft-deleted task
- WHEN enólogo/operario lists THEN absent
- WHEN admin lists THEN present with `deleted_at`

#### Scenario: Admin opts into deleted tasks

- GIVEN 3 active tasks and 2 soft-deleted tasks
- WHEN admin calls GET getTasks?include_deleted=1
- THEN 200 with all 5 tasks

#### Scenario: Non-admin include_deleted is ignored

- GIVEN enólogo calls GET getTasks?include_deleted=1
- THEN only active tasks returned; parameter has no effect

### Requirement: Delete Task (Soft)

`DELETE /api/tasks/deleteTask/:id` MUST set `deleted_at = NOW()` (leaf — no cascade) and return 200 `{message}`. The delete button MUST only be visible to users who are (a) listed in the task's `asignados` array, OR (b) have `usuario.role = 'admin'`.

(Previously: Delete button visibility was not specified per assignment; now explicitly gated)

#### Scenario: Assigned user can delete

- GIVEN task with assignees [user 2], user 2 is operario
- WHEN user 2 clicks delete
- THEN 200; task soft-deleted

#### Scenario: Admin can delete any task

- GIVEN task with assignees [user 2]
- WHEN admin clicks delete
- THEN 200; task soft-deleted

#### Scenario: Unassigned non-admin cannot delete

- GIVEN task with assignees [user 2]
- WHEN user 5 (operario, not assigned) views the card
- THEN delete button is NOT visible

### Requirement: Update Task

`PATCH /api/tasks/updateTask/:id` MUST apply any subset of `descripcion/estado/fecha_limite/plot_id` (400 if none). `""`→NULL coercion MUST apply. `estado` MUST be `pendiente|en_progreso|completada` (else 400). Missing or soft-deleted tasks MUST 404, never resurrect. If `asignado_a_ids` is present, DELETE all existing junction rows for the task and bulk-INSERT new rows in a transaction; each `user_id` MUST exist and be active (else 404). If `asignado_a_ids` is absent, junction rows are untouched. When `estado` is set to `completada`, `completed_at` MUST be set to `NOW()`. When `estado` changes FROM `completada` to another state, `completed_at` MUST be set to `NULL`.

(Previously: No `completed_at` lifecycle was specified in updateTask)

#### Scenario: Partial estado update

- GIVEN active task 3, `estado 'pendiente'`, `completed_at = NULL`
- WHEN PATCH updateTask/3 with `{estado:"en_progreso"}`
- THEN 200; only `estado` changed; `completed_at` remains `NULL`; junction rows unchanged

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

#### Scenario: Completing a task sets completed_at

- GIVEN task 5 with `estado = 'pendiente'`, `completed_at = NULL`
- WHEN PATCH updateTask/5 with `{estado:"completada"}`
- THEN 200; `estado = 'completada'`; `completed_at` set to current timestamp

#### Scenario: Reopening a task clears completed_at

- GIVEN task 5 with `estado = 'completada'`, `completed_at` is a past timestamp
- WHEN PATCH updateTask/5 with `{estado:"pendiente"}`
- THEN 200; `estado = 'pendiente'`; `completed_at = NULL`

### Requirement: State Transition Visibility (Move Buttons)

The kanban board MUST render move/state-transition buttons (e.g., "Iniciar", "Completar") only for users who are (a) listed in the task's `asignados` array, OR (b) have `usuario.role = 'admin'`. Operarios MUST only see the "Iniciar" button (pendiente → en_progreso) when the task is in `pendiente` state. Enólogos and admins MUST see all applicable transition buttons.

#### Scenario: Operario sees only "Iniciar" on pending task

- GIVEN operario is assigned to task with `estado = 'pendiente'`
- WHEN card renders
- THEN only "Iniciar" button is visible

#### Scenario: Operario sees no move buttons on in-progress task

- GIVEN operario is assigned to task with `estado = 'en_progreso'`
- WHEN card renders
- THEN no move buttons are visible (cannot complete)

#### Scenario: Enólogo sees all transition buttons

- GIVEN enólogo is assigned to task with `estado = 'en_progreso'`
- WHEN card renders
- THEN "Completar" button is visible

#### Scenario: Unassigned user sees no move buttons

- GIVEN user 5 is not assigned to task 3
- WHEN user 5 views card for task 3
- THEN no move buttons are visible
