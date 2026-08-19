# Delta for Plot Irrigation Assignment

## ADDED Requirements

### Requirement: Plot Irrigation System Assignment

The system SHALL allow each plot to have an optional `irrigation_system_id` foreign key referencing `irrigation_systems.id`. When creating a plot, the user MAY select one of the 5 fixed irrigation system types. When editing a plot, the user MAY change or remove the assigned irrigation system. Plots without an assigned system SHALL have `irrigation_system_id: null`. The plot create and update endpoints SHALL accept `irrigation_system_id` as an optional field.

#### Scenario: Create plot with irrigation system

- GIVEN the 5 irrigation system types exist
- WHEN a user creates a plot and selects an irrigation system
- THEN the system stores the plot with the selected `irrigation_system_id`
- AND the plot response includes `irrigation_system_id` and `sistema_tipo` (via JOIN)

#### Scenario: Create plot without irrigation system

- GIVEN the 5 irrigation system types exist
- WHEN a user creates a plot without selecting an irrigation system
- THEN the system stores the plot with `irrigation_system_id: null`
- AND the plot response includes `irrigation_system_id: null`

#### Scenario: Edit plot to change irrigation system

- GIVEN a plot exists with an assigned irrigation system
- WHEN a user edits the plot and selects a different system
- THEN the system updates the plot's `irrigation_system_id`
- AND the updated plot response reflects the new `sistema_tipo`

#### Scenario: Edit plot to remove irrigation system

- GIVEN a plot exists with an assigned irrigation system
- WHEN a user edits the plot and clears the system selection
- THEN the system sets `irrigation_system_id` to null
- AND the plot response shows `irrigation_system_id: null`

### Requirement: Plot Response Includes System Info

The system SHALL include `irrigation_system_id` and `sistema_tipo` in plot API responses via a LEFT JOIN on `irrigation_systems`. The join SHALL be a LEFT JOIN so plots without a system still return with null values.

#### Scenario: Plot with system returns joined data

- GIVEN a plot has `irrigation_system_id = 1` (goteo)
- WHEN a client calls GET for that plot
- THEN the response includes `irrigation_system_id: 1` and `sistema_tipo: "goteo"`

#### Scenario: Plot without system returns null

- GIVEN a plot has `irrigation_system_id: null`
- WHEN a client calls GET for that plot
- THEN the response includes `irrigation_system_id: null` and `sistema_tipo: null`

### Requirement: Plot Create/Edit Form System Selector

The system SHALL display a dropdown selector for irrigation system types in the plot create and edit forms. The dropdown SHALL list all 5 fixed types from `GET /api/irrigation-systems/getIrrigationSystems`. The selector SHALL allow clearing (null selection). The field SHALL be optional — not required for form submission.

#### Scenario: Create form shows system dropdown

- GIVEN the user is on the plot creation form
- WHEN the form renders
- THEN a dropdown with all 5 irrigation system types is visible
- AND the user can select one or leave it empty

#### Scenario: Edit form pre-fills current system

- GIVEN the user is editing a plot with an assigned irrigation system
- WHEN the edit form renders
- THEN the system dropdown shows the plot's current system as selected
