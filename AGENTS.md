# AGENTS.md - app-vineyards

## Project Structure
- **Monorepo** with two independent packages:
  - `front/vineyards/` — React + TypeScript + Vite + Tailwind CSS v4 frontend
  - `back/` — Node.js + Express 5 + MySQL backend (ESM)
- Each has its own `package.json` and `node_modules`. Install deps separately.
- **SDD initialized** (openspec mode): `openspec/config.yaml`, main specs in `openspec/specs/`, archived changes in `openspec/changes/archive/`, skill registry at `.atl/skill-registry.md`

## Developer Commands

### Root (monorepo)
```bash
npm run dev       # concurrently → front (5173) + back (3000) en una sola terminal
npm run build:front  # build del frontend
```
- Requiere `npm install` en el root primero (instala `concurrently`)

### Frontend (`front/vineyards/`)
```bash
npm run dev       # Vite dev server con proxy a /api → localhost:3000
npm run build     # tsc -b && vite build
npm run lint      # eslint .
npm run preview   # vite preview
```
- **Proxy configurado**: requests a `/api` se redirigen automáticamente al backend
- API client usa `baseURL: "/api"` (ruta relativa)

### Backend (`back/`)
```bash
npm run dev       # nodemon src/server.js → API on http://localhost:3000
```
- No test script configured.
- Requiere `back/.env` con: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`

## Architecture

### Domain Model (hierarchical)
```
Vineyard (viñedo)
  ├── has many Varietals (varietales) — many-to-many via vineyard_varietals
  └── has many Plots (parcelas)
        └── has many VineRows (filas)
              └── has many Plants (plantas) — each plant has a varietal
                    └── has many PlantStatusHistory (historial de estado)

Tasks (tareas)
  └── has many Users (asignados) — many-to-many via task_assignees
```

### Backend Entry Point
- `back/src/server.js` → imports `app.js` → listens on port 3000
- `back/src/app.js` → Express app with CORS, JSON parsing
- Routes: `/api/auth` (public), `/api/users` (+ `/api/users/active` for assignee dropdown), `/api/vineyard`, `/api/plots`, `/api/varietals`, `/api/vine-rows`, `/api/plants`, `/api/tasks` (all protected by JWT middleware)
- DB: MySQL via `mysql2/promise` pool (`back/src/db.js`)
- Auth: JWT middleware (`back/src/middleware/auth.middleware.js`) — `verificarToken` extracts and validates Bearer token

### Backend Controllers
- `auth.controller.js` — login with bcrypt + JWT (8h expiry)
- `users.controller.js` — CRUD with soft delete, role-based filtering, `getActiveUsers` (returns all active users for assignee dropdown)
- `vineyards.controller.js` — CRUD + varietals association on create, two-query pattern for list (avoids JSON_ARRAYAGG null issues), role-based filtering
- `plots.controller.js` — CRUD with soft delete, filterable by vineyard_id, getPlot/:id, role-based filtering
- `varietals.controller.js` — list all 100 varietals, manage vineyard-varietal associations
- `vineRows.controller.js` — CRUD with plant_count via LEFT JOIN, role-based filtering
- `plants.controller.js` — CRUD with varietal join, unique codigo, batch create (createPlantsBatch), update varietal/latitud/longitud, filterable by plot_id or vine_row_id, role-based filtering
- `plantStatus.controller.js` — create status entry, get history by plant_id, update status (appends new entry)
- `tasks.controller.js` — CRUD with soft delete + restore, filterable by plot_id, LEFT JOIN plots (`parcela`), `fecha` alias for Dashboard, `""`→NULL coercion on nullable fields, role-based filtering, **multi-assignee support** via `task_assignees` junction table (transactional create/update, `asignados` array in responses)

### Frontend Entry Point
- `front/vineyards/src/main.tsx` → `RouterProvider` with `react-router-dom`
- Router: `front/vineyards/src/app/router.tsx`
- API client: `front/vineyards/src/services/api.ts` → axios with base URL `/api`
- Auth: JWT stored in `localStorage`, auto-attached via interceptor, 401 → redirect to `/login`

### Frontend Pages
- `GetVineyards` — list with varietal badges, delete, navigate to plots
- `CreateVineyard` — form with searchable multi-select for varietals
- `Plots` — list per vineyard or all, create/delete, navigate to map or rows
- `PlotMap` — top-down visualization of planted parcel, color-coded by varietal type, click cell to see details
- `VineRows` — list per plot, create row → auto-navigates to plant creation
- `Plants` — continuous flow: create plant → auto-advances to next plant; includes health status form + history; can replace varietal if plant died
- `PlantDetail` — comprehensive plant view with tabs: status, diseases, treatments, notes, yield, prunings, propagation, irrigation impact
- `Diseases` — catalog management (CRUD + soft delete + restore)
- `Treatments` — catalog management (CRUD + soft delete + restore)
- `IrrigationSystems` — catalog management (CRUD + soft delete + restore)
- `GetUsers` / `CreateUser` — user management (admin only)
- `Profile` — edit own profile (all roles)
- `Tasks` — kanban board (`/tasks` and `/plots/:plotId/tasks`) + Dashboard recent-tasks widget; backend fully implemented with multi-assignee support (multi-select of users, badge display)
- `Harvests` — exists but backend not implemented yet

## Database
- Schema: `esquemaDb.sql` (gitignored — **not in repo**)
- Seed: `seed_varietals.sql` — 100 most commercialized grape varietals (60 tintas, 35 blancas, 5 rosadas)
- Soft deletes via `deleted_at TIMESTAMP NULL` on all tables
- Junction tables: `vineyard_varietals` (vineyard↔varietals), `task_assignees` (task↔users) — both with UNIQUE constraints

## Plant Workflow
1. Create vineyard → select varietals
2. Create plot → name + area_m2
3. Create rows one by one → each row creation auto-navigates to plant creation
4. Create plants one by one with continuous flow (save → next plant auto-prepared)
5. Each plant creation includes initial health status (estado_salud, crecimiento, tutor)
6. View plant detail → see status history, update status, replace varietal if plant died
7. PlotMap shows visual grid of all planted cells

## Soft Delete Cascade
Eliminar un padre elimina en cascada todos sus hijos (y restaurar los restaura):
```
vineyard → plots → vine_rows → plants → plant_status_history
                                          → plant_diseases
                                          → plant_treatments
                                          → plant_notes
                                          → plant_yield
                                          → plant_prunings
                                          → plant_propagation
