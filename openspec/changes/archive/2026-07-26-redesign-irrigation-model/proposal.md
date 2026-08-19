# Proposal: Redesign Irrigation Model

## Intent

The current irrigation model has structural flaws that make it unusable for real-world vineyard operations. Irrigation systems are treated as a CRUD catalog when there are only 5 fixed types. Pressure and flow rate values are stored statically on the system type instead of per-event. Coverage and impact records are orphaned — not linked to any specific event. Plots have no irrigation system assigned, forcing manual selection per event. There is no interactive workflow for recording which plants were actually watered.

This change fixes the data model, links all records properly, and introduces an interactive event recording workflow.

## Scope

### In Scope
- Convert `irrigation_systems` from CRUD catalog to 5 fixed seed types
- Add `irrigation_system_id` FK to `plots` table
- Move `presion_media_bar` and `caudal_l_h` from `irrigation_systems` to `irrigation_events`
- Add `irrigation_event_id` FK to `irrigation_coverage` and `irrigation_event_impact`
- Remove `irrigation_system_id` from `irrigation_events` (inherited from plot)
- Interactive event workflow: select watered plants on plot map, auto-build coverage/impact
- Backend migration script for existing data
- Frontend: replace IrrigationSystems CRUD, rewrite IrrigationEvents, add system selector to Plots

### Out of Scope
- Changing the 5 irrigation system types themselves
- Irrigation scheduling or automation (future)
- Water usage analytics or reporting (future)
- Modifying non-irrigation CRUD pages

## Capabilities

### New Capabilities
- `irrigation-system-seed`: Fixed 5-type irrigation system seed (replaces CRUD catalog)
- `irrigation-event-workflow`: Interactive plant selection workflow for recording irrigation events with coverage and impact data
- `plot-irrigation-assignment`: Plot-level irrigation system assignment

### Modified Capabilities
- `irrigation-events`: Event creation no longer selects system (inherited from plot); gains `presion_media_bar` and `caudal_l_h` fields; coverage and impact records now linked to specific events

## Approach

1. **Database migration**: Run ALTER TABLE statements to add FKs, move columns, link orphaned tables. Seed the 5 fixed system types. Provide a migration script that assigns existing plots a default system and re-links orphaned records.

2. **Backend**: Remove CRUD endpoints for irrigation systems. Update event controllers to inherit system from plot. Update coverage/impact controllers to require `irrigation_event_id`. Add bulk-insert endpoint for event workflow data.

3. **Frontend**: Replace IrrigationSystems page with read-only reference or remove entirely. Rewrite IrrigationEvents with interactive map-based workflow (reuse PlotMap cell-selection pattern). Add irrigation system selector to Plot create/edit forms.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `back/src/controllers/irrigationSystems.controller.js` | Removed/Replaced | Replace CRUD with seed-only reference |
| `back/src/controllers/irrigationEvents.controller.js` | Modified | Remove system_id from create; add presion/caudal fields |
| `back/src/controllers/irrigationCoverage.controller.js` | Modified | Add irrigation_event_id FK requirement |
| `back/src/controllers/irrigationEventImpact.controller.js` | Modified | Add irrigation_event_id FK requirement |
| `back/src/controllers/plots.controller.js` | Modified | Add irrigation_system_id to create/update |
| `back/src/routes/` (4 files) | Modified | Update route definitions |
| `front/vineyards/src/pages/IrrigationSystems.tsx` | Removed/Replaced | Replace CRUD with read-only or remove |
| `front/vineyards/src/pages/IrrigationEvents.tsx` | Major rewrite | Interactive map-based event workflow |
| `front/vineyards/src/pages/Plots.tsx` | Modified | Add irrigation system selector |
| `front/vineyards/src/app/router.tsx` | Modified | Update/remove irrigation routes |
| `front/vineyards/src/components/Layout.tsx` | Modified | Update nav items |
| `esquemaDb.sql` | Modified | Schema changes (gitignored, update local copy) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing orphaned coverage/impact records lose context | High | Migration script assigns them to nearest event by date/plot or flags for review |
| Existing plots need irrigation_system_id assigned | High | Migration assigns default system; admin can bulk-edit later |
| Existing events with system_id need migration to plot's system | Medium | Migration copies event's system_id to its plot before dropping the column |
| Interactive map UI is complex new frontend work | High | Reuse PlotMap cell-selection pattern; scope to basic row/cell selection first |
| Data loss during migration | Low | Run in transaction; backup tables before ALTER |

## Rollback Plan

1. Keep pre-migration SQL backup of all 4 irrigation tables
2. Revert schema: restore dropped columns, remove added FKs, re-add `irrigation_system_id` to events
3. Restore `irrigation_systems` CRUD endpoints from git history
4. Revert frontend pages to previous versions
5. Re-seed original irrigation_systems data if modified

## Dependencies

- PlotMap component exists and can be reused for cell selection pattern
- MySQL transaction support for bulk inserts
- Existing soft-delete cascade pattern for reference

## Success Criteria

- [ ] `irrigation_systems` table contains exactly 5 seed rows, no CRUD endpoints
- [ ] Every plot has an `irrigation_system_id` (nullable allowed for migration period)
- [ ] Every `irrigation_coverage` record has a valid `irrigation_event_id`
- [ ] Every `irrigation_event_impact` record has a valid `irrigation_event_id`
- [ ] Creating an event auto-inherits system from plot (no manual selection)
- [ ] `presion_media_bar` and `caudal_l_h` are stored per-event, not per-system-type
- [ ] Interactive event workflow: user can select plants on map and save coverage + impact in one transaction
- [ ] All existing data migrated without loss
