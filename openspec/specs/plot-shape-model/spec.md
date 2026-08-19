# Plot Shape Model Specification

## Purpose

Defines the schema extensions for plot shape classification, terrain type, row-level metadata, and explicit plant positioning within rows.

## Requirements

### Requirement: Plot Shape Classification

The `plots` table SHALL include a `forma_parcela` column with ENUM values: `rectangular`, `trapezoidal`, `abanicado`, `terrazas`, `irregular`. The column SHALL be nullable with a default of `rectangular`. Existing plot records without a value SHALL default to `rectangular` on read.

#### Scenario: Create plot with explicit shape

- GIVEN a valid vineyard_id and plot name
- WHEN a plot is created with `forma_parcela = 'trapezoidal'`
- THEN the plot is persisted with `forma_parcela = 'trapezoidal'`

#### Scenario: Create plot without shape (default)

- GIVEN a valid vineyard_id and plot name
- WHEN a plot is created without specifying `forma_parcela`
- THEN the plot is persisted with `forma_parcela = 'rectangular'`

#### Scenario: Update plot shape

- GIVEN a plot exists with `forma_parcela = 'rectangular'`
- WHEN the plot is updated with `forma_parcela = 'abanicado'`
- THEN the plot's `forma_parcela` is updated to `'abanicado'`

#### Scenario: Existing plot without shape value

- GIVEN a plot created before the shape column existed (NULL value)
- WHEN the plot is read via API
- THEN `forma_parcela` resolves to `'rectangular'`

### Requirement: Plot Terrain Classification

The `plots` table SHALL include a `terreno` column with ENUM values: `plano`, `ladera`, `pendiente`, `con_cauce`. The column SHALL be nullable with a default of `plano`. Existing plot records without a value SHALL default to `plano` on read.

#### Scenario: Create plot with terrain type

- GIVEN a valid vineyard_id and plot name
- WHEN a plot is created with `terreno = 'ladera'`
- THEN the plot is persisted with `terreno = 'ladera'`

#### Scenario: Create plot without terrain (default)

- GIVEN a valid vineyard_id and plot name
- WHEN a plot is created without specifying `terreno`
- THEN the plot is persisted with `terreno = 'plano'`

### Requirement: Vine Row Length and Expected Plants

The `vine_rows` table SHALL include `longitud_m` (DECIMAL, NULL) and `num_plantas_esperadas` (INT, NULL). Both fields SHALL be optional — existing rows without values remain valid. `num_plantas_esperadas` SHALL represent the target plant count for the row, used for progress tracking during plant creation.

#### Scenario: Create row with length and expected plants

- GIVEN a valid plot_id
- WHEN a vine row is created with `longitud_m = 45.5` and `num_plantas_esperadas = 30`
- THEN the row is persisted with both values

#### Scenario: Create row without optional fields

- GIVEN a valid plot_id
- WHEN a vine row is created without `longitud_m` or `num_plantas_esperadas`
- THEN the row is created with both fields as NULL

#### Scenario: Update row expected plants

- GIVEN a row with `num_plantas_esperadas = 20`
- WHEN the row is updated with `num_plantas_esperadas = 25`
- THEN the row's `num_plantas_esperadas` is updated to 25

### Requirement: Explicit Plant Position in Row

The `plants` table SHALL include `posicion_en_fila` (INT, NULL) representing the plant's 0-based position index within its parent vine row. When NULL, position SHALL be inferred from creation order. When set, it SHALL be used for ordering plants within the row.

#### Scenario: Plant with explicit position

- GIVEN a vine row with `num_plantas_esperadas = 10`
- WHEN a plant is created with `posicion_en_fila = 3`
- THEN the plant is persisted at position 3 within the row

#### Scenario: Plant without position (backward compatible)

- GIVEN a vine row exists
- WHEN a plant is created without `posicion_en_fila`
- THEN the plant is created with `posicion_en_fila = NULL`
- AND ordering falls back to implicit creation order

#### Scenario: Position is 0-based

- GIVEN a row's first plant
- WHEN the plant is created with explicit position
- THEN `posicion_en_fila = 0` for the first plant

### Requirement: Backward Compatibility for Existing Data

All new columns (`forma_parcela`, `terreno`, `longitud_m`, `num_plantas_esperadas`, `posicion_en_fila`) SHALL be nullable. Existing records SHALL remain fully functional without migration. Default resolution: `forma_parcela` → `rectangular`, `terreno` → `plano`, others → NULL.

#### Scenario: Existing plot renders correctly

- GIVEN a plot created before schema changes
- WHEN the plot is rendered in the map
- THEN it renders as a rectangular grid (default shape)

#### Scenario: Existing row renders with actual plant count

- GIVEN a row created before `num_plantas_esperadas` existed
- WHEN the row is rendered in the map
- THEN it renders with its actual plant count from the plants table
