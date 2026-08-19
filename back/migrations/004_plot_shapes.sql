-- Migration 004: Plot shapes, terrain, row dimensions, and plant position
-- Adds shape/terrain metadata to plots, optional length/expected-count to vine_rows,
-- and explicit position ordering to plants.

-- 1. Add shape fields to plots
ALTER TABLE plots
  ADD COLUMN forma_parcela ENUM('rectangular', 'trapezoidal', 'abanicado', 'terrazas', 'irregular') NULL DEFAULT 'rectangular',
  ADD COLUMN terreno ENUM('plano', 'ladera', 'pendiente', 'con_cauce') NULL DEFAULT 'plano';

-- 2. Add row shape fields to vine_rows
ALTER TABLE vine_rows
  ADD COLUMN longitud_m DECIMAL(6,2) NULL,
  ADD COLUMN num_plantas_esperadas INT NULL;

-- 3. Add explicit position to plants
ALTER TABLE plants
  ADD COLUMN posicion_en_fila INT NULL;

-- 4. Backfill posicion_en_fila from existing plant order
SET @row_num = 0;
SET @current_row = 0;
UPDATE plants p
JOIN (
  SELECT id, vine_row_id,
    @row_num := IF(@current_row = vine_row_id, @row_num + 1, 1) as pos,
    @current_row := vine_row_id
  FROM plants
  ORDER BY vine_row_id, id
) ordered ON p.id = ordered.id
SET p.posicion_en_fila = ordered.pos;

-- Rollback (uncomment to revert):
-- ALTER TABLE plants DROP COLUMN posicion_en_fila;
-- ALTER TABLE vine_rows DROP COLUMN longitud_m, DROP COLUMN num_plantas_esperadas;
-- ALTER TABLE plots DROP COLUMN forma_parcela, DROP COLUMN terreno;
