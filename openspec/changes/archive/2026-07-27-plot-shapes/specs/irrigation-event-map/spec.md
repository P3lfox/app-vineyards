# Delta for Irrigation Event Workflow

## MODIFIED Requirements

### Requirement: Interactive Plant Selection Map

The system SHALL display an interactive map of the plot's vine rows and plants when the user initiates the "start" phase of an irrigation event. The map SHALL render each row with its actual plant count (number of plant records in that row), NOT a uniform maximum across all rows. Shape-based alignment (center for trapezoidal/abanicado, staggered for terrazas, left for rectangular) SHALL apply identically to PlotMap. Each plant cell SHALL be clickable to toggle its watered state. The map SHALL visually distinguish watered vs. non-watered plants.
(Previously: Map rendered all rows with uniform maxPlantsInRow cells regardless of actual plant count.)

#### Scenario: Start event shows plot map

- GIVEN an irrigation event has been created for a plot with plants
- WHEN the user clicks "start" on the event
- THEN the system displays an interactive map of the plot
- AND each row renders with its actual plant count
- AND shape-based alignment is applied based on the plot's `forma_parcela`
- AND all plants are initially unselected (not watered)

#### Scenario: Toggle plant watered state

- GIVEN the interactive map is visible
- WHEN the user clicks on a plant cell
- THEN the cell toggles to watered state (visual indicator changes)
- AND clicking again toggles it back to unwatered

#### Scenario: Map for plot with no plants

- GIVEN an irrigation event is created for a plot with no plants
- WHEN the user clicks "start"
- THEN the system displays an empty state message ("Esta parcela no tiene plantas registradas")

#### Scenario: Row with fewer plants renders correctly

- GIVEN a plot with rows having 10, 6, and 10 plants
- WHEN the irrigation map renders
- THEN the middle row shows exactly 6 clickable cells
- AND NOT 10 cells with 4 inactive

### Requirement: Per-Row Coverage Level

The system SHALL allow the user to set a coverage level per vine row: `completa` (all plants in row watered), `parcial` (some plants watered), or `ninguna` (no plants watered). Coverage calculation SHALL be based on the actual plant count in each row. The coverage level SHALL auto-update based on plant selection: if all plants in a row are selected → `completa`; if some → `parcial`; if none → `ninguna`. The user MAY also manually override the coverage level.
(Previously: Coverage was calculated against a uniform max plant count per row.)

#### Scenario: Auto-coverage — all plants selected

- GIVEN a row has 8 actual plants
- WHEN the user selects all 8 plants in that row
- THEN the row's coverage level auto-sets to `completa`

#### Scenario: Auto-coverage — partial selection

- GIVEN a row has 8 actual plants
- WHEN the user selects 3 of the 8 plants
- THEN the row's coverage level auto-sets to `parcial`

#### Scenario: Auto-coverage — no selection

- GIVEN a row has 8 actual plants
- WHEN the user selects 0 plants in that row
- THEN the row's coverage level auto-sets to `ninguna`

#### Scenario: Manual override of coverage level

- GIVEN a row has coverage level `completa`
- WHEN the user manually changes it to `parcial`
- THEN the row's coverage level updates to `parcial`
- AND the manual override persists even if plant selection changes

### Requirement: Plant Impact Recording

The system SHALL allow the user to record impact data for each watered plant: `llegada_agua` (boolean — did water reach the plant), `hubo_cortes` (boolean — were there water interruptions), `observaciones` (optional text). Impact data SHALL be collected per plant during the "finishing" phase of the event. Watered plants SHALL be tracked by plant ID, not by array index.
(Previously: Plants were implicitly tracked by grid position.)

#### Scenario: Mark plant as watered with impact

- GIVEN the user is finishing an event
- WHEN the user marks a plant as watered
- THEN the system records `llegada_agua: true` for that plant by its ID
- AND the user can optionally set `hubo_cortes` and `observaciones`

#### Scenario: Mark plant as not reached by water

- GIVEN the user is finishing an event
- WHEN the user marks a plant as not reached by water
- THEN the system records `llegada_agua: false` for that plant by its ID

### Requirement: Transactional Bulk Save

The system SHALL save all coverage records (one per watered row) and impact records (one per watered plant) in a single database transaction when the user clicks "finish" on the event. If any record fails to insert, the entire transaction SHALL rollback and the user SHALL see an error message. Coverage records SHALL include: `irrigation_event_id`, `irrigation_vine_row_id`, `cobertura`. Impact records SHALL include: `irrigation_event_id`, `plant_id`, `llegada_agua`, `hubo_cortes`, `observaciones`.
(Previously: No change — impact records already use plant_id.)

#### Scenario: Successful bulk save

- GIVEN the user has selected plants and set coverage levels
- WHEN the user clicks "finish" on the event
- THEN the system creates all coverage records in one transaction
- AND creates all impact records in the same transaction
- AND the event status changes to "completed"
- AND the user sees a success confirmation

#### Scenario: Bulk save rollback on failure

- GIVEN the user has selected plants and set coverage levels
- WHEN the user clicks "finish" and one record fails (e.g., constraint violation)
- THEN the system rolls back all coverage and impact inserts
- AND the event remains in its previous state
- AND the user sees an error message

#### Scenario: Finish with no selections

- GIVEN the user started an event but selected no plants
- WHEN the user clicks "finish"
- THEN the system creates no coverage or impact records
- AND the event is marked as completed with zero coverage

### Requirement: Event Workflow States

The system SHALL track event workflow states: `created` (event exists but not started), `in_progress` (map is open, user is selecting plants), `completed` (user finished and saved coverage/impact). The event SHALL transition from `created` → `in_progress` when the user clicks "start", and from `in_progress` → `completed` when the user clicks "finish".
(Previously: No change to state machine.)

#### Scenario: Event starts

- GIVEN an event exists with status `created`
- WHEN the user clicks "start"
- THEN the event status changes to `in_progress`
- AND the interactive map opens

#### Scenario: Event completes

- GIVEN an event has status `in_progress`
- WHEN the user clicks "finish" and bulk save succeeds
- THEN the event status changes to `completed`
- AND the user returns to the event detail view
