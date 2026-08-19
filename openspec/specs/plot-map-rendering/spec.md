# Plot Map Rendering Specification

## Purpose

Defines how the PlotMap component renders vine rows with actual per-row plant counts and applies shape-based alignment strategies for different plot shapes.

## Requirements

### Requirement: Per-Row Plant Count Rendering

The PlotMap SHALL render each vine row using its actual plant count (number of plant records in that row), NOT the maximum plant count across all rows. Grid cells SHALL correspond one-to-one with actual plant records.

#### Scenario: Row with fewer plants than max

- GIVEN a plot with 3 rows having 10, 7, and 10 plants respectively
- WHEN the PlotMap renders
- THEN row 1 shows 10 cells, row 2 shows 7 cells, row 3 shows 10 cells
- AND row 2 does NOT show 10 cells padded with empty slots

#### Scenario: Row with zero plants

- GIVEN a vine row exists with no associated plants
- WHEN the PlotMap renders
- THEN the row shows 0 cells (empty row indicator)

#### Scenario: All rows have same count (rectangular)

- GIVEN a rectangular plot where all rows have exactly 15 plants
- WHEN the PlotMap renders
- THEN each row shows exactly 15 cells

### Requirement: Rectangular Shape Alignment

When `forma_parcela = 'rectangular'`, all rows SHALL be left-aligned in the grid. This preserves the current rendering behavior.

#### Scenario: Rectangular plot renders left-aligned

- GIVEN a plot with `forma_parcela = 'rectangular'`
- WHEN the PlotMap renders
- THEN all rows are left-aligned to the same starting column

### Requirement: Trapezoidal and Abanicado Shape Alignment

When `forma_parcela` is `trapezoidal` or `abanicado`, rows SHALL be center-aligned to visually represent the narrowing effect. Rows with fewer plants SHALL appear centered relative to the widest row.

#### Scenario: Trapezoidal plot shows center-aligned rows

- GIVEN a plot with `forma_parcela = 'trapezoidal'` and rows with 10, 8, 6, 4 plants
- WHEN the PlotMap renders
- THEN each row is centered horizontally
- AND the visual effect shows rows narrowing toward one end

#### Scenario: Abanicado plot shows center-aligned rows

- GIVEN a plot with `forma_parcela = 'abanicado'` and varying row lengths
- WHEN the PlotMap renders
- THEN rows are center-aligned to show the fan-shaped narrowing

### Requirement: Terrazas Shape Offset Rendering

When `forma_parcela = 'terrazas'`, rows SHALL display with staggered/offset positioning to represent terrace levels. Each successive row SHALL have a visual offset indicator.

#### Scenario: Terrazas plot shows staggered rows

- GIVEN a plot with `forma_parcela = 'terrazas'`
- WHEN the PlotMap renders
- THEN each row has a visible offset from the previous row
- AND the staggered appearance suggests terrace levels

### Requirement: Irregular Shape Rendering

When `forma_parcela = 'irregular'`, rows SHALL render with their actual plant counts without special alignment. Each row stands independently.

#### Scenario: Irregular plot renders without alignment

- GIVEN a plot with `forma_parcela = 'irregular'` and rows with 12, 5, 9, 3 plants
- WHEN the PlotMap renders
- THEN each row shows its actual plant count
- AND no center-alignment or staggering is applied

### Requirement: Cell Content and Empty State

Each grid cell SHALL display the plant's varietal color if a varietal is assigned. Cells for plants with `varietal_id = NULL` SHALL display as "sin planta" with slate gray styling.

#### Scenario: Planted cell shows varietal color

- GIVEN a plant with `varietal_id = 5` (Malbec)
- WHEN the cell renders in the PlotMap
- THEN the cell displays the Malbec varietal color

#### Scenario: Empty cell shows sin planta

- GIVEN a plant with `varietal_id = NULL`
- WHEN the cell renders in the PlotMap
- THEN the cell displays "Sin planta" with slate gray styling

### Requirement: Hover Tooltip

Hovering over any grid cell SHALL display a tooltip with: row number, plant position within row, and varietal name (or "Sin planta" if no varietal).

#### Scenario: Tooltip shows plant details

- GIVEN a plant at row 3, position 5 with varietal "Bonarda"
- WHEN the user hovers over the cell
- THEN the tooltip shows: "Fila 3, Posición 5, Bonarda"

#### Scenario: Tooltip for empty cell

- GIVEN a plant with `varietal_id = NULL` at row 2, position 1
- WHEN the user hovers over the cell
- THEN the tooltip shows: "Fila 2, Posición 1, Sin planta"
