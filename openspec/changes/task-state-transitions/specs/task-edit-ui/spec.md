# Task Edit UI Specification

## Purpose

Provide an inline edit modal on task cards allowing assigned users and admins to modify task description, deadline, and assignees after creation.

## Requirements

### Requirement: Edit Button Visibility

Each task card MUST display an "Editar" button if and only if the current user is (a) listed in the task's `asignados` array, OR (b) has `usuario.role = 'admin'`. The button MUST NOT be visible to unassigned non-admin users.

#### Scenario: Assigned user sees edit button

- GIVEN task card with `asignados: [{id: 2, nombre: "Ana"}]`
- WHEN user 2 views the kanban board
- THEN "Editar" button is visible on the card

#### Scenario: Admin sees edit button on any task

- GIVEN task card with `asignados: [{id: 2}]`
- WHEN admin views the kanban board
- THEN "Editar" button is visible on the card

#### Scenario: Unassigned non-admin does not see edit button

- GIVEN task card with `asignados: [{id: 2}]`
- WHEN user 5 (operario, not assigned) views the kanban board
- THEN "Editar" button is NOT visible

### Requirement: Edit Modal Fields

The edit modal MUST allow changing: `descripcion` (text area), `fecha_limite` (date picker, nullable), and `asignados` (multi-select of active users). The modal MUST pre-fill all fields with current task values.

#### Scenario: Modal pre-fills with current values

- GIVEN task with `descripcion: "Podar fila 1"`, `fecha_limite: "2026-08-01"`, `asignados: [user 2, user 3]`
- WHEN user opens edit modal
- THEN description shows "Podar fila 1", date shows 2026-08-01, multi-select has users 2 and 3 checked

#### Scenario: fecha_limite can be cleared

- GIVEN task with `fecha_limite: "2026-08-01"`
- WHEN user clears the date field in edit modal and submits
- THEN PATCH sends `fecha_limite: ""` (coerced to NULL on backend)

### Requirement: Edit Submission

The modal MUST submit via `PATCH /api/tasks/updateTask/:id` with `{descripcion, fecha_limite, asignado_a_ids}`. Empty strings in `fecha_limite` MUST be sent as `""` (backend coerces to NULL). The `asignado_a_ids` array MUST contain the selected user IDs.

#### Scenario: Edit description only

- GIVEN user changes only descripcion in modal
- WHEN submit
- THEN PATCH sends `{descripcion: "new text"}`; other fields unchanged

#### Scenario: Edit assignees only

- GIVEN user changes only assignees in modal
- WHEN submit
- THEN PATCH sends `{asignado_a_ids: [1, 3]}`; existing assignees replaced per updateTask contract

### Requirement: Optimistic Update

After successful edit submission, the task MUST update optimistically in local state without requiring a full refetch. The UI MUST reflect new `descripcion`, `fecha_limite` (formatted as `fecha`), and `asignados` badges immediately.

#### Scenario: Card updates after edit

- GIVEN task card shows "Podar fila 1"
- WHEN user edits to "Podar fila 2" and submits
- THEN card immediately shows "Podar fila 2" without page reload

#### Scenario: Assignee badges update after edit

- GIVEN task card shows badges for users [2, 3]
- WHEN user edits assignees to [1, 3] and submits
- THEN card shows badges for users [1, 3] immediately

### Requirement: Admin Edit Any Task

Admin users MAY edit any task regardless of assignment. Non-admin users MAY only edit tasks they are assigned to. This MUST be enforced both in UI (button visibility) and on the backend (existing updateTask authorization must be extended or a new guard added).

#### Scenario: Admin edits unassigned task

- GIVEN task with no assignees
- WHEN admin opens edit modal and changes descripcion
- THEN PATCH succeeds; task updated

#### Scenario: Non-admin cannot edit unassigned task

- GIVEN task with no assignees
- WHEN operario attempts to edit (bypassing UI)
- THEN backend returns 403 (authorization guard required)
