# Proposal: Add Irrigation Events Frontend

## Intent

Provide a UI for managing irrigation events (create, list, edit, soft delete, restore) so users can track when and how much water was applied to each plot. The backend CRUD already exists and is fully functional — only the frontend page and a missing `restore` endpoint are needed.

## Scope

### In Scope
- New `IrrigationEvents.tsx` page — card grid with inline create/edit forms, soft delete toggle, role-based actions
- Route `/irrigation-events` in `router.tsx`
- Nav item "Eventos de Riego" in `Layout.tsx` sidebar
- Backend `POST /api/irrigation-events/restore/:id` endpoint for consistency with other entities

### Out of Scope
- Irrigation coverage visualization (backend lacks `event_id` linkage — would be confusing)
- Irrigation impact UI (deferred until backend event_id linkage is resolved)
- Filtering by date range or plot (can be added later if needed)

## Capabilities

> This section is the CONTRACT between proposal and specs phases.

### New Capabilities
- `irrigation-events-ui`: Frontend CRUD page for irrigation events with card grid, inline forms, role-based actions, and plot/system dropdowns
- `irrigation-event-restore`: Backend restore endpoint for soft-deleted irrigation events

### Modified Capabilities
- None

## Approach

Follow the existing `IrrigationSystems.tsx` pattern exactly: card grid layout, inline create/edit forms, soft delete toggle visible only to admin, role-based action buttons (`canDelete()`, `isAdmin()`). Fetch all plots and irrigation systems upfront for dropdowns and plot name display. Events are fetched per-plot via the existing endpoint, aggregated client-side into a single list showing plot name on each card.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `front/vineyards/src/pages/IrrigationEvents.tsx` | New | Main CRUD page following IrrigationSystems pattern |
| `front/vineyards/src/app/router.tsx` | Modified | Add `/irrigation-events` route |
| `front/vineyards/src/components/layout/Layout.tsx` | Modified | Add "Eventos de Riego" nav item |
| `back/src/controllers/irrigationEvents.controller.js` | Modified | Add `restoreIrrigationEvent` function |
| `back/src/routes/irrigationEvents.routes.js` | Modified | Add `POST /restore/:id` route |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Aggregating events across all plots may be slow with large datasets | Low | Current scale is small; can add pagination later if needed |
| Missing `event_id` in coverage/impact tables makes those features unusable | High | Explicitly deferred — no UI for coverage/impact until backend is fixed |
| Frontend build may fail due to pre-existing 17 TS errors | Medium | This change is isolated; pre-existing errors are unrelated |

## Rollback Plan

Remove the route from `router.tsx`, remove the nav item from `Layout.tsx`, and delete `IrrigationEvents.tsx`. The backend restore endpoint is additive and harmless if left in place, but can be reverted by removing the route line and controller function.

## Dependencies

- Backend irrigation events CRUD endpoints already exist and are functional
- Plots and irrigation systems endpoints already exist for dropdown data

## Success Criteria

- [ ] `/irrigation-events` page loads and displays existing irrigation events with plot names
- [ ] Can create a new irrigation event with system, plot, date, duration, and mm applied
- [ ] Can edit an existing irrigation event inline
- [ ] Can soft delete an event (admin sees deleted events with restore option)
- [ ] Can restore a soft-deleted irrigation event via new backend endpoint
- [ ] Nav item "Eventos de Riego" appears in sidebar and navigates correctly
- [ ] Role-based permissions work: operarios cannot delete, enólogos can edit but not see deleted
