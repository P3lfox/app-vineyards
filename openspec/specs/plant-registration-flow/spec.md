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
| `posicion_en_fila` | NO | INT | 0-based position in row, auto-assigned sequentially |

When the parent vine row has `num_plantas_esperadas` set, the creation form SHALL display progress as "Planta X de Y". The `posicion_en_fila` field SHALL be auto-assigned sequentially (0, 1, 2, ...) based on existing plant count in the row. The user MAY override `posicion_en_fila` manually if needed. GPS fields (latitud, longitud) remain optional.

#### Scenario: Create plant with varietal

- GIVEN a vine row exists
- WHEN an operator submits a plant with varietal_id, sistema_conduccion, and codigo
- THEN the plant is created and associated with the specified varietal
- AND `posicion_en_fila` is auto-assigned to the next available index

#### Scenario: Create plant without varietal (sin planta)

- GIVEN a vine row exists
- WHEN an operator submits a plant with varietal_id = NULL, sistema_conduccion, and codigo
- THEN the plant is created with varietal_id = NULL representing an empty cell
- AND `posicion_en_fila` is auto-assigned to the next available index

#### Scenario: Reject plant missing required fields

- GIVEN a vine row exists
- WHEN an operator submits a plant without sistema_conduccion or codigo
- THEN the system rejects the request with a validation error

#### Scenario: Create plant with all optional fields

- GIVEN a vine row exists
- WHEN an operator submits a plant with vigor, tutor, fecha_plantacion, metodo_propagacion, and observaciones
- THEN all optional fields are persisted on the plant record

#### Scenario: Progress indicator when expected plants set

- GIVEN a vine row with `num_plantas_esperadas = 20` and 5 existing plants
- WHEN the operator creates the next plant
- THEN the form displays "Planta 6 de 20"

#### Scenario: No progress indicator when expected plants not set

- GIVEN a vine row with `num_plantas_esperadas = NULL`
- WHEN the operator creates a plant
- THEN no "X de Y" progress indicator is shown

#### Scenario: Manual position override

- GIVEN a vine row with 3 existing plants (positions 0, 1, 2)
- WHEN the operator manually sets `posicion_en_fila = 5`
- THEN the plant is created at position 5
- AND positions 3 and 4 remain available for future plants

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

The batch creation endpoint (`createPlantsBatch`) SHALL accept the same field set as single plant creation, including nullable varietal_id, `posicion_en_fila`, and all optional fields. When `posicion_en_fila` is not provided for batch items, positions SHALL be auto-assigned sequentially.

#### Scenario: Batch create mixed plants

- GIVEN a vine row with 5 cells to fill
- WHEN a batch request creates 3 plants with varietals and 2 with varietal_id = NULL
- THEN all 5 records are created in a single transaction
- AND each plant receives an auto-assigned `posicion_en_fila`

#### Scenario: Batch create with explicit positions

- GIVEN a vine row
- WHEN a batch request creates plants with explicit `posicion_en_fila` values 0, 2, 4
- THEN plants are created at those specific positions
- AND positions 1 and 3 remain available

### Requirement: Role-Based Plant Creation

The system SHALL enforce role-based access for plant creation: admin and operario MAY create plants; enologo MAY create plants. Operarios SHALL NOT delete plants.

#### Scenario: Operario creates plant

- GIVEN an authenticated operario user
- WHEN the operario submits a valid plant creation request
- THEN the plant is created successfully
