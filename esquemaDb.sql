-- Esquema de base de datos para app-vineyards
-- Generado: 2026-07-26
-- Motor: MySQL 8.0+

CREATE DATABASE IF NOT EXISTS vineyards CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vineyards;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'enologo', 'operario') NOT NULL DEFAULT 'operario',
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- VINEYARDS
-- ============================================================
CREATE TABLE vineyards (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  ubicacion VARCHAR(255) NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- VARIETALS (catalogo de uvas)
-- ============================================================
CREATE TABLE varietals (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  tipo ENUM('tinta', 'blanca', 'rosada') NOT NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- VINEYARD_VARIETALS (relacion many-to-many)
-- ============================================================
CREATE TABLE vineyard_varietals (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vineyard_id INT UNSIGNED NOT NULL,
  varietal_id INT UNSIGNED NOT NULL,
  UNIQUE KEY uq_vineyard_varietal (vineyard_id, varietal_id),
  FOREIGN KEY (vineyard_id) REFERENCES vineyards(id),
  FOREIGN KEY (varietal_id) REFERENCES varietals(id)
);

-- ============================================================
-- IRRIGATION_SYSTEMS (5 tipos fijos, seed data)
-- ============================================================
CREATE TABLE irrigation_systems (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('goteo', 'aspersión', 'surco', 'manta', 'microaspersión') NOT NULL,
  descripcion TEXT NULL,
  presion_media_bar DECIMAL(4,2) NULL,
  caudal_l_h DECIMAL(8,2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

-- Seed de 5 tipos fijos con descripción y valores típicos
INSERT IGNORE INTO irrigation_systems (id, tipo, descripcion, presion_media_bar, caudal_l_h) VALUES
  (1, 'goteo', 'Sistema que aplica agua directamente en la zona radicular mediante goteros. Alta eficiencia (90-95%), ideal para viñedos. Reduce evaporación y evita mojar el follaje, minimizando enfermedades fúngicas.', 1.50, 4.00),
  (2, 'manta', 'Riego por inundación controlada donde el agua se distribuye en una lámina superficial sobre el suelo. Bajo costo de instalación pero menor eficiencia (60-70%). Requiere terreno nivelado y mayor volumen de agua.', 0.00, 0.00),
  (3, 'aspersión', 'Sistema que distribuye agua por aspersores que simulan lluvia. Cobertura uniforme, eficiencia del 75-85%. Requiere presión media-alta (2-4 bar). Puede favorecer enfermedades foliares al mojar la planta.', 3.00, 500.00),
  (4, 'surco', 'Método gravitacional donde el agua circula por canales entre las hileras de plantas. Simple y económico, eficiencia del 50-70%. Depende de la pendiente del terreno y del tipo de suelo.', 0.00, 0.00),
  (5, 'microaspersión', 'Variación del aspersor con emisores de bajo caudal que mojan un área reducida alrededor de cada planta. Eficiencia del 80-90%. Combina ventajas del goteo con mayor cobertura. Presión baja-media (1-2 bar).', 1.50, 60.00);

-- ============================================================
-- PLOTS (parcelas)
-- ============================================================
CREATE TABLE plots (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vineyard_id INT UNSIGNED NOT NULL,
  irrigation_system_id INT UNSIGNED NULL,
  nombre VARCHAR(100) NULL,
  area_m2 INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (vineyard_id) REFERENCES vineyards(id),
  FOREIGN KEY (irrigation_system_id) REFERENCES irrigation_systems(id) ON DELETE SET NULL
);

-- ============================================================
-- VINE_ROWS (filas de vinas)
-- ============================================================
CREATE TABLE vine_rows (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plot_id INT UNSIGNED NOT NULL,
  numero INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (plot_id) REFERENCES plots(id)
);

-- ============================================================
-- PLANTS (plantas individuales)
-- ============================================================
CREATE TABLE plants (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vine_row_id INT UNSIGNED NOT NULL,
  varietal_id INT UNSIGNED NOT NULL,
  sistema_conduccion ENUM('parral', 'espaldera', 'vaso', 'lira') NOT NULL,
  codigo VARCHAR(50) NULL UNIQUE,
  latitud DECIMAL(10,8) NULL,
  longitud DECIMAL(11,8) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (vine_row_id) REFERENCES vine_rows(id),
  FOREIGN KEY (varietal_id) REFERENCES varietals(id)
);

-- ============================================================
-- PLANT_STATUS_HISTORY (historial de estado de planta)
-- ============================================================
CREATE TABLE plant_status_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plant_id INT UNSIGNED NOT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado_salud VARCHAR(50) NOT NULL,
  crecimiento VARCHAR(50) NULL,
  tutor VARCHAR(50) NULL,
  notas TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (plant_id) REFERENCES plants(id)
);

-- ============================================================
-- DISEASES (catalogo de enfermedades)
-- ============================================================
CREATE TABLE diseases (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(50) NULL,
  descripcion TEXT NULL,
  gravedad ENUM('leve', 'moderada', 'grave', 'critica') NOT NULL DEFAULT 'leve',
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TREATMENTS (catalogo de tratamientos)
-- ============================================================
CREATE TABLE treatments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PLANT_DISEASES (enfermedades de plantas)
-- ============================================================
CREATE TABLE plant_diseases (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plant_id INT UNSIGNED NOT NULL,
  disease_id INT UNSIGNED NOT NULL,
  fecha_detectado DATE NOT NULL,
  notas TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (plant_id) REFERENCES plants(id),
  FOREIGN KEY (disease_id) REFERENCES diseases(id)
);

-- ============================================================
-- PLANT_TREATMENTS (tratamientos aplicados a plantas)
-- ============================================================
CREATE TABLE plant_treatments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plant_id INT UNSIGNED NOT NULL,
  treatment_id INT UNSIGNED NOT NULL,
  fecha_aplicacion DATE NOT NULL,
  resultado TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (plant_id) REFERENCES plants(id),
  FOREIGN KEY (treatment_id) REFERENCES treatments(id)
);

-- ============================================================
-- PLANT_NOTES (notas de plantas)
-- ============================================================
CREATE TABLE plant_notes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plant_id INT UNSIGNED NOT NULL,
  nota TEXT NOT NULL,
  fecha DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (plant_id) REFERENCES plants(id)
);

-- ============================================================
-- PLANT_YIELD (rendimiento de plantas)
-- ============================================================
CREATE TABLE plant_yield (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plant_id INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  kg_cosechados DECIMAL(8,2) NULL,
  calidad VARCHAR(50) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (plant_id) REFERENCES plants(id)
);

-- ============================================================
-- PLANT_PRUNINGS (podas de plantas)
-- ============================================================
CREATE TABLE plant_prunings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plant_id INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  tipo_poda VARCHAR(50) NOT NULL,
  realizada_por INT UNSIGNED NULL,
  notas TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (plant_id) REFERENCES plants(id),
  FOREIGN KEY (realizada_por) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- PLANT_PROPAGATION (propagacion de plantas)
-- ============================================================
CREATE TABLE plant_propagation (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plant_id INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  metodo VARCHAR(50) NOT NULL,
  estado VARCHAR(50) NULL,
  notas TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (plant_id) REFERENCES plants(id)
);

-- ============================================================
-- IRRIGATION_EVENTS (eventos de riego)
-- ============================================================
CREATE TABLE irrigation_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plot_id INT UNSIGNED NOT NULL,
  fecha DATETIME NOT NULL,
  duracion_min INT NULL,
  mm_aplicados DECIMAL(5,2) NULL,
  presion_media_bar DECIMAL(5,2) NULL,
  caudal_l_h DECIMAL(8,2) NULL,
  estado ENUM('created', 'in_progress', 'completed') NULL DEFAULT 'created',
  observaciones TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (plot_id) REFERENCES plots(id)
);

-- ============================================================
-- IRRIGATION_COVERAGE (cobertura de riego por fila)
-- ============================================================
CREATE TABLE irrigation_coverage (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  irrigation_event_id INT UNSIGNED NULL,
  vine_row_id INT UNSIGNED NOT NULL,
  cobertura ENUM('total', 'parcial', 'irregular') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (irrigation_event_id) REFERENCES irrigation_events(id) ON DELETE SET NULL,
  FOREIGN KEY (vine_row_id) REFERENCES vine_rows(id)
);

-- ============================================================
-- IRRIGATION_EVENT_IMPACT (impacto de riego por planta)
-- ============================================================
CREATE TABLE irrigation_event_impact (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  irrigation_event_id INT UNSIGNED NULL,
  plant_id INT UNSIGNED NOT NULL,
  llegada_agua ENUM('nada', 'poco', 'media', 'mucha') NOT NULL,
  hubo_cortes TINYINT(1) NULL DEFAULT 0,
  observaciones TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (irrigation_event_id) REFERENCES irrigation_events(id) ON DELETE SET NULL,
  FOREIGN KEY (plant_id) REFERENCES plants(id)
);

-- ============================================================
-- TASKS (tareas)
-- ============================================================
CREATE TABLE tasks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plot_id INT UNSIGNED NULL,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT NULL,
  estado ENUM('pendiente', 'en_progreso', 'completada', 'cancelada') NOT NULL DEFAULT 'pendiente',
  prioridad ENUM('baja', 'media', 'alta', 'urgente') NOT NULL DEFAULT 'media',
  fecha DATE NULL,
  fecha_vencimiento DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (plot_id) REFERENCES plots(id)
);

-- ============================================================
-- TASK_ASSIGNEES (relacion many-to-many tasks <-> users)
-- ============================================================
CREATE TABLE task_assignees (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  task_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  UNIQUE KEY uq_task_user (task_id, user_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- IRRIGATION_SYSTEMS (parcela) - relacion parcela-sistema
-- Ya incluida en plots.irrigation_system_id
-- ============================================================
