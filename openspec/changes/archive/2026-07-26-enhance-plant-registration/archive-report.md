# Archive Report: enhance-plant-registration

**Date**: 2026-07-26
**Mode**: openspec
**Archived by**: sdd-archive sub-agent

## Change Summary

Enhanced plant registration to support optional varietal assignment ("sin planta" pattern), added 5 new agronomic fields (vigor, tutor, fecha_plantacion, metodo_propagacion, observaciones), and updated the full stack (DB migration, backend controller, frontend forms, PlotMap filters, PlantDetail display).

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| plant-data-model | Created | New main spec — plant entity schema with 5 new columns, nullable varietal_id, soft delete cascade, dual tutor source, propagation table independence |
| plant-registration-flow | Created | New main spec — creation fields (required/optional), empty cell representation, batch creation, role-based access |
| plant-detail-display | Created | New main spec — header fields display, sin planta empty state, tab navigation |
| plant-map-filters | Created | New main spec — sin tutor filter toggle, sin planta cell display, filter state persistence |

## Archive Verification

- [x] Main specs created (4 new domains — no existing specs to merge into)
- [x] Change folder moved to `openspec/changes/archive/2026-07-26-enhance-plant-registration/`
- [x] Archive contains: proposal.md, specs/ (4 delta specs), design.md, tasks.md
- [x] Active changes directory no longer contains this change

## Task Completion Status

**Total tasks**: 27
**Completed**: 21 ✅
**Unchecked**: 6 ⚠️

Unchecked tasks (intentional partial archive — user explicitly requested archive):
- **1.2**: Update `esquemaDb.sql` reference (gitignored, low priority)
- **2.6**: Manual API test (verification task — implementation complete)
- **7.3–7.7**: Manual UI/API verification tasks (implementation complete, manual tests not executed)

All core implementation tasks (phases 1–6) are marked complete. The unchecked tasks are schema reference documentation and manual verification steps. The user explicitly requested archive, which serves as approval for intentional partial archive with these outstanding manual verification items.

## Implementation Scope

- **DB Migration**: `back/migrations/002_enhance_plant_registration.sql` — 5 new columns + varietal_id nullable
- **Backend**: `back/src/controllers/plants.controller.js` — nullable varietal, new fields, LEFT JOIN
- **Frontend**: `Plants.tsx` (new fields, sin planta option), `PlotMap.tsx` (sin tutor filter, orange border), `PlantDetail.tsx` (new header fields, sin planta empty state)
- **Constants**: `front/vineyards/src/constants/plantOptions.ts` created

## Source of Truth Updated

The following new specs are now the source of truth:
- `openspec/specs/plant-data-model/spec.md`
- `openspec/specs/plant-registration-flow/spec.md`
- `openspec/specs/plant-detail-display/spec.md`
- `openspec/specs/plant-map-filters/spec.md`
