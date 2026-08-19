# Plant Data Model Specification

## Purpose

Defines the `plants` table schema, column constraints, and relationships for the vineyard management system.

## Requirements

### Requirement: Plant Entity Schema

The `plants` table SHALL store individual plant records within the vineyard hierarchy (Vineyard → Plot → VineRow → Plant). Each plant record MUST support optional varietal assignment to represent empty cells ("sin planta").

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | INT (PK, AUTO_INCREMENT) | NOT NULL | — | Unique identifier |
| `vine_row_id` | INT (FK → vine_rows.id) | NOT NULL | — | Parent vine row |
| `varietal_id` | INT (FK → varietals.id) | NULL | NULL | NULL = "sin planta" (empty cell) |
| `sistema_conduccion` | VARCHAR | NOT NULL | — | Training system |
| `codigo` | VARCHAR | NOT NULL | — | Unique plant code |
| `latitud` | DECIMAL | NULL | NULL | GPS latitude |
| `longitud` | DECIMAL | NULL | NULL | GPS longitude |
| `vigor` | VARCHAR | NULL | NULL | Enum: `sin_crecimiento`, `pequeña`, `mediana`, `grande` |
| `tutor` | BOOLEAN | NOT NULL | FALSE | Trellis support flag |
| `fecha_plantacion` | DATE | NULL | NULL | Planting date |
| `metodo_propagacion` | VARCHAR | NULL | NULL | Enum: `injerto`, `estaca`, `acodo`, `micropropagacion` |
| `observaciones` | TEXT | NULL | NULL | Free-text notes |
| `deleted_at` | TIMESTAMP | NULL | NULL | Soft delete marker |

#### Scenario: Plant with full data

- GIVEN a valid vine_row_id and sistema_conduccion
- WHEN a plant is created with all optional fields populated
- THEN the record persists with all values including vigor, tutor, fecha_plantacion, metodo_propagacion, and observaciones

#### Scenario: Plant without varietal (sin planta)

- GIVEN a valid vine_row_id and sistema_conduccion
- WHEN a plant is created with varietal_id = NULL
- THEN the record is created successfully and represents an empty cell in the plot grid

#### Scenario: Plant with minimal required data

- GIVEN a valid vine_row_id and sistema_conduccion
- WHEN a plant is created with only required fields
- THEN the record is created with NULL/defaults for all optional columns

### Requirement: Soft Delete Cascade

Plants and all their child records (plant_status_history, plant_diseases, plant_treatments, plant_notes, plant_yield, plant_prunings, plant_propagation) SHALL be soft-deleted when the parent vine_row is soft-deleted, and SHALL be restored when the parent is restored.

#### Scenario: Cascade soft delete

- GIVEN a plant with status history and disease records
- WHEN the parent vine_row is soft-deleted
- THEN the plant and all child records have deleted_at set to the current timestamp

#### Scenario: Cascade restore

- GIVEN a soft-deleted plant with soft-deleted child records
- WHEN the parent vine_row is restored (deleted_at set to NULL)
- THEN the plant and all child records have deleted_at set to NULL

### Requirement: Dual Tutor Source

The `tutor` field on the `plants` table represents the CURRENT tutor status. The `tutor` field on `plant_status_history` represents the historical value at the time of each status entry. Both sources SHALL coexist independently.

#### Scenario: Current tutor differs from historical

- GIVEN a plant with tutor = TRUE
- AND a status history entry with tutor = FALSE
- WHEN the plant's current tutor status is queried
- THEN the plants.tutor value is returned (TRUE), not the historical value

### Requirement: Propagation Table Independence

The `plant_propagation` table SHALL remain unchanged as a detailed historical log. The `metodo_propagacion` column on `plants` represents the current/latest propagation method only.

#### Scenario: Propagation log persists independently

- GIVEN a plant with metodo_propagacion = "estaca"
- AND multiple entries in plant_propagation table
- WHEN the plant's metodo_propagacion is updated to "injerto"
- THEN the plant_propagation entries remain unchanged
