# Task Auto-Cleanup Specification

## Purpose

Automatically soft-delete tasks that have been in `completada` state for more than 2 hours, using MySQL Event Scheduler with a query-time fallback.

## Requirements

### Requirement: completed_at Column

The system MUST add a `completed_at TIMESTAMP NULL` column to the `tasks` table, positioned after `deleted_at`. The column MUST allow NULL to distinguish tasks that were completed before this feature from those completed after.

#### Scenario: Column added via ALTER TABLE

- GIVEN `tasks` table without `completed_at`
- WHEN `ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP NULL AFTER deleted_at` is applied
- THEN column exists; existing rows have `completed_at = NULL`

### Requirement: MySQL Event Scheduler Job

The system MUST create a MySQL event named `auto_delete_completed_tasks` that runs every 5 minutes. The event MUST soft-delete (set `deleted_at = NOW()`) all tasks where `estado = 'completada'` AND `completed_at < NOW() - INTERVAL 2 HOUR` AND `deleted_at IS NULL`.

#### Scenario: Event deletes expired completed task

- GIVEN task 1 with `estado = 'completada'`, `completed_at = NOW() - INTERVAL 3 HOUR`, `deleted_at = NULL`
- WHEN event scheduler runs
- THEN task 1 has `deleted_at = NOW()` (within ± 5 minutes)

#### Scenario: Event skips recently completed task

- GIVEN task 2 with `estado = 'completada'`, `completed_at = NOW() - INTERVAL 1 HOUR`, `deleted_at = NULL`
- WHEN event scheduler runs
- THEN task 2 `deleted_at` remains `NULL`

#### Scenario: Event skips already-deleted task

- GIVEN task 3 with `estado = 'completada'`, `completed_at = NOW() - INTERVAL 3 HOUR`, `deleted_at` is a past timestamp
- WHEN event scheduler runs
- THEN task 3 `deleted_at` unchanged

#### Scenario: Event skips non-completed tasks

- GIVEN task 4 with `estado = 'en_progreso'`, `completed_at = NOW() - INTERVAL 3 HOUR`
- WHEN event scheduler runs
- THEN task 4 `deleted_at` remains `NULL`

### Requirement: Query-Time Fallback

If MySQL Event Scheduler is not available (`event_scheduler = OFF`), the system MUST check and soft-delete expired completed tasks on every `GET /api/tasks/getTasks` query. The check MUST run before the main SELECT and MUST use the same criteria: `estado = 'completada'` AND `completed_at < NOW() - INTERVAL 2 HOUR` AND `deleted_at IS NULL`.

#### Scenario: Fallback cleans up on list query

- GIVEN event_scheduler is OFF
- GIVEN task 1 is expired completed (`completed_at` 3 hours ago)
- WHEN GET getTasks is called
- THEN task 1 is soft-deleted before results are returned

#### Scenario: Fallback does not double-delete

- GIVEN event_scheduler is OFF
- GIVEN task 1 already has `deleted_at` set
- WHEN GET getTasks is called
- THEN no UPDATE runs on task 1; results returned normally

### Requirement: Existing Completed Tasks Not Auto-Deleted

Tasks that were completed BEFORE the `completed_at` column was added (i.e., `estado = 'completada'` AND `completed_at IS NULL`) MUST NOT be auto-deleted by the event scheduler or the query-time fallback. They require manual cleanup.

#### Scenario: Legacy completed task preserved

- GIVEN task 5 with `estado = 'completada'`, `completed_at = NULL`
- WHEN event scheduler runs
- THEN task 5 is NOT soft-deleted

#### Scenario: Manual backfill required

- GIVEN legacy completed tasks exist
- WHEN admin runs `UPDATE tasks SET completed_at = NOW() WHERE estado = 'completada' AND completed_at IS NULL`
- THEN those tasks become eligible for auto-cleanup after 2 hours from backfill time

### Requirement: Event Scheduler Enablement

The migration notes MUST include `SET GLOBAL event_scheduler = ON` and verification via `SHOW VARIABLES LIKE 'event_scheduler'`. The system MUST document that the event requires MySQL 5.1+.

#### Scenario: Event creation succeeds

- GIVEN MySQL 5.1+ with event_scheduler = ON
- WHEN `CREATE EVENT auto_delete_completed_tasks ON SCHEDULE EVERY 5 MINUTE ...` is executed
- THEN event exists and runs every 5 minutes

#### Scenario: Event creation fails when scheduler off

- GIVEN event_scheduler = OFF
- WHEN `CREATE EVENT auto_delete_completed_tasks` is attempted
- THEN event is created but does not execute until scheduler is enabled
