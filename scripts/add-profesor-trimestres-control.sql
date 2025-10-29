-- ==================================================================
-- MIGRACIÓN: Control de Trimestres Habilitados por Profesor
-- ==================================================================
-- Este script agrega la funcionalidad para que el administrador
-- pueda habilitar/deshabilitar trimestres individualmente por profesor
-- ==================================================================

USE sis_escolar;

-- Crear tabla de control de trimestres habilitados por profesor
CREATE TABLE IF NOT EXISTS profesores_trimestres_habilitados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_profesor INT NOT NULL,
  id_gestion INT NOT NULL,
  trimestre INT NOT NULL CHECK (trimestre BETWEEN 1 AND 3),
  habilitado BOOLEAN DEFAULT FALSE,
  fecha_habilitacion DATETIME,
  habilitado_por INT, -- id del admin que lo habilitó
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_profesor) REFERENCES profesores(id_profesor) ON DELETE CASCADE,
  FOREIGN KEY (id_gestion) REFERENCES gestiones_academicas(id_gestion) ON DELETE CASCADE,
  FOREIGN KEY (habilitado_por) REFERENCES usuarios(id_usuario),
  UNIQUE KEY unique_profesor_gestion_trimestre (id_profesor, id_gestion, trimestre)
);

-- Opcional: Habilitar todos los trimestres para profesores existentes en la gestión activa
-- Descomenta las siguientes líneas si quieres que todos los profesores actuales
-- tengan acceso a todos los trimestres por defecto

/*
INSERT INTO profesores_trimestres_habilitados (id_profesor, id_gestion, trimestre, habilitado, fecha_habilitacion, habilitado_por)
SELECT 
  p.id_profesor,
  ga.id_gestion,
  t.trimestre,
  TRUE,
  NOW(),
  1 -- ID del usuario admin
FROM profesores p
CROSS JOIN gestiones_academicas ga
CROSS JOIN (SELECT 1 as trimestre UNION SELECT 2 UNION SELECT 3) t
WHERE ga.activa = TRUE
ON DUPLICATE KEY UPDATE habilitado = TRUE;
*/

-- Crear índice para consultas rápidas
CREATE INDEX idx_profesor_gestion ON profesores_trimestres_habilitados(id_profesor, id_gestion);
CREATE INDEX idx_profesor_trimestre ON profesores_trimestres_habilitados(id_profesor, trimestre, habilitado);

SELECT 'Migración completada: Tabla profesores_trimestres_habilitados creada exitosamente' AS mensaje;
