# Design: Enhance Plant Registration

## Technical Approach

Extend the `plants` table with agronomic fields (`vigor`, `tutor`, `fecha_plantacion`, `metodo_propagacion`, `observaciones`) and make `varietal_id` nullable to support explicit "sin planta" (empty cell) records. The key structural change is converting `JOIN varietals` to `LEFT JOIN varietals` in all plant read queries, and removing mandatory varietal validation in create/update endpoints. Frontend forms gain new inline fields; PlotMap gains a visual filter toggle; PlantDetail shows new fields conditionally.

## Architecture Decisions

### Decision: New fields on `plants` table (not separate table)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Add columns to `plants` | Simpler queries, denormalized but all in one read | **Chosen** — fields are 1:1 with plant, no cardinality reason to split |
| Separate `plant_agronomic_data` table | Normalized, but requires JOIN for every plant read | Rejected — adds complexity for no benefit |

### Decision: `metodo_propagacion` on `plants` + `plant_propagation` as history log

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Dual source: current on `plants`, history in `plant_propagation` | Redundant but supports both quick access and audit trail | **Chosen** — matches existing pattern (tutor on both `plants` and `plant_status_history`) |
| Single source in `plant_propagation` | Normalized, but requires subquery for current value | Rejected — current value needed on every plant read |

### Decision: `codigo` remains required

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep `codigo` NOT NULL | Enforces identification even for "sin planta" cells | **Chosen** — every cell needs a traceable identifier |
| Make `codigo` nullable for "sin planta" | Simpler creation, but loses auditability | Rejected — spec requires unique code per cell |

## Data Flow

