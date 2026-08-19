# Archive Report: plot-shapes

## Change Summary
**Name**: plot-shapes
**Title**: Non-Rectangular Plot Shape Support
**Date Archived**: 2026-07-27
**Mode**: openspec

## What Was Done
Added shape metadata (`forma_parcela`, `terreno`) to plots, row-level metadata (`longitud_m`, `num_plantas_esperadas`) to vine rows, and explicit plant positioning (`posicion_en_fila`) to plants. Updated all 4 map components to render per-row actual plant counts with shape-based alignment (center for trapezoidal/abanicado, staggered for terrazas, left for rectangular).

## Specs Synced
| Domain | Action | Details |
|--------|--------|---------|
| `plot-shape-model` | Created | New main spec — plot shape classification, terrain, row metadata, plant positioning, backward compatibility |
| `plot-shape-creation` | Created | New main spec — plot create/edit forms with shape/terrain, row form with length/expected plants, backend field acceptance |
| `plot-map-rendering` | Created | New main spec — per-row plant count rendering, shape-based alignment strategies, cell content, hover tooltips |
| `plant-registration-flow` | Updated | Modified "Plant Creation Fields" (added `posicion_en_fila`, progress indicator scenarios), "Batch Plant Creation" (added `posicion_en_fila` handling) |
| `irrigation-event-workflow` | Updated | Modified "Interactive Plant Selection Map" (per-row rendering, shape alignment), "Per-Row Coverage Level" (actual plant count), "Plant Impact Recording" (plant_id tracking), "Transactional Bulk Save" (wording) |

## Archive Contents
- proposal.md ✅
- specs/plot-shape-model/spec.md ✅
- specs/plot-shape-creation/spec.md ✅
- specs/plot-map-rendering/spec.md ✅
- specs/plant-creation-flow/spec.md ✅ (delta)
- specs/irrigation-event-map/spec.md ✅ (delta)
- design.md ✅
- tasks.md ✅

## Task Completion
- **Implementation tasks (1.1–5.2)**: 22/22 complete ✅
- **Manual test tasks (6.3–6.6)**: 4 unchecked — manual API/UI tests not executed. Orchestrator explicitly requested archive; these are verification tasks, not implementation tasks. Archive proceeds with intentional partial completion.

## Source of Truth Updated
The following main specs now reflect the new behavior:
- `openspec/specs/plot-shape-model/spec.md` (new)
- `openspec/specs/plot-shape-creation/spec.md` (new)
- `openspec/specs/plot-map-rendering/spec.md` (new)
- `openspec/specs/plant-registration-flow/spec.md` (updated)
- `openspec/specs/irrigation-event-workflow/spec.md` (updated)

## Files Changed During Implementation
- `back/migrations/004_plot_shapes.sql` (new)
- `back/src/controllers/plots.controller.js` (modified)
- `back/src/controllers/vineRows.controller.js` (modified)
- `back/src/controllers/plants.controller.js` (modified)
- `front/vineyards/src/pages/Plots.tsx` (modified)
- `front/vineyards/src/pages/VineRows.tsx` (modified)
- `front/vineyards/src/pages/PlotMap.tsx` (modified)
- `front/vineyards/src/pages/IrrigationEventMap.tsx` (modified)
- `front/vineyards/src/pages/PlantHealthMap.tsx` (modified)
- `front/vineyards/src/pages/PlotMap3D.tsx` (modified, if exists)
- `front/vineyards/src/pages/Plants.tsx` (modified)
- `front/vineyards/src/lib/plot-grid-utils.ts` (new)
