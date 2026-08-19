# Plant Detail Display Specification

## Purpose

Defines the PlantDetail view layout, including the header section that displays plant agronomic data and the "sin planta" empty state.

## Requirements

### Requirement: Plant Detail Header Fields

The PlantDetail header SHALL display the following fields when a plant record exists:

| Field | Display | Notes |
|-------|---------|-------|
| Varietal name | Text | Or "Sin planta" if varietal_id = NULL |
| Vigor | Badge/text | Only if set (NULL = hidden) |
| Tutor status | Icon/text | "Con tutor" or "Sin tutor" |
| Fecha plantación | Date | Only if set (NULL = hidden) |
| Método propagación | Text | Only if set (NULL = hidden) |
| Observaciones | Text block | Only if set (NULL = hidden) |

#### Scenario: Display plant with all fields

- GIVEN a plant with varietal, vigor, tutor, fecha_plantacion, metodo_propagacion, and observaciones
- WHEN the operator opens PlantDetail
- THEN the header displays all fields with their values

#### Scenario: Display plant with minimal fields

- GIVEN a plant with only varietal and sistema_conduccion
- WHEN the operator opens PlantDetail
- THEN the header shows varietal and hides optional fields that are NULL

### Requirement: Sin Planta Detail View

When `varietal_id = NULL`, the PlantDetail view SHALL display an empty state message: "Esta celda no tiene planta registrada" and SHALL provide an action to assign a varietal to the cell.

#### Scenario: Empty cell detail shows assignment option

- GIVEN a plant with varietal_id = NULL
- WHEN the operator opens PlantDetail for that cell
- THEN the view shows "Esta celda no tiene planta registrada"
- AND an action to assign a varietal is available

#### Scenario: Assign varietal from detail view

- GIVEN a plant with varietal_id = NULL
- WHEN the operator selects a varietal from the assignment action
- THEN the plant's varietal_id is updated and the detail view refreshes with varietal data

### Requirement: Tab Navigation

The PlantDetail view SHALL maintain its existing tab structure (status, diseases, treatments, notes, yield, prunings, propagation, irrigation impact) regardless of whether the plant has a varietal.

#### Scenario: Tabs available for sin planta cell

- GIVEN a plant with varietal_id = NULL
- WHEN the operator opens PlantDetail
- THEN all tabs are accessible but show empty/appropriate states for the unassigned cell
