# Design: Non-Rectangular Plot Shape Support

## Technical Approach

Replace the uniform `maxPlantsInRow` grid rendering with per-row plant counts across all 4 map components. Add shape/terrain metadata to plots, row-level length/expected-count to vine_rows, and explicit position ordering to plants. The change is additive — all new columns are nullable with sensible defaults, so existing data renders identically.

## Architecture Decisions

| Decision | Option A | Option B | Decision | Rationale |
|----------|----------|----------|----------|-----------|
| Plant ordering | `posicion_en_fila` column | Keep `ORDER BY id` | `posicion_en_fila` | Explicit position survives deletions/restores; `id` order is fragile |
| Grid alignment | CSS `justify-content` | Manual margin offsets | CSS `justify-content` | Simpler, no calculation needed, native browser layout |
| Row length storage | `longitud_m` on vine_rows | Computed from GPS | `longitud_m` on vine_rows | GPS data is sparse; explicit field is simpler and user-controlled |
| Backfill strategy | SQL migration script | App-level migration on read | SQL migration | One-time operation; keeps app logic clean |
| Shape ENUM vs JSON | ENUM (5 values) | JSON config object | ENUM | Fixed set of shapes; ENUM validates at DB level |

## Data Flow

```
User creates plot with shape/terrain
  → POST /api/plots/createPlot { forma_parcela, terreno }
  → plots.controller.js inserts into plots table
  → Response includes new fields

User creates vine row with length/expected plants
  → POST /api/vine-rows/createVineRow { longitud_m, num_plantas_esperadas }
  → vineRows.controller.js inserts into vine_rows table

User creates plant (continuous flow)
  → POST /api/plants/createPlant { posicion_en_fila (auto-assigned) }
  → plants.controller.js inserts into plants table
  → posicion_en_fila = existing_plant_count_in_row (0-based)

PlotMap / IrrigationEventMap / PlotMap3D / PlantHealthMap render
  → GET /api/vine-rows/getVineRows?plot_id=X  (includes plant_count)
  → GET /api/plants/getPlants?plot_id=X       (includes posicion_en_fila)
  → GET /api/plots/getPlot/X                  (includes forma_parcela, terreno)
  → Per-row rendering: filter plants by vine_row_id, render actual count
  → Apply alignment based on forma_parcela
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `back/migrations/004_plot_shapes.sql` | Create | ALTER TABLE for plots, vine_rows, plants; backfill posicion_en_fila |
| `back/src/controllers/plots.controller.js` | Modify | Accept `forma_parcela`, `terreno` in create/update/SELECT |
| `back/src/controllers/vineRows.controller.js` | Modify | Accept `longitud_m`, `num_plantas_esperadas` in create/update/SELECT |
| `back/src/controllers/plants.controller.js` | Modify | Accept `posicion_en_fila` in create/batch/update; ORDER BY `posicion_en_fila` |
| `front/vineyards/src/pages/Plots.tsx` | Modify | Add shape/terrain selectors to create/edit forms; shape icon on cards |
| `front/vineyards/src/pages/VineRows.tsx` | Modify | Add optional `longitud_m` and `num_plantas_esperadas` fields |
| `front/vineyards/src/pages/PlotMap.tsx` | Modify | Per-row rendering, shape-based alignment, fetch plot shape |
| `front/vineyards/src/pages/PlotMap3D.tsx` | Modify | Per-row rendering, shape-based alignment |
| `front/vineyards/src/pages/IrrigationEventMap.tsx` | Modify | Per-row rendering, shape-based alignment |
| `front/vineyards/src/pages/PlantHealthMap.tsx` | Modify | Per-row rendering, shape-based alignment |
| `front/vineyards/src/pages/Plants.tsx` | Modify | Progress indicator "Planta X de Y", auto-assign `posicion_en_fila` |

## Interfaces / Contracts

### Database Schema Extensions

```sql
-- plots table
forma_parcela ENUM('rectangular', 'trapezoidal', 'abanicado', 'terrazas', 'irregular') NULL DEFAULT 'rectangular'
terreno       ENUM('plano', 'ladera', 'pendiente', 'con_cauce') NULL DEFAULT 'plano'

-- vine_rows table
longitud_m           DECIMAL(6,2) NULL
num_plantas_esperadas INT         NULL

