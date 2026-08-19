# Delta for Irrigation Events

## MODIFIED Requirements

### Requirement: Create Irrigation Event

The system SHALL provide an inline form to create a new irrigation event. The form SHALL include: plot selector (dropdown of all active plots), fecha (date input, default today), duracion_min (number, optional), mm_aplicados (number, optional), presion_media_bar (number, optional), caudal_l_h (number, optional), observaciones (textarea, optional). The fields plot and fecha SHALL be required. The irrigation system SHALL be auto-inherited from the selected plot's `irrigation_system_id` — the user SHALL NOT select a system manually. On success, the event SHALL appear in the list and the form SHALL clear. On error, the system SHALL display an alert with the error message.
(Previously: Required manual selection of irrigation system; did not include presion_media_bar or caudal_l_h fields)

#### Scenario: Create event with all fields

- GIVEN the user is on `/irrigation-events` with the create form visible
- WHEN the user selects a plot, enters fecha, duracion_min, mm_aplicados, presion_media_bar, caudal_l_h, and observaciones
- AND submits the form
- THEN the system sends a POST request to `/api/irrigation-events/create`
- AND the event inherits `irrigation_system_id` from the selected plot
- AND the new event appears at the top of the list (fecha DESC)
- AND the form fields are cleared

#### Scenario: Create event with required fields only

- GIVEN the user is on `/irrigation-events`
- WHEN the user selects a plot, enters fecha, and submits (leaving optional fields blank)
- THEN the system creates the event with null duracion_min, mm_aplicados, presion_media_bar, caudal_l_h, observaciones
- AND the event inherits `irrigation_system_id` from the selected plot
- AND the event appears in the list

#### Scenario: Validation — missing required field

- GIVEN the create form is visible
- WHEN the user submits without selecting a plot or fecha
- THEN the system prevents submission and shows a validation error

#### Scenario: Create event for plot without irrigation system

- GIVEN a plot exists with `irrigation_system_id: null`
- WHEN the user selects that plot and submits the create form
- THEN the system creates the event with `irrigation_system_id: null`
- AND the event response shows `sistema_tipo: null`

#### Scenario: Create error

- GIVEN the backend returns 400 or 500 on create
- WHEN the user submits the form
- THEN the system displays an alert with the error message
- AND the form retains the entered values

### Requirement: View Irrigation Events

The system SHALL display a paginated or scrollable list of all active irrigation events across all plots, ordered by fecha DESC. Each event card SHALL show: plot name (from JOIN on plots), fecha, sistema_tipo (from JOIN on plots → irrigation_systems), duracion_min, mm_aplicados, presion_media_bar, caudal_l_h, and observaciones. The system SHALL show a loading state while fetching and an empty state when no events exist.
(Previously: sistema_tipo came from direct JOIN on irrigation_systems via event's own system_id; did not show presion_media_bar or caudal_l_h)

#### Scenario: Load events successfully

- GIVEN the user is on the `/irrigation-events` page
- WHEN the page loads
- THEN the system fetches events from all plots via the API
- AND displays each event as a card showing plot name, fecha, sistema_tipo, duracion_min, mm_aplicados, presion_media_bar, caudal_l_h, observaciones
- AND events are sorted by fecha DESC
- AND sistema_tipo is resolved via JOIN: events → plots → irrigation_systems

#### Scenario: Loading state

- GIVEN the user navigates to `/irrigation-events`
- WHEN the API request is in flight
- THEN the system displays a loading indicator (spinner or skeleton)

#### Scenario: Empty state

- GIVEN no irrigation events exist in the database
- WHEN the user visits `/irrigation-events`
- THEN the system displays an empty state message ("No hay eventos de riego registrados")

#### Scenario: API error

- GIVEN the backend is unreachable or returns 5xx
- WHEN the system attempts to fetch events
- THEN the system displays an error alert with the error message

### Requirement: Event Detail with Coverage and Impact

The system SHALL provide an event detail view that returns the event record plus all associated coverage records and impact records. Coverage records SHALL be grouped by vine row. Impact records SHALL be grouped by plant. The detail endpoint SHALL be `GET /api/irrigation-events/getIrrigationEvent/:id`.
(Previously: No event detail endpoint with coverage/impact association existed)

#### Scenario: View event detail with coverage and impact

- GIVEN an event has been completed with coverage and impact records
- WHEN the user views the event detail
- THEN the system returns the event data
- AND all associated coverage records (grouped by row)
- AND all associated impact records (grouped by plant)

#### Scenario: View event with no coverage or impact

- GIVEN an event was created but never completed (no plants selected)
- WHEN the user views the event detail
- THEN the system returns the event data
- AND empty arrays for coverage and impact records

## ADDED Requirements

### Requirement: Events by Plot with System Info

The system SHALL provide `GET /api/irrigation-events/getIrrigationEvents/:plot_id` that returns all events for a specific plot. Each event SHALL include `sistema_tipo` via JOIN on plots → irrigation_systems. The endpoint SHALL be protected by JWT middleware.

#### Scenario: Get events for a plot

- GIVEN a plot has 3 irrigation events
- WHEN a client calls `GET /api/irrigation-events/getIrrigationEvents/:plot_id`
- THEN the system returns all 3 events with plot_nombre and sistema_tipo
- AND events are sorted by fecha DESC

#### Scenario: Get events for plot with no events

- GIVEN a plot has no irrigation events
- WHEN a client calls `GET /api/irrigation-events/getIrrigationEvents/:plot_id`
- THEN the system returns an empty array
