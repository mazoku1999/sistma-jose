-- Eliminar la restricción única actual que no considera el campo 'activa'
ALTER TABLE aulas_profesor DROP INDEX unique_aula;

-- Crear una nueva restricción única que solo aplique a aulas activas
-- Esto permite que la misma combinación exista si una está eliminada (activa=FALSE)
ALTER TABLE aulas_profesor ADD UNIQUE KEY unique_aula_activa (id_profesor, id_colegio, id_nivel, id_curso, id_paralelo, id_materia, id_gestion, activa);

-- Nota: Esta restricción permitirá:
-- 1. Una aula activa (activa=TRUE) con una combinación específica
-- 2. Múltiples aulas eliminadas (activa=FALSE) con la misma combinación
-- 3. Pero NO permitirá dos aulas activas con la misma combinación