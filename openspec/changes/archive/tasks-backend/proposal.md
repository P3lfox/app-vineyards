# Proposal: Tasks Backend

## Intent

Implement the missing Tasks backend: the kanban (`/tasks`, `/plots/:plotId/tasks`) and Dashboard "Tareas recientes" exist but have no routes or `tasks` table.

## Scope

### In Scope
- `tasks` table appended to `esquemaDb.sql`
- Controller: getTasks (optional `plot_id` filter), getTask/:id, createTask, updateTask (dynamic PATCH), deleteTask, restoreTask
- Routes file + mount behind `verificarToken` in `back/src/app.js`
- `parcela` via `LEFT JOIN plots`; `fecha` alias

### Out of Scope
- `/api/stats` (Dashboard stat cards) — separate change
- User-FK assignment (`asignado_a` stays free-text)
- Frontend changes; Harvests backend

## Capabilities

### New Capabilities
- `tasks-management`: Task CRUD, soft delete/restore, optional plot scoping, role-filtered list (admin sees/restores deleted), free-text assignee, derived plot name + display date.

### Modified Capabilities
None (`openspec/specs/` is empty).

## Approach

Follow `plots.controller.js`: admin role filter, `plot_id` query filter, FK check on create, dynamic-fields PATCH. Leaf entity → soft delete/restore, no cascade. `createTask` re-SELECTs with the JOIN so the 201 carries `parcela`.

**Empty-string normalization (critical):** form sends `fecha_limite`/`asignado_a` as `""` when unset — coerce to `NULL` before INSERT/UPDATE or strict mode rejects the DATE.

**`fecha` alias:** `DATE_FORMAT(COALESCE(fecha_limite, created_at), '%d/%m/%Y') AS fecha` — Dashboard.tsx:154 renders it raw (no date parsing), so format in SQL; COALESCE prefers due date, falls back to creation date.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `back/src/controllers/tasks.controller.js` | New | 6 handlers, plots template |
| `back/src/routes/tasks.routes.js` | New | Verb-named routes |
| `back/src/app.js` | Modified | Mount `/api/tasks` behind JWT |
| `esquemaDb.sql` | Modified | Append `tasks` table (gitignored) |

## Migration Notes

Apply manually per environment (`esquemaDb.sql` is gitignored):

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

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `""` DATE insert crashes (strict mode) | High | `""`→`NULL` coercion, create + update |
| Schema drift (gitignored SQL) | Med | Migration SQL verbatim above |
| Response shape mismatch | Low | Verified line-by-line in exploration.md |

## Rollback Plan

Revert `app.js` mount, delete both new files, `DROP TABLE tasks`. Leaf table; frontend tolerates absent endpoints.

## Dependencies

- Existing `plots` table (FK); no new packages.

## Success Criteria

- [ ] Kanban + Dashboard work end-to-end (list/create/estado/delete; `parcela` + `fecha` render)
- [ ] `plot_id` filter works; `""` payloads persist as NULL
- [ ] Admin sees/restores soft-deleted; other roles never see them
- [ ] Build + lint pass; manual API checks pass (no test runner)
