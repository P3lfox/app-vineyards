# Irrigation Events Specification

## Purpose

Define the frontend UI and backend API for managing irrigation events — creating, listing, and viewing events with coverage and impact data. Events track when and how much water was applied to each plot, inheriting the irrigation system from the plot's assignment. The workflow supports created → in_progress → completed states with interactive plant selection.

## Requirements

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

### Requirement: Edit Irrigation Event

The system SHALL allow users with admin or enólogo role to edit an existing irrigation event via an inline form pre-filled with current values. The edit form SHALL use the same fields as the create form. On success, the updated event SHALL reflect in the list.

#### Scenario: Edit event successfully

- GIVEN the user has admin or enólogo role
- WHEN the user clicks edit on an event card
- THEN an inline form appears pre-filled with the event's current values
- AND the user modifies one or more fields and submits
- THEN the system sends a PUT request to `/api/irrigation-events/update/:id`
- AND the updated values appear in the event card

#### Scenario: Cancel edit

- GIVEN the user has opened the edit form for an event
- WHEN the user clicks cancel
- THEN the form closes and the event card returns to display mode
- AND no API call is made

### Requirement: Soft Delete and Restore

The system SHALL allow admin and enólogo users to soft-delete irrigation events. Admin users SHALL see a "Ver eliminados" toggle that, when enabled, displays soft-deleted events with opacity-50 styling. Admin users SHALL be able to restore deleted events. Operario users SHALL NOT see delete or restore buttons.

#### Scenario: Admin deletes event

- GIVEN the user has admin role
- WHEN the user clicks delete on an event
- THEN the system sends a DELETE request to `/api/irrigation-events/delete/:id`
- AND the event is removed from the active list

#### Scenario: Admin views deleted events

- GIVEN the user has admin role and deleted events exist
- WHEN the user enables the "Ver eliminados" toggle
- THEN the system fetches and displays soft-deleted events
- AND each deleted event is rendered with opacity-50 styling
- AND a restore button is visible on each deleted event

#### Scenario: Admin restores event

- GIVEN the user has admin role and the "Ver eliminados" toggle is enabled
- WHEN the user clicks restore on a deleted event
- THEN the system sends a PUT request to `/api/irrigation-events/restore/:id`
- AND the event reappears in the active list
- AND the event is removed from the deleted list

#### Scenario: Enólogo deletes event

- GIVEN the user has enólogo role
- WHEN the user clicks delete on an event
- THEN the system sends a DELETE request to `/api/irrigation-events/delete/:id`
- AND the event is removed from the active list
- AND the user does NOT see a "Ver eliminados" toggle

#### Scenario: Operario cannot delete

- GIVEN the user has operario role
- WHEN the user views the irrigation events list
- THEN no delete button is visible on any event card

### Requirement: Role-Based Access Control

The system SHALL enforce role-based permissions for irrigation events: all active roles (admin, enólogo, operario) MAY view and create events. Admin and enólogo MAY edit and delete events. Operario SHALL NOT delete events. Only admin MAY see the "Ver eliminados" toggle and restore deleted events.

#### Scenario: Admin sees all actions

- GIVEN the user has admin role
- WHEN the user views an event card
- THEN edit, delete, and restore (when toggle enabled) buttons are visible

#### Scenario: Enólogo sees limited actions

- GIVEN the user has enólogo role
- WHEN the user views an event card
- THEN edit and delete buttons are visible
- AND no "Ver eliminados" toggle is visible

#### Scenario: Operario sees view and create only

- GIVEN the user has operario role
- WHEN the user views the irrigation events page
- THEN only the create form and event list are visible
- AND no edit, delete, or restore buttons are visible

### Requirement: Backend Restore Endpoint

The system SHALL provide a `PUT /api/irrigation-events/restore/:id` endpoint that sets `deleted_at = NULL` for the specified irrigation event. The endpoint SHALL be protected by JWT middleware and restricted to admin role only. On success, it SHALL return a confirmation message. On failure (event not found or already active), it SHALL return an appropriate error.

#### Scenario: Restore existing deleted event

- GIVEN a soft-deleted irrigation event exists (deleted_at IS NOT NULL)
- WHEN an admin sends PUT to `/api/irrigation-events/restore/:id`
- THEN the system sets deleted_at = NULL for that event
- AND returns a 200 response with a success message

#### Scenario: Restore non-existent event

- GIVEN no irrigation event exists with the given ID
- WHEN a request is sent to `/api/irrigation-events/restore/:id`
- THEN the system returns a 404 error

#### Scenario: Restore already active event

- GIVEN an irrigation event that is not soft-deleted (deleted_at IS NULL)
- WHEN a request is sent to `/api/irrigation-events/restore/:id`
- THEN the system returns a 400 error indicating the event is not deleted

#### Scenario: Unauthorized access

- GIVEN a user without admin role (or no valid JWT)
- WHEN the user sends PUT to `/api/irrigation-events/restore/:id`
- THEN the system returns a 401 or 403 error

## Navigation and Routing

### Requirement: Page Route and Navigation

The system SHALL register the route `/irrigation-events` in the frontend router and display a "Eventos de Riego" navigation item in the sidebar layout. The nav item SHALL be visible to all authenticated users.

#### Scenario: Navigate to irrigation events

- GIVEN the user is authenticated
- WHEN the user clicks "Eventos de Riego" in the sidebar
- THEN the system navigates to `/irrigation-events`
- AND the irrigation events page loads

#### Scenario: Direct URL access

- GIVEN the user has a valid JWT
- WHEN the user navigates directly to `/irrigation-events`
- THEN the page loads and displays the irrigation events list
