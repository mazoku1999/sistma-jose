-- Script para agregar las columnas de las 5 dimensiones a la tabla notas_aula_profesor
-- Ejecuta esto en tu base de datos

USE sis_escolar;

-- Verificar la estructura actual de la tabla
DESCRIBE notas_aula_profesor;

-- Agregar las columnas de las dimensiones si no existen
ALTER TABLE notas_aula_profesor
ADD COLUMN IF NOT EXISTS nota_ser DECIMAL(5,2) DEFAULT 0 AFTER trimestre,
ADD COLUMN IF NOT EXISTS nota_saber DECIMAL(5,2) DEFAULT 0 AFTER nota_ser,
ADD COLUMN IF NOT EXISTS nota_hacer DECIMAL(5,2) DEFAULT 0 AFTER nota_saber,
ADD COLUMN IF NOT EXISTS nota_decidir DECIMAL(5,2) DEFAULT 0 AFTER nota_hacer,
ADD COLUMN IF NOT EXISTS nota_autoevaluacion DECIMAL(5,2) DEFAULT 0 AFTER nota_decidir;

-- Verificar la estructura actualizada
DESCRIBE notas_aula_profesor;

-- Mostrar mensaje de éxito
SELECT 'Columnas agregadas exitosamente' AS status;