-- plants table
posicion_en_fila INT NULL
```

### API Response Extensions

```js
// GET /api/plots/getPlot/:id — new fields
{ forma_parcela: 'rectangular', terreno: 'plano' }

// GET /api/vine-rows/getVineRows — new fields
{ longitud_m: 45.5, num_plantas_esperadas: 30 }

// GET /api/plants/getPlants — new field + ordering
{ posicion_en_fila: 3 }  // ORDER BY vr.numero, p.posicion_en_fila, p.id
```

### Frontend Alignment Mapping

```ts
const alignmentMap: Record<string, string> = {
  rectangular: 'flex-start',
  trapezoidal: 'center',
  abanicado: 'center',
  terrazas: 'flex-start',  // staggered via per-row marginLeft
  irregular: 'flex-start',
}
```

### Per-Row Rendering Pattern (shared across all 4 maps)

```tsx
// Shared helper — extract to a utility if duplication exceeds 2 components
const getPlantsForRow = (plants: Plant[], rowId: number) =>
  plants.filter(p => p.vine_row_id === rowId)
        .sort((a, b) => (a.posicion_en_fila ?? a.id) - (b.posicion_en_fila ?? b.id))

// In each map component:
rows.map(row => {
  const rowPlants = getPlantsForRow(plants, row.id)
  const align = plot?.forma_parcela === 'terrazas'
    ? `${row.numero % 2 === 0 ? '12' : '0'}px`  // stagger
    : alignmentMap[plot?.forma_parcela ?? 'rectangular']

  return (
    <div key={row.id} style={{ display: 'flex', justifyContent: align, marginLeft: typeof align === 'string' && align.includes('px') ? align : 0 }}>
      {rowPlants.map(plant => <PlantCell key={plant.id} plant={plant} />)}
    </div>
  )
})
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual API | Create plot with shape, verify response includes fields | curl/Postman to createPlot with forma_parcela/terreno |
| Manual API | Create row with length/expected, verify persistence | POST to createVineRow with new fields |
| Manual API | Create plant with posicion_en_fila, verify ordering | POST to createPlant, then GET getPlants ordered correctly |
| Manual UI | Plot form shows shape/terrain dropdowns, submits correctly | Create/edit plot, verify values persist |
| Manual UI | Row form shows length/expected fields | Create row, verify values persist |
| Manual UI | PlotMap renders per-row counts with correct alignment | Create trapezoidal plot with varying row lengths, verify center alignment |
| Manual UI | IrrigationEventMap renders per-row counts | Start irrigation event, verify grid matches PlotMap |
| Manual UI | Plants.tsx shows progress "Planta X de Y" | Create row with num_plantas_esperadas=5, verify indicator |
| Manual Build | Frontend builds without new TS errors | `cd front/vineyards && npm run build` |
| Manual Lint | Frontend lints without new errors | `cd front/vineyards && npm run lint` |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

### Migration Script (`back/migrations/004_plot_shapes.sql`)

1. ALTER TABLE `plots` ADD `forma_parcela` and `terreno` columns with defaults
2. ALTER TABLE `vine_rows` ADD `longitud_m` and `num_plantas_esperadas` columns (NULL)
3. ALTER TABLE `plants` ADD `posicion_en_fila` column (NULL)
4. Backfill `posicion_en_fila` using user-provided SQL (row variable approach)
5. No data loss — all columns are NULL-able with defaults

### Rollback

```sql
ALTER TABLE plants DROP COLUMN posicion_en_fila;
ALTER TABLE vine_rows DROP COLUMN longitud_m, DROP COLUMN num_plantas_esperadas;
ALTER TABLE plots DROP COLUMN forma_parcela, DROP COLUMN terreno;
```

Existing plant/row/plot records remain intact — only the new metadata columns are lost.

## Open Questions

- [ ] Should `terrazas` stagger be alternating even/odd rows, or a fixed offset? Current design uses even/odd alternation.
- [ ] Should `posicion_en_fila` be validated as unique within a vine_row_id at the DB level (UNIQUE constraint), or left to application logic? Leaning toward application-level to allow gaps (for future plant insertion between existing positions).
- [ ] The proposal mentions `PlantHealthMap` and `PlotMap3D` — should these be updated in the same task group or deferred? Current design includes all 4.
