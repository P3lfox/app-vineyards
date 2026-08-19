# Plant Map Filters Specification

## Purpose

Defines visual filter toggles for the PlotMap component that highlight plants based on agronomic attributes without modifying underlying data.

## Requirements

### Requirement: Sin Tutor Filter Toggle

The PlotMap SHALL provide a toggle labeled "Mostrar sin tutor" that highlights plants where `tutor = FALSE`. The filter is visual only and SHALL NOT modify, filter out, or hide any plant records.

#### Scenario: Toggle highlights plants without tutor

- GIVEN a plot with plants where some have tutor = TRUE and others have tutor = FALSE
- WHEN the operator enables "Mostrar sin tutor"
- THEN plants with tutor = FALSE display a visual indicator (orange border)
- AND plants with tutor = TRUE render normally

#### Scenario: Toggle disabled shows all plants normally

- GIVEN the "Mostrar sin tutor" toggle is disabled
- WHEN the PlotMap renders
- THEN all plants display with standard varietal-based coloring only

#### Scenario: Toggle does not affect data

- GIVEN the "Mostrar sin tutor" toggle is enabled
- WHEN the operator views highlighted plants
- THEN no plant records are modified, deleted, or hidden from the dataset

### Requirement: Sin Planta Cell Display

Plants with `varietal_id = NULL` SHALL be rendered as "Sin planta" cells with slate gray styling, visually distinct from planted cells.

#### Scenario: Empty cell renders as slate gray

- GIVEN a plant with varietal_id = NULL exists in the plot
- WHEN the PlotMap renders
- THEN the cell displays "Sin planta" text with slate gray background

#### Scenario: Empty cell with tutor filter

- GIVEN a plant with varietal_id = NULL and tutor = FALSE
- WHEN "Mostrar sin tutor" is enabled
- THEN the cell shows both "Sin planta" styling AND the tutor indicator

### Requirement: Filter State Persistence

The filter toggle state SHALL persist for the current session but SHALL NOT persist across page navigations or browser refreshes.

#### Scenario: Filter resets on navigation

- GIVEN the "Mostrar sin tutor" toggle is enabled
- WHEN the operator navigates away from PlotMap and returns
- THEN the toggle is in the disabled (default) state
