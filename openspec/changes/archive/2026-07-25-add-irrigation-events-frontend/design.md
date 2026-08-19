# Design: Add Irrigation Events Frontend

## Technical Approach

Create a new `IrrigationEvents.tsx` page following the exact `IrrigationSystems.tsx` pattern: card grid layout, inline create/edit forms, soft-delete toggle, and role-based actions. Add a single new backend endpoint `getAllIrrigationEvents` that returns all events JOINed with `plots` and `irrigation_systems` to avoid N+1 client-side fetching. Add a `restoreIrrigationEvent` endpoint for parity with other entities. Register `/irrigation-events` route and sidebar nav item visible to all authenticated users.

## Architecture Decisions

### Decision: Fetch all events via single backend endpoint

| Option | Tradeoff | Decision |
|---|---|---|
| A: N calls (one per plot) | Simple, no backend change; O(N) requests, client-side aggregation | Rejected |
| B: New `getAllIrrigationEvents` endpoint | One backend change; single request, server-side JOIN | **Chosen** |

**Rationale**: The spec requires displaying all events across all plots ordered by fecha DESC. Option A would fire one HTTP request per plot (unknown count), aggregate client-side, then re-sort. Option B adds one controller function with a single JOIN query — cleaner, faster, and matches how other "list all" endpoints work (e.g., `getIrrigationSystems`, `getPlots`).

### Decision: Restore endpoint uses PUT /restore/:id

| Option | Tradeoff | Decision |
|---|---|---|
| PATCH /restore/:id | Matches plants/plots/vineyards pattern | Rejected |
| PUT /restore/:id | Matches irrigationSystems/treatments/diseases pattern | **Chosen** |

**Rationale**: `irrigationSystems` (the closest sibling entity) uses `PUT /restore/:id`. Consistency within the irrigation domain takes priority over the broader PATCH convention used by plants/plots.

### Decision: No modal dialogs — inline forms only

**Choice**: Create and edit forms render inline above the card grid, toggled by state flags (`showCreate`, `editingEvent`).
**Alternatives considered**: Modal dialogs, slide-out panels.
**Rationale**: `IrrigationSystems.tsx` uses inline forms. Following the established pattern reduces cognitive load and keeps the component self-contained without additional UI dependencies.

## Data Flow

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│  Component  │────▶│  GET /plots      │────▶│  plots[] (dropdown)  │
│  on mount   │     │  GET /systems    │     │  systems[] (dropdown)│
│             │────▶│  GET /events/all │────▶│  events[] (cards)    │
└─────────────┘     └──────────────────┘     └──────────────────────┘

Create:  POST /irrigation-events/create → optimistic append to events[]
Edit:    PUT  /irrigation-events/update/:id → map update in events[]
Delete:  DELETE /irrigation-events/delete/:id → set deleted_at locally
Restore: PUT  /irrigation-events/restore/:id → set deleted_at = null locally
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `front/vineyards/src/pages/IrrigationEvents.tsx` | Create | Main CRUD page: card grid, inline forms, role-based actions |
| `front/vineyards/src/app/router.tsx` | Modify | Add import and route `{ path: "irrigation-events", element: <IrrigationEvents /> }` |
| `front/vineyards/src/components/layout/Layout.tsx` | Modify | Add nav item `{ to: "/irrigation-events", label: "Eventos de Riego", icon: "🚿" }` |
| `back/src/controllers/irrigationEvents.controller.js` | Modify | Add `getAllIrrigationEvents` and `restoreIrrigationEvent` functions |
| `back/src/routes/irrigationEvents.routes.js` | Modify | Add imports and routes for `getAllIrrigationEvents` and `restoreIrrigationEvent` |

## Interfaces / Contracts

### Frontend Types

```ts
type IrrigationEvent = {
  id: number
  plot_id: number
  plot_nombre: string
  irrigation_system_id: number
  sistema_tipo: string
  fecha: string
  duracion_min: number | null
  mm_aplicados: number | null
  observaciones: string | null
  deleted_at: string | null
}

type Plot = { id: number; nombre: string; deleted_at: string | null }
type IrrigationSystem = { id: number; tipo: string; deleted_at: string | null }
```

### New Backend Endpoint

```
GET /api/irrigation-events/getAllIrrigationEvents
→ 200: [
    { id, plot_id, plot_nombre, irrigation_system_id, sistema_tipo,
      fecha, duracion_min, mm_aplicados, observaciones, deleted_at }
  ]
  ORDER BY fecha DESC

PUT /api/irrigation-events/restore/:id
→ 200: { message: "Evento de riego restaurado" }
→ 500: { message: "Error al restaurar evento de riego" }
```

### Backend SQL (getAllIrrigationEvents)

```sql
SELECT ie.*,
       p.nombre AS plot_nombre,
       ist.tipo AS sistema_tipo
FROM irrigation_events ie
JOIN plots p ON ie.plot_id = p.id
JOIN irrigation_systems ist ON ie.irrigation_system_id = ist.id
ORDER BY ie.fecha DESC
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Type check | `tsc -b` passes with new component | `cd front/vineyards && npx tsc -b` |
| Lint | ESLint passes | `cd front/vineyards && npm run lint` |
| Build | Vite production build succeeds | `cd front/vineyards && npm run build` |
| Manual | Page loads, CRUD operations, role permissions, restore | Navigate to `/irrigation-events`, verify all flows |

No test runner is installed — quality gates are type check, lint, and build.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. The backend endpoint additions are additive and backward-compatible. The frontend route and nav item can be reverted by removing the route line, nav entry, and deleting `IrrigationEvents.tsx`.

## Open Questions

- None
