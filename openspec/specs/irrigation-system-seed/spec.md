# Delta for Irrigation System Seed

## ADDED Requirements

### Requirement: Fixed Seed Types

The system SHALL maintain exactly 5 fixed irrigation system types in the `irrigation_systems` table: goteo, manta, aspersión, surco, microaspersión. Each type SHALL have: `id` (auto-increment), `tipo` (unique string), `descripcion` (nullable string). The system SHALL seed these 5 rows on first application run. The `irrigation_systems` table SHALL be read-only — no create, update, delete, or restore operations SHALL be available via API.

#### Scenario: Seed data exists on first run

- GIVEN a fresh database with no irrigation_systems rows
- WHEN the application initializes
- THEN the system inserts exactly 5 rows: goteo, manta, aspersión, surco, microaspersión
- AND each row has a unique `tipo` value

#### Scenario: Seed does not duplicate on re-run

- GIVEN the 5 seed rows already exist
- WHEN the application initializes again
- THEN no duplicate rows are inserted
- AND the table still contains exactly 5 rows

#### Scenario: GET returns all 5 types

- GIVEN the database is seeded
- WHEN a client calls `GET /api/irrigation-systems/getIrrigationSystems`
- THEN the system returns all 5 types with id, tipo, and descripcion
- AND the response is sorted by id ASC

### Requirement: Read-Only API Endpoint

The system SHALL provide `GET /api/irrigation-systems/getIrrigationSystems` that returns the 5 fixed types. The endpoint SHALL be protected by JWT middleware. The endpoint SHALL NOT support POST, PUT, PATCH, or DELETE methods. Any attempt to write to the irrigation_systems table via API SHALL return 405 Method Not Allowed.

#### Scenario: Authenticated user reads types

- GIVEN a valid JWT token
- WHEN the user sends GET to `/api/irrigation-systems/getIrrigationSystems`
- THEN the system returns 200 with the 5 irrigation types

#### Scenario: Unauthenticated access rejected

- GIVEN no valid JWT token
- WHEN a request is sent to `/api/irrigation-systems/getIrrigationSystems`
- THEN the system returns 401 Unauthorized

#### Scenario: POST method rejected

- GIVEN a valid JWT token
- WHEN a client sends POST to `/api/irrigation-systems/create` (or any write endpoint)
- THEN the system returns 404 or 405 (endpoint does not exist)

### Requirement: No CRUD Endpoints

The system SHALL NOT expose create, update, delete, or restore endpoints for irrigation_systems. The previous CRUD endpoints (`/api/irrigation-systems/create`, `/update/:id`, `/delete/:id`, `/restore/:id`) SHALL be removed. The frontend page `IrrigationSystems.tsx` SHALL be replaced with a read-only reference view or removed entirely.

#### Scenario: Old create endpoint removed

- GIVEN the previous create endpoint existed
- WHEN a client sends POST to `/api/irrigation-systems/create`
- THEN the system returns 404 Not Found

#### Scenario: Old delete endpoint removed

- GIVEN the previous delete endpoint existed
- WHEN a client sends DELETE to `/api/irrigation-systems/delete/:id`
- THEN the system returns 404 Not Found
