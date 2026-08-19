-- Enhance plant registration: add vigor, tutor, fecha_plantacion, metodo_propagacion, observaciones
-- Make varietal_id nullable to allow "sin planta" cells

ALTER TABLE plants
  ADD COLUMN vigor VARCHAR(50) NULL COMMENT 'sin_crecimiento, pequeña, mediana, grande',
  ADD COLUMN tutor BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN fecha_plantacion DATE NULL,
  ADD COLUMN metodo_propagacion VARCHAR(50) NULL COMMENT 'injerto, estaca, acodo, micropropagacion',
  ADD COLUMN observaciones TEXT NULL;

ALTER TABLE plants MODIFY COLUMN varietal_id INT UNSIGNED NULL;
