# Task State Transitions Specification

## Purpose

Enforce role-gated state transitions on tasks with ownership validation and `completed_at` lifecycle tracking.

## Requirements

### Requirement: State Transition Authorization

The system MUST validate that the requesting user is either (a) listed in `task_assignees` for the target task, OR (b) has `usuario.role = 'admin'`. If neither condition holds, the system MUST return 403 with `{message: "No tienes permiso para mover esta tarea"}`.

#### Scenario: Assigned user can transition

- GIVEN task 5 with assignees [user 2, user 3]
- WHEN user 2 calls transition endpoint for task 5
- THEN 200; estado updated

#### Scenario: Admin can transition any task

- GIVEN task 5 with assignees [user 2]
- WHEN admin calls transition endpoint for task 5
- THEN 200; estado updated

#### Scenario: Unassigned non-admin gets 403

- GIVEN task 5 with assignees [user 2]
- WHEN user 4 (operario, not assigned) calls transition endpoint for task 5
- THEN 403; `{message: "No tienes permiso para mover esta tarea"}`

#### Scenario: Unassigned enólogo gets 403

- GIVEN task 5 with assignees [user 2]
- WHEN user 3 (enólogo, not assigned) calls transition endpoint for task 5
- THEN 403; `{message: "No tienes permiso para mover esta tarea"}`

### Requirement: Operario Transition Constraints

An operario MUST only transition tasks from `pendiente` to `en_progreso`. An operario MUST NOT transition to `completada` or from `en_progreso` to any other state. The system MUST return 400 with `{message}` when the transition violates this rule.

#### Scenario: Operario moves pendiente → en_progreso

- GIVEN task 1 with `estado = 'pendiente'`, user 2 is operario and assigned
- WHEN user 2 transitions task 1 to `en_progreso`
- THEN 200; `estado = 'en_progreso'`

#### Scenario: Operario cannot skip to completada

- GIVEN task 1 with `estado = 'pendiente'`, user 2 is operario and assigned
- WHEN user 2 transitions task 1 to `completada`
- THEN 400; `estado` unchanged

#### Scenario: Operario cannot move from en_progreso

- GIVEN task 1 with `estado = 'en_progreso'`, user 2 is operario and assigned
- WHEN user 2 transitions task 1 to any state
- THEN 400; `estado` unchanged

### Requirement: Enólogo and Admin Transition Freedom

Enólogo and admin roles MAY transition tasks between any valid states (`pendiente`, `en_progreso`, `completada`). The system MUST accept any valid enum value.

#### Scenario: Enólogo completes a task

- GIVEN task 1 with `estado = 'en_progreso'`, user 3 is enólogo and assigned
- WHEN user 3 transitions task 1 to `completada`
- THEN 200; `estado = 'completada'`

#### Scenario: Admin reopens a completed task

- GIVEN task 1 with `estado = 'completada'`
- WHEN admin transitions task 1 to `pendiente`
- THEN 200; `estado = 'pendiente'`; `completed_at` cleared (see completed_at requirement)

### Requirement: completed_at Lifecycle

When a task's `estado` transitions TO `completada`, the system MUST set `completed_at = NOW()`. When a task's `estado` transitions FROM `completada` to any other state, the system MUST set `completed_at = NULL`. The `completed_at` column MUST be `TIMESTAMP NULL`.

#### Scenario: completed_at set on completion

- GIVEN task 1 with `estado = 'en_progreso'`, `completed_at = NULL`
- WHEN task transitions to `completada`
- THEN `completed_at` is set to current timestamp (± 1 second)

#### Scenario: completed_at cleared on reopen

- GIVEN task 1 with `estado = 'completada'`, `completed_at = '2026-07-26 10:00:00'`
- WHEN task transitions to `pendiente`
- THEN `estado = 'pendiente'`; `completed_at = NULL`

#### Scenario: completed_at unchanged on non-completion transitions

- GIVEN task 1 with `estado = 'pendiente'`, `completed_at = NULL`
- WHEN task transitions to `en_progreso`
- THEN `completed_at` remains `NULL`

### Requirement: Transition Endpoint

The system MUST expose `POST /api/tasks/transitionTask/:id` accepting `{estado: 'pendiente' | 'en_progreso' | 'completada'}`. The endpoint MUST sit behind `verificarToken`. Invalid estado values MUST return 400. Missing or soft-deleted tasks MUST return 404.

#### Scenario: Invalid estado rejected

- WHEN POST transitionTask/1 with `{estado: "archivada"}`
- THEN 400; row unchanged

#### Scenario: Soft-deleted task cannot be transitioned

- GIVEN task 4 is soft-deleted
- WHEN POST transitionTask/4 with `{estado: "en_progreso"}`
- THEN 404; `deleted_at` unchanged

### Requirement: updateTask completed_at Integration

The existing `PATCH /api/tasks/updateTask/:id` endpoint MUST also set `completed_at = NOW()` when `estado` is updated to `completada`, and clear `completed_at = NULL` when `estado` changes from `completada` to another state. This applies only when `estado` is present in the request body.

#### Scenario: updateTask sets completed_at

- GIVEN task 3 with `estado = 'pendiente'`, `completed_at = NULL`
- WHEN PATCH updateTask/3 with `{estado: "completada"}`
- THEN 200; `estado = 'completada'`; `completed_at` set to NOW()

#### Scenario: updateTask clears completed_at

- GIVEN task 3 with `estado = 'completada'`, `completed_at` is a past timestamp
- WHEN PATCH updateTask/3 with `{estado: "pendiente"}`
- THEN 200; `estado = 'pendiente'`; `completed_at = NULL`
