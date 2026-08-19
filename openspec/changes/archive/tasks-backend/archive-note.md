# Archive Note: tasks-backend

- **Archived**: 2026-07-24
- **Mode**: openspec
- **Status**: SDD cycle complete — planned, implemented, verified, archived.

## Verification

- **Verdict**: PASS WITH WARNINGS (`verify-report.md`)
- M1–M15 manual HTTP checks + 2 extra error-shape checks: all PASS against the live API.
- Browser smoke test (`/tasks` kanban + Dashboard "Tareas recientes"): confirmed working by the user.
- **CRITICAL issues**: none.

## Task Completion Gate

14/14 tasks checked `[x]` in `tasks.md` (11 by sdd-apply, 3 by sdd-verify). No stale checkboxes; no archive-time reconciliation needed.

## Spec Sync

The spec phase dual-wrote identical copies to the main spec and the change delta. Verified byte-identical at archive time (SHA256 `9AC13F9B55FCE9D6075B621D5B353340D2366B312D669F6594B34D3182B4BDC6` for both):

- Main spec (source of truth): `openspec/specs/tasks-management/spec.md`
- Change delta: `specs/tasks-management/spec.md` (this folder)

No merge was performed — the main spec was already in place. No requirements were duplicated. Note: the main spec retains the delta-format title ("# Delta for tasks-management") since it was written that way at spec time; harmless, but a future hygiene pass could retitle it.

## Native Review Receipt

The native dual-review flow (transaction/ledger/receipt/gate-context) was not part of this pipeline — no review state exists in Engram for this change. Verification evidence is `verify-report.md` plus the user-confirmed browser smoke test.

## Warnings (documented, non-blocking)

- Frontend `npm run build` and `npm run lint` were already red BEFORE this change (pre-existing TS errors in `CreateVineyard.tsx`, `PlotMap.tsx`, `Plots.tsx`; lint errors across unrelated pages). This change touched zero frontend files — no collateral damage. Recommend a separate hygiene change.
- `deleteTask`/`restoreTask` return 200 on non-existent ids (UPDATE affects 0 rows silently). Matches codebase convention (same as plots); not a spec violation.

## Convention Note

Archived to `openspec/changes/archive/tasks-backend/` per explicit orchestrator instruction (skill default is a `YYYY-MM-DD-` date prefix). The archive date is recorded in this note to preserve the audit trail.

## What Shipped

- `back/src/controllers/tasks.controller.js` — 6 handlers (getTasks with `?plot_id` filter, getTask, createTask, updateTask dynamic PATCH, deleteTask soft, restoreTask), `""`→NULL coercion, estado whitelist, FK checks, role-based visibility.
- `back/src/routes/tasks.routes.js` — 6 verb-named routes.
- `back/src/app.js` — `/api/tasks` mounted behind `verificarToken`.
- `esquemaDb.sql` (gitignored) — `tasks` table DDL appended; applied manually to dev MySQL.