```
Frontend (Plants.tsx)                    Backend (plants.controller.js)              MySQL
─────────────────                        ──────────────────────────────              ─────
  POST /createPlant
    { vine_row_id, sistema_conduccion,
      codigo, varietal_id?, vigor?,
      tutor?, fecha_plantacion?,
      metodo_propagacion?,
      observaciones?, latitud?,
      longitud? }
        │
        ▼
    Validate: vine_row_id + sistema_conduccion + codigo required
    Optional: varietal_id (NULL = sin planta)
        │
        ▼                                                         INSERT INTO plants
    INSERT (varietal_id may be NULL) ───────────────────────────►   (vine_row_id, varietal_id,
                                                                      sistema_conduccion, codigo,
                                                                      vigor, tutor,
                                                                      fecha_plantacion,
                                                                      metodo_propagacion,
                                                                      observaciones, ...)
        │
        ◄──────────────────────────────────────────────────────────  201 Created

  GET /getPlants?plot_id=X
        │
        ▼
    SELECT ... FROM plants p
    LEFT JOIN varietals v ON p.varietal_id = v.id    ◄───────────  rows with NULL varietal_id
    LEFT JOIN vine_rows vr ON p.vine_row_id = vr.id                return varietal fields as NULL
        │
        ◄──────────────────────────────────────────────────────────  JSON array
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `back/migrations/002_enhance_plant_registration.sql` | Create | ALTER TABLE: add 5 columns, modify `varietal_id` to NULL |
| `back/src/controllers/plants.controller.js` | Modify | `createPlant`: remove varietal_id required check, accept new fields; `createPlantsBatch`: include new fields in batch insert; `getPlants`: `JOIN varietals` → `LEFT JOIN varietals`, add new columns to SELECT; `updatePlant`: accept new fields in dynamic UPDATE; `getPlant` (if exists): LEFT JOIN |
| `back/src/routes/plants.routes.js` | No change | Routes unchanged — same endpoints, different payload shape |
| `front/vineyards/src/constants/plantOptions.ts` | Create | Export `vigorOptions`, `propagationMethodOptions` arrays |
| `front/vineyards/src/pages/Plants.tsx` | Modify | Add vigor (select), tutor (checkbox), fecha_plantacion (date), metodo_propagacion (select), observaciones (textarea) to creation form; varietal select becomes optional with "Sin planta" option; update TypeScript `Plant` type for nullable `varietal_id` and new fields; update edit form |
| `front/vineyards/src/pages/PlotMap.tsx` | Modify | Add `showSinTutor` state toggle; plants with `tutor=false` get orange border when toggle active; cells with `varietal_id === null` render as slate gray "Sin planta"; update `Plant` type for nullable varietal and new fields |
| `front/vineyards/src/pages/PlantDetail.tsx` | Modify | Header shows vigor badge, tutor status, fecha_plantacion, metodo_propagacion, observaciones (conditionally, only if non-null); when `varietal_id === null`, show "Sin planta" message with varietal assignment action; update `Plant` type |
| `esquemaDb.sql` | Modify | Update `plants` table definition to reflect new schema (reference only — gitignored) |

## Interfaces / Contracts

### New constants (`front/vineyards/src/constants/plantOptions.ts`)

```typescript
export const vigorOptions = ["sin_crecimiento", "pequeña", "mediana", "grande"] as const
export const propagationMethodOptions = ["injerto", "estaca", "acodo", "micropropagacion"] as const
```

### Updated Plant type (frontend)

```typescript
type Plant = {
  id: number
  varietal_id: number | null          // was: number
  varietal_nombre: string | null      // was: string
  varietal_tipo: string | null        // was: string
  vigor: string | null
  tutor: boolean
  fecha_plantacion: string | null
  metodo_propagacion: string | null
  observaciones: string | null
  // ... existing fields unchanged
}
```

### Backend request shape (createPlant)

```json
{
  "vine_row_id": 1,
  "sistema_conduccion": "espaldera",
  "codigo": "V1-F1-P1",
  "varietal_id": null,
  "vigor": "mediana",
  "tutor": false,
  "fecha_plantacion": "2026-07-26",
  "metodo_propagacion": "injerto",
  "observaciones": "Planta nueva",
  "latitud": null,
  "longitud": null
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual API | Create plant with `varietal_id = NULL` | POST `/plants/createPlant` with null varietal, verify 201 |
| Manual API | Create plant with all new fields | POST with vigor, tutor, fecha_plantacion, metodo_propagacion, observaciones |
| Manual API | Get plants returns NULL-safe varietal fields | GET `/plants/getPlants`, verify `varietal_nombre` is null for sin planta |
| Manual API | Update plant with new fields | PATCH `/plants/updatePlant/:id` with vigor/tutor |
| Manual UI | Create plant without varietal | Plants.tsx form → "Sin planta" option → verify creation |
| Manual UI | PlotMap shows sin planta cells | Verify slate gray rendering for NULL varietal_id |
| Manual UI | PlotMap "Mostrar sin tutor" toggle | Enable toggle → verify orange border on tutor=false plants |
| Manual UI | PlantDetail sin planta state | Open detail for NULL varietal → verify message + assign action |
| TypeScript | No compilation errors | `cd front/vineyards && npx tsc -b` |
| Lint | No new ESLint errors | `cd front/vineyards && npm run lint` |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

1. **Run migration**: Execute `back/migrations/002_enhance_plant_registration.sql` against the MySQL database
2. **Deploy backend**: New controller logic handles both old and new payloads (backward compatible — new fields are optional)
3. **Deploy frontend**: New UI fields appear; existing plants render correctly with LEFT JOIN
4. **Rollback**: Revert git changes, run reverse migration (DROP columns, restore `varietal_id NOT NULL`). Any plants with `varietal_id = NULL` must be assigned or deleted first.

## Open Questions

- [ ] Should `codigo` be auto-generated for "sin planta" cells, or must the operator enter it manually? (Currently required per spec)
- [ ] Should the initial `tutor` and `fecha` values from the status form be copied to the new `plants` columns on creation, or kept separate? (Proposal keeps them on plants directly; status form currently sends them to plant_status)
