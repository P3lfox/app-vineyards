-- Migración 005: Campos geográficos para parcelas
-- Agrega posición GPS, altitud y orientación a plots para alimentar
-- la brújula y el panel geográfico del mapa 3D.

-- 1. Agregar campos geográficos a plots
ALTER TABLE plots
  ADD COLUMN latitud DECIMAL(10,7) NULL DEFAULT NULL,
  ADD COLUMN longitud DECIMAL(10,7) NULL DEFAULT NULL,
  ADD COLUMN altitud DECIMAL(8,2) NULL DEFAULT NULL,
  ADD COLUMN orientacion_norte_grados INT NULL DEFAULT NULL,
  ADD COLUMN orientacion_hileras VARCHAR(10) NULL DEFAULT NULL;

-- Rollback (descomentar para revertir):
-- ALTER TABLE plots DROP COLUMN latitud, DROP COLUMN longitud, DROP COLUMN altitud, DROP COLUMN orientacion_norte_grados, DROP COLUMN orientacion_hileras;
