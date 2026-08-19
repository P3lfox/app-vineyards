# Plant Health Map Visibility Specification

## Purpose

Defines enhanced visual indicators for disease and treatment states on the PlantHealthMap grid, ensuring affected plants are immediately distinguishable at a glance.

## Requirements

### Requirement: Disease Indicator Visibility

Plants with active diseases SHALL display a prominent red border that is clearly visible on 20px grid cells. The indicator MUST be distinguishable from the varietal fill color at normal viewing distance.

#### Scenario: Plant with disease renders with bold red border

- GIVEN a plant has one or more active disease records
- WHEN the PlantHealthMap renders in disease mode
- THEN the cell displays a 2px solid red border (`border-2 border-red-500`)
- AND the border is visibly thicker than the default 1px varietal border

#### Scenario: Disease indicator is visible on all varietal types

- GIVEN plants of different varietal types (tinta, blanca, rosada) have diseases
- WHEN the map renders
- THEN all affected cells show the red border regardless of fill color
- AND the red border contrasts sufficiently with violet, lime, and rose fills

### Requirement: Treatment Indicator Visibility

Plants with active treatments SHALL display a prominent blue border that is clearly visible and distinct from disease indicators.

#### Scenario: Plant with treatment renders with bold blue border

- GIVEN a plant has one or more active treatment records
- WHEN the PlantHealthMap renders in treatment mode
- THEN the cell displays a 2px solid blue border (`border-2 border-blue-500`)
- AND the blue is distinguishable from the red disease indicator

#### Scenario: Treatment indicator visible on all varietal types

- GIVEN plants of different varietal types have active treatments
- WHEN the map renders
- THEN all treated cells show the blue border regardless of fill color

### Requirement: Visual Priority When Both States Present

When a plant has both active diseases AND active treatments, the disease indicator SHALL take visual priority (red border), since disease is the more urgent condition.

#### Scenario: Plant has both disease and treatment

- GIVEN a plant has active disease records AND active treatment records
- WHEN the map renders
- THEN the cell displays the red disease border (not blue)
- AND the tooltip indicates both conditions

### Requirement: Legend Consistency

The legend swatches SHALL match the visual weight and colors used on the grid cells.

#### Scenario: Legend reflects actual indicator styling

- GIVEN the map renders disease and treatment indicators
- WHEN the user views the legend
- THEN the disease swatch uses the same 2px red border as grid cells
- AND the treatment swatch uses the same 2px blue border as grid cells

### Requirement: No Data Modification

The visual changes SHALL NOT modify, filter, hide, or alter any plant records or health data.

#### Scenario: Indicators are visual only

- GIVEN the enhanced indicators are active
- WHEN the user views the map
- THEN all plants render with their original data intact
- AND clicking a cell opens the same PlantHealthModal as before
