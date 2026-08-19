# Plot Shape Creation Specification

## Purpose

Defines the user-facing forms and API endpoints for creating and editing plots with shape/terrain metadata, vine rows with length and expected plant count, and the backend acceptance of these fields.

## Requirements

### Requirement: Plot Create Form with Shape and Terrain

The plot creation form SHALL include dropdown selectors for `forma_parcela` (values: rectangular, trapezoidal, abanicado, terrazas, irregular) and `terreno` (values: plano, ladera, pendiente, con_cauce). Both fields SHALL be optional with defaults of `rectangular` and `plano` respectively. The form SHALL submit these fields to `POST /api/plots/create`.

#### Scenario: Create plot with shape and terrain

- GIVEN the user is on the plot creation form
- WHEN the user selects `forma_parcela = 'trapezoidal'` and `terreno = 'ladera'`
- AND submits the form
- THEN the system sends a POST request including both fields
- AND the plot is created with the selected values

#### Scenario: Create plot with defaults

- GIVEN the user is on the plot creation form
- WHEN the user does not select shape or terrain
- AND submits the form
- THEN the system sends the request without these fields (or with defaults)
- AND the plot is created with `forma_parcela = 'rectangular'` and `terreno = 'plano'`

#### Scenario: Dropdown shows all shape options

- GIVEN the plot creation form is rendered
- WHEN the user opens the `forma_parcela` dropdown
- THEN all 5 options are visible: rectangular, trapezoidal, abanicado, terrazas, irregular

### Requirement: Plot Edit Form with Shape and Terrain

The plot edit form SHALL pre-fill `forma_parcela` and `terreno` with the plot's current values. The user SHALL be able to change or clear these selections. The form SHALL submit to `PUT /api/plots/update/:id`.

#### Scenario: Edit form pre-fills current values

- GIVEN a plot with `forma_parcela = 'abanicado'` and `terreno = 'pendiente'`
- WHEN the user opens the edit form
- THEN the shape dropdown shows 'abanicado' and terrain shows 'pendiente'

#### Scenario: Change plot shape

- GIVEN a plot with `forma_parcela = 'rectangular'`
- WHEN the user changes it to 'terrazas' and saves
- THEN the system sends a PUT request with the updated value
- AND the plot's shape is updated

### Requirement: Vine Row Form with Length and Expected Plants

The vine row creation form SHALL include optional numeric inputs for `longitud_m` (decimal, meters) and `num_plantas_esperadas` (integer). Both fields SHALL be optional. The form SHALL submit to the existing vine row create endpoint.

#### Scenario: Create row with length and expected plants

- GIVEN the user is on the vine row creation form
- WHEN the user enters `longitud_m = 50.0` and `num_plantas_esperadas = 35`
- AND submits the form
- THEN the system sends a POST request with both fields
- AND the row is created with the specified values

#### Scenario: Create row without optional fields

- GIVEN the user is on the vine row creation form
- WHEN the user leaves `longitud_m` and `num_plantas_esperadas` empty
- AND submits the form
- THEN the system sends the request without these fields
- AND the row is created with both fields as NULL

### Requirement: Backend Accepts New Fields on Plots

The `POST /api/plots/create` and `PUT /api/plots/update/:id` endpoints SHALL accept `forma_parcela` and `terreno` as optional fields. Invalid ENUM values SHALL be rejected with a 400 error. NULL or omitted values SHALL default to `rectangular` and `plano` respectively.

#### Scenario: Create plot with valid shape values

- GIVEN a valid JWT and plot data
- WHEN a POST request includes `forma_parcela: 'irregular'` and `terreno: 'con_cauce'`
- THEN the plot is created with those values
- AND the response includes the stored values

#### Scenario: Reject invalid shape value

- GIVEN a valid JWT and plot data
- WHEN a POST request includes `forma_parcela: 'circular'`
- THEN the system returns a 400 error

#### Scenario: Update plot shape

- GIVEN a plot exists with `forma_parcela = 'rectangular'`
- WHEN a PUT request updates `forma_parcela` to 'trapezoidal'
- THEN the plot is updated and the response reflects the new value

### Requirement: Backend Accepts New Fields on Vine Rows

The vine row create and update endpoints SHALL accept `longitud_m` (DECIMAL) and `num_plantas_esperadas` (INT) as optional fields. NULL values SHALL be stored as-is.

#### Scenario: Create row with length

- GIVEN a valid JWT and row data
- WHEN a POST request includes `longitud_m: 42.5`
- THEN the row is created with `longitud_m = 42.5`

#### Scenario: Create row with expected plants

- GIVEN a valid JWT and row data
- WHEN a POST request includes `num_plantas_esperadas: 20`
- THEN the row is created with `num_plantas_esperadas = 20`

### Requirement: Backend Accepts posicion_en_fila on Plants

The plant create and batch create endpoints SHALL accept `posicion_en_fila` (INT) as an optional field. When provided, it SHALL be stored as the plant's explicit position. When omitted, it SHALL default to NULL.

#### Scenario: Create plant with position

- GIVEN a valid JWT and plant data
- WHEN a POST request includes `posicion_en_fila: 5`
- THEN the plant is created with `posicion_en_fila = 5`

#### Scenario: Batch create with positions

- GIVEN a valid JWT
- WHEN a batch request creates 3 plants with `posicion_en_fila` values 0, 1, 2
- THEN all 3 plants are created with their respective positions
- AND the operation is transactional