```
- `deleteUser` → setea `plant_prunings.realizada_por = NULL` (no cascadea)
- Todas las operaciones usan transacciones MySQL para atomicidad

## Role-Based Access
- **Admin** → ve todo (incluidos soft-deleted), puede eliminar, puede restaurar, ve sección Usuarios
- **Enólogo** → solo registros activos, puede eliminar, puede modificar, NO ve Usuarios, puede editar su perfil
- **Operario** → solo registros activos, NO puede eliminar, puede modificar, NO ve Usuarios, puede editar su perfil
- Login bloqueado para usuarios con `deleted_at IS NOT NULL`
- `updateUser`: no-admin solo puede editar su propio usuario (`usuario.id === parseInt(id)`)
- Solo admin puede cambiar el rol de un usuario
- Nav "Usuarios" solo visible para admin; "Mi Perfil" visible para todos
- Frontend: items eliminados se muestran opacos (`opacity-50`), solo admin ve toggle "Ver eliminados" y botón "Restaurar"
- Operarios no ven botón eliminar en ninguna vista

## Backend CRUD Status
| Entidad | Create | Read | Update | Delete (soft) |
|---------|--------|------|--------|---------------|
| Users | ✅ | ✅ | ✅ | ✅ |
| Vineyards | ✅ | ✅ | ✅ | ✅ |
| Plots | ✅ | ✅ | ✅ | ✅ |
| VineRows | ✅ | ✅ | ✅ | ✅ |
| Plants | ✅ | ✅ | ✅ | ✅ |
| Varietals | seed | ✅ | — | — |
| PlantStatus | ✅ | ✅ | ✅ (append) | — |
| Diseases | ✅ | ✅ | ✅ | ✅ |
| Treatments | ✅ | ✅ | ✅ | ✅ |
| PlantDiseases | ✅ | ✅ | ✅ | ✅ |
| PlantTreatments | ✅ | ✅ | ✅ | ✅ |
| PlantNotes | ✅ | ✅ | ✅ | ✅ |
| PlantYield | ✅ | ✅ | ✅ | ✅ |
| PlantPrunings | ✅ | ✅ | ✅ | ✅ |
| PlantPropagation | ✅ | ✅ | ✅ | ✅ |
| IrrigationSystems | ✅ | ✅ | ✅ | ✅ |
| IrrigationEvents | ✅ | ✅ | ✅ | ✅ |
| IrrigationCoverage | ✅ | ✅ | ✅ | ✅ |
| IrrigationEventImpact | ✅ | ✅ | ✅ | ✅ |
| Tasks | ✅ | ✅ | ✅ | ✅ |

## Important Notes
- **Spanish codebase**: variable names, comments, DB columns use Spanish
- **No CI/CD**, no pre-commit hooks, no test framework
- **`npm run dev` en el root** levanta ambos servicios con `concurrently`
- **`.env` is gitignored** — new setups must create `back/.env` manually
- **TypeScript strict mode** via `tsconfig.app.json` and `tsconfig.node.json`
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin (not PostCSS config)
- **Harvests frontend exists** but backend routes/controllers are NOT implemented yet (Tasks backend IS implemented)
- **Frontend build/lint are red (pre-existing)**: 17 TS errors (`CreateVineyard.tsx`, `PlotMap.tsx`, `Plots.tsx`) + 24 lint errors — needs a dedicated hygiene change
- **latitud/longitud** are DECIMAL columns for GPS positioning of each plant
