# Plant Registration Flow Specification

## Purpose

Defines the plant creation workflow, including required and optional fields, validation rules, and the "sin planta" cell pattern.

## Requirements

### Requirement: Plant Creation Fields

The system SHALL allow operators to create plants with the following fields:

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `vine_row_id` | YES | INT (FK) | Parent vine row |
| `sistema_conduccion` | YES | VARCHAR | Training system |
| `varietal_id` | NO | INT (FK) | NULL = "sin planta" |
| `codigo` | YES | VARCHAR | Unique identifier |
| `latitud` | NO | DECIMAL | GPS position |
| `longitud` | NO | DECIMAL | GPS position |
| `vigor` | NO | VARCHAR | sin_crecimiento, pequeña, mediana, grande |
| `tutor` | NO | BOOLEAN | Default FALSE, checkbox in UI |
| `fecha_plantacion` | NO | DATE | Planting date |
| `metodo_propagacion` | NO | VARCHAR | injerto, estaca, acodo, micropropagacion |
| `observaciones` | NO | TEXT | Free-text notes |

#### Scenario: Create plant with varietal

- GIVEN a vine row exists
- WHEN an operator submits a plant with varietal_id, sistema_conduccion, and codigo
- THEN the plant is created and associated with the specified varietal

#### Scenario: Create plant without varietal (sin planta)

- GIVEN a vine row exists
- WHEN an operator submits a plant with varietal_id = NULL, sistema_conduccion, and codigo
- THEN the plant is created with varietal_id = NULL representing an empty cell

#### Scenario: Reject plant missing required fields

- GIVEN a vine row exists
- WHEN an operator submits a plant without sistema_conduccion or codigo
- THEN the system rejects the request with a validation error

#### Scenario: Create plant with all optional fields

- GIVEN a vine row exists
- WHEN an operator submits a plant with vigor, tutor, fecha_plantacion, metodo_propagacion, and observaciones
- THEN all optional fields are persisted on the plant record

### Requirement: Empty Cell Representation

A plant record with `varietal_id = NULL` SHALL represent an explicit empty cell in the plot grid. The cell exists in the grid structure but has no associated varietal.

#### Scenario: Empty cell appears in grid

- GIVEN a plant with varietal_id = NULL exists in a vine row
- WHEN the plot grid is rendered
- THEN the cell is displayed as "Sin planta" with slate gray styling

#### Scenario: Empty cell can be assigned a varietal later

- GIVEN a plant with varietal_id = NULL
- WHEN the plant is updated with a valid varietal_id
- THEN the plant transitions from "sin planta" to a planted cell

### Requirement: Batch Plant Creation

The batch creation endpoint (`createPlantsBatch`) SHALL accept the same field set as single plant creation, including nullable varietal_id and all new optional fields.

#### Scenario: Batch create mixed plants

- GIVEN a vine row with 5 cells to fill
- WHEN a batch request creates 3 plants with varietals and 2 with varietal_id = NULL
- THEN all 5 records are created in a single transaction

### Requirement: Role-Based Plant Creation

The system SHALL enforce role-based access for plant creation: admin and operario MAY create plants; enologo MAY create plants. Operarios SHALL NOT delete plants.

#### Scenario: Operario creates plant

- GIVEN an authenticated operario user
- WHEN the operario submits a valid plant creation request
- THEN the plant is created successfully
