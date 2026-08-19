-- Task State Transitions: completed_at column + auto-cleanup event
-- Migration 003

-- 1. Add completed_at column to track when a task was marked as completed
ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP NULL AFTER deleted_at;

-- 2. Backfill: set completed_at = NOW() for tasks already in 'completada' state
UPDATE tasks SET completed_at = NOW() WHERE estado = 'completada' AND completed_at IS NULL;

-- 3. Enable event scheduler (requires SUPER privilege — run once as DBA)
-- SET GLOBAL event_scheduler = ON;

-- 4. Auto-delete completed tasks after 2 hours
CREATE EVENT IF NOT EXISTS auto_delete_completed_tasks
ON SCHEDULE EVERY 5 MINUTE
DO
  UPDATE tasks
  SET deleted_at = NOW()
  WHERE estado = 'completada'
    AND completed_at < NOW() - INTERVAL 2 HOUR
    AND deleted_at IS NULL;
