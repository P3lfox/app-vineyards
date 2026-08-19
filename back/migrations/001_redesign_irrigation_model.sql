-- Rediseño del modelo de riego
-- Migración: sistema de riego pasa de eventos a parcelas
-- Ejecutar: mysql -u root -p < back/migrations/001_redesign_irrigation_model.sql

START TRANSACTION;

-- 1. Agregar irrigation_system_id a plots
ALTER TABLE plots
  ADD COLUMN irrigation_system_id INT NULL AFTER vineyard_id;

ALTER TABLE plots
  ADD CONSTRAINT fk_plot_irrigation_system
    FOREIGN KEY (irrigation_system_id) REFERENCES irrigation_systems(id);

-- 2. Agregar nuevos campos a irrigation_events
ALTER TABLE irrigation_events
  ADD COLUMN presion_media_bar DECIMAL(5,2) NULL AFTER mm_aplicados,
  ADD COLUMN caudal_l_h DECIMAL(8,2) NULL AFTER presion_media_bar,
  ADD COLUMN estado ENUM('created','in_progress','completed') DEFAULT 'created' AFTER caudal_l_h;

-- 3. Backfill: copiar irrigation_system_id del evento más reciente a la parcela
UPDATE plots p
JOIN irrigation_events ie ON p.id = ie.plot_id
SET p.irrigation_system_id = ie.irrigation_system_id
WHERE p.irrigation_system_id IS NULL
  AND ie.irrigation_system_id IS NOT NULL
  AND ie.deleted_at IS NULL;

-- 4. Agregar irrigation_event_id a coverage e impact (nullable primero)
ALTER TABLE irrigation_coverage
  ADD COLUMN irrigation_event_id INT NULL AFTER id;

ALTER TABLE irrigation_event_impact
  ADD COLUMN irrigation_event_id INT NULL AFTER id;

-- 5. Seed de 5 tipos fijos (si no existen)
-- Primero fix del ENUM (encoding issue en MySQL)
ALTER TABLE irrigation_systems
  MODIFY COLUMN tipo ENUM('goteo', 'aspersión', 'surco', 'manta', 'microaspersión') NOT NULL;

INSERT IGNORE INTO irrigation_systems (id, tipo, descripcion, presion_media_bar, caudal_l_h) VALUES
  (1, 'goteo', 'Sistema que aplica agua directamente en la zona radicular mediante goteros. Alta eficiencia (90-95%), ideal para viñedos. Reduce evaporación y evita mojar el follaje, minimizando enfermedades fúngicas.', 1.50, 4.00),
  (2, 'manta', 'Riego por inundación controlada donde el agua se distribuye en una lámina superficial sobre el suelo. Bajo costo de instalación pero menor eficiencia (60-70%). Requiere terreno nivelado y mayor volumen de agua.', 0.00, 0.00),
  (3, 'aspersión', 'Sistema que distribuye agua por aspersores que simulan lluvia. Cobertura uniforme, eficiencia del 75-85%. Requiere presión media-alta (2-4 bar). Puede favorecer enfermedades foliares al mojar la planta.', 3.00, 500.00),
  (4, 'surco', 'Método gravitacional donde el agua circula por canales entre las hileras de plantas. Simple y económico, eficiencia del 50-70%. Depende de la pendiente del terreno y del tipo de suelo.', 0.00, 0.00),
  (5, 'microaspersión', 'Variación del aspersor con emisores de bajo caudal que mojan un área reducida alrededor de cada planta. Eficiencia del 80-90%. Combina ventajas del goteo con mayor cobertura. Presión baja-media (1-2 bar).', 1.50, 60.00);

-- Fix tipo para registros con encoding roto
UPDATE irrigation_systems SET tipo = 'aspersión' WHERE id = 3 AND (tipo = '' OR tipo IS NULL);
UPDATE irrigation_systems SET tipo = 'microaspersión' WHERE id = 5 AND (tipo = '' OR tipo IS NULL);

-- Limpiar deleted_at de los sistemas seed
UPDATE irrigation_systems SET deleted_at = NULL WHERE id IN (1,2,3,4,5);

-- 6. Eliminar irrigation_system_id de irrigation_events
-- Primero encontrar el nombre real de la FK
SET @fk_name = (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'irrigation_events'
    AND COLUMN_NAME = 'irrigation_system_id'
    AND CONSTRAINT_NAME != 'PRIMARY'
  LIMIT 1
);

SET @drop_fk = CONCAT('ALTER TABLE irrigation_events DROP FOREIGN KEY ', IFNULL(@fk_name, 'irrigation_events_ibfk_1'));
PREPARE stmt FROM @drop_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE irrigation_events DROP COLUMN irrigation_system_id;

COMMIT;
