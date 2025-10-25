-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS sis_escolar;
USE sis_escolar;

-- Tabla de roles
CREATE TABLE IF NOT EXISTS roles (
  id_rol INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  descripcion VARCHAR(255)
);

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  nombres VARCHAR(50) NOT NULL,
  apellido_paterno VARCHAR(50) NOT NULL,
  apellido_materno VARCHAR(50) NOT NULL,
  nombre_completo VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  activo BOOLEAN DEFAULT TRUE,
  intentos_fallidos INT DEFAULT 0,
  bloqueado_hasta DATETIME,
  ultimo_acceso DATETIME,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de relación usuario-rol
CREATE TABLE IF NOT EXISTS usuario_roles (
  id_usuario INT,
  id_rol INT,
  PRIMARY KEY (id_usuario, id_rol),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  FOREIGN KEY (id_rol) REFERENCES roles(id_rol) ON DELETE CASCADE
);

-- Tabla de profesores
CREATE TABLE IF NOT EXISTS profesores (
  id_profesor INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL UNIQUE,
  puede_centralizar_notas BOOLEAN DEFAULT FALSE,
  profesor_area BOOLEAN DEFAULT FALSE,
  es_tutor BOOLEAN DEFAULT FALSE,
  fecha_ingreso DATE,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- Tabla de estudiantes
CREATE TABLE IF NOT EXISTS estudiantes (
  id_estudiante INT AUTO_INCREMENT PRIMARY KEY,
  nombres VARCHAR(50) NOT NULL,
  apellido_paterno VARCHAR(50),
  apellido_materno VARCHAR(50),
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de colegios
CREATE TABLE IF NOT EXISTS colegios (
  id_colegio INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  direccion VARCHAR(255),
  telefono VARCHAR(20),
  email VARCHAR(100),
  sitio_web VARCHAR(100),
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de niveles educativos
CREATE TABLE IF NOT EXISTS niveles (
  id_nivel INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  descripcion VARCHAR(255)
);

-- Tabla de cursos
CREATE TABLE IF NOT EXISTS cursos (
  id_curso INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  descripcion VARCHAR(255)
);

-- Tabla de paralelos
CREATE TABLE IF NOT EXISTS paralelos (
  id_paralelo INT AUTO_INCREMENT PRIMARY KEY,
  letra CHAR(1) NOT NULL
);

-- Tabla de materias
CREATE TABLE IF NOT EXISTS materias (
  id_materia INT AUTO_INCREMENT PRIMARY KEY,
  nombre_corto VARCHAR(10) NOT NULL,
  nombre_completo VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255)
);

-- Tabla de aulas por profesor
CREATE TABLE IF NOT EXISTS aulas_profesor (
  id_aula_profesor INT AUTO_INCREMENT PRIMARY KEY,
  id_profesor INT NOT NULL,
  id_colegio INT NOT NULL,
  id_nivel INT NOT NULL,
  id_curso INT NOT NULL,
  id_paralelo INT NOT NULL,
  id_materia INT NOT NULL,
  nombre_aula VARCHAR(100) NOT NULL,
  max_estudiantes INT DEFAULT 50,
  activa BOOLEAN DEFAULT TRUE,
  fecha_eliminacion DATETIME NULL,
  eliminada_por INT NULL,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_profesor) REFERENCES profesores(id_profesor) ON DELETE CASCADE,
  FOREIGN KEY (id_colegio) REFERENCES colegios(id_colegio) ON DELETE CASCADE,
  FOREIGN KEY (id_nivel) REFERENCES niveles(id_nivel) ON DELETE CASCADE,
  FOREIGN KEY (id_curso) REFERENCES cursos(id_curso) ON DELETE CASCADE,
  FOREIGN KEY (id_paralelo) REFERENCES paralelos(id_paralelo) ON DELETE CASCADE,
  FOREIGN KEY (id_materia) REFERENCES materias(id_materia) ON DELETE CASCADE,
  FOREIGN KEY (eliminada_por) REFERENCES usuarios(id_usuario)
);

-- Tabla de inscripciones de estudiantes en aulas
CREATE TABLE IF NOT EXISTS inscripciones_aula (
  id_inscripcion INT AUTO_INCREMENT PRIMARY KEY,
  id_aula_profesor INT NOT NULL,
  id_estudiante INT NOT NULL,
  fecha_inscripcion DATE NOT NULL,
  FOREIGN KEY (id_aula_profesor) REFERENCES aulas_profesor(id_aula_profesor) ON DELETE CASCADE,
  FOREIGN KEY (id_estudiante) REFERENCES estudiantes(id_estudiante) ON DELETE CASCADE,
  UNIQUE KEY unique_inscripcion (id_aula_profesor, id_estudiante)
);

-- Tabla de notas por aula y profesor
CREATE TABLE IF NOT EXISTS notas_aula_profesor (
  id_nota_aula_profesor INT AUTO_INCREMENT PRIMARY KEY,
  id_inscripcion INT NOT NULL,
  trimestre INT NOT NULL CHECK (trimestre BETWEEN 1 AND 3),
  nota_ser DECIMAL(5,2) DEFAULT 0,
  nota_saber DECIMAL(5,2) DEFAULT 0,
  nota_hacer DECIMAL(5,2) DEFAULT 0,
  nota_decidir DECIMAL(5,2) DEFAULT 0,
  nota_autoevaluacion DECIMAL(5,2) DEFAULT 0,
  promedio_final_trimestre DECIMAL(5,2) NOT NULL,
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_inscripcion) REFERENCES inscripciones_aula(id_inscripcion) ON DELETE CASCADE,
  UNIQUE KEY unique_nota (id_inscripcion, trimestre)
);

-- Tabla de asistencia de estudiantes
CREATE TABLE IF NOT EXISTS asistencia_estudiante (
  id_asistencia INT AUTO_INCREMENT PRIMARY KEY,
  id_inscripcion INT NOT NULL,
  fecha DATE NOT NULL,
  tipo_asistencia CHAR(1) NOT NULL CHECK (tipo_asistencia IN ('A', 'F', 'R', 'L')), -- A=Asistencia, F=Falta, R=Retraso, L=Licencia
  FOREIGN KEY (id_inscripcion) REFERENCES inscripciones_aula(id_inscripcion) ON DELETE CASCADE,
  UNIQUE KEY unique_asistencia (id_inscripcion, fecha)
);

-- Tabla de situación del estudiante por trimestre
CREATE TABLE IF NOT EXISTS situacion_estudiante_trimestre (
  id_situacion_estudiante INT AUTO_INCREMENT PRIMARY KEY,
  id_inscripcion INT NOT NULL,
  trimestre INT NOT NULL CHECK (trimestre BETWEEN 1 AND 3),
  estado CHAR(2) NOT NULL CHECK (estado IN ('E', 'R', 'NI')), -- E=Efectivo, R=Retirado, NI=No Incorporado
  FOREIGN KEY (id_inscripcion) REFERENCES inscripciones_aula(id_inscripcion) ON DELETE CASCADE,
  UNIQUE KEY unique_situacion (id_inscripcion, trimestre)
);

-- Tabla de centralización de notas
CREATE TABLE IF NOT EXISTS centralizacion_notas (
  id_centralizacion_nota INT AUTO_INCREMENT PRIMARY KEY,
  id_profesor_centralizador INT NOT NULL,
  id_colegio INT NOT NULL,
  id_nivel INT NOT NULL,
  id_curso INT NOT NULL,
  id_paralelo INT NOT NULL,
  id_estudiante INT NOT NULL,
  trimestre INT NOT NULL CHECK (trimestre BETWEEN 1 AND 3),
  id_materia INT NOT NULL,
  nota_final_materia DECIMAL(5,2) NOT NULL,
  fecha_centralizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_ultima_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_profesor_centralizador) REFERENCES profesores(id_profesor) ON DELETE CASCADE,
  FOREIGN KEY (id_colegio) REFERENCES colegios(id_colegio) ON DELETE CASCADE,
  FOREIGN KEY (id_nivel) REFERENCES niveles(id_nivel) ON DELETE CASCADE,
  FOREIGN KEY (id_curso) REFERENCES cursos(id_curso) ON DELETE CASCADE,
  FOREIGN KEY (id_paralelo) REFERENCES paralelos(id_paralelo) ON DELETE CASCADE,
  FOREIGN KEY (id_estudiante) REFERENCES estudiantes(id_estudiante) ON DELETE CASCADE,
  FOREIGN KEY (id_materia) REFERENCES materias(id_materia) ON DELETE CASCADE,
  UNIQUE KEY unique_centralizacion (id_colegio, id_nivel, id_curso, id_paralelo, id_estudiante, trimestre, id_materia)
);

-- Tabla de horario de profesores
CREATE TABLE IF NOT EXISTS horario_profesor (
  id_horario INT AUTO_INCREMENT PRIMARY KEY,
  id_aula_profesor INT NOT NULL,
  dia INT NOT NULL CHECK (dia BETWEEN 1 AND 7), -- 1=Lunes, 2=Martes, etc.
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  FOREIGN KEY (id_aula_profesor) REFERENCES aulas_profesor(id_aula_profesor) ON DELETE CASCADE
);

-- Insertar roles básicos
INSERT INTO roles (nombre, descripcion) VALUES 
('ADMIN', 'Administrador del sistema'),
('PROFESOR', 'Profesor con acceso a aulas y notas'),
('ADMINISTRATIVO', 'Personal administrativo con acceso a central de notas y reportes');

-- Insertar usuario administrador (password: admin123)
INSERT INTO usuarios (usuario, password, nombres, apellido_paterno, apellido_materno, nombre_completo, activo, email) VALUES 
('admin', '$2b$10$WnF./ztE.2asPXhhFBN/1.ttDlaQja3eRgJFtUFt0AO7IscFXwzEa', 'Administrador', 'Del', 'Sistema', 'Administrador del Sistema', TRUE, 'admin@admin.com');

-- Insertar usuario profesor (password: admin123)
INSERT INTO usuarios (usuario, password, nombres, apellido_paterno, apellido_materno, nombre_completo, activo, email) VALUES 
('profesor', '$2b$10$WnF./ztE.2asPXhhFBN/1.ttDlaQja3eRgJFtUFt0AO7IscFXwzEa', 'Profesor', 'Ejemplo', 'Demo', 'Profesor Ejemplo Demo', TRUE, 'profesor@profesor.com');

-- Insertar usuario administrativo (password: admin123)
INSERT INTO usuarios (usuario, password, nombres, apellido_paterno, apellido_materno, nombre_completo, activo, email) VALUES 
('administrativo', '$2b$10$WnF./ztE.2asPXhhFBN/1.ttDlaQja3eRgJFtUFt0AO7IscFXwzEa', 'Personal', 'Administrativo', 'Sistema', 'Personal Administrativo Sistema', TRUE, 'administrativo@sistema.com');

-- Asignar rol de administrador al usuario admin
INSERT INTO usuario_roles (id_usuario, id_rol) 
SELECT u.id_usuario, r.id_rol 
FROM usuarios u, roles r 
WHERE u.usuario = 'admin' AND r.nombre = 'ADMIN';

-- Asignar rol de profesor al usuario profesor
INSERT INTO usuario_roles (id_usuario, id_rol) 
SELECT u.id_usuario, r.id_rol 
FROM usuarios u, roles r 
WHERE u.usuario = 'profesor' AND r.nombre = 'PROFESOR';

-- Asignar rol de administrativo al usuario administrativo
INSERT INTO usuario_roles (id_usuario, id_rol) 
SELECT u.id_usuario, r.id_rol 
FROM usuarios u, roles r 
WHERE u.usuario = 'administrativo' AND r.nombre = 'ADMINISTRATIVO';

-- Insertar profesor
INSERT INTO profesores (id_usuario, puede_centralizar_notas, profesor_area, es_tutor, fecha_ingreso) 
SELECT u.id_usuario, TRUE, FALSE, FALSE, CURRENT_DATE
FROM usuarios u 
WHERE u.usuario = 'profesor';

-- Insertar niveles educativos
INSERT INTO niveles (nombre, descripcion) VALUES 
('Primaria', 'Educación primaria'),
('Secundaria', 'Educación secundaria');

-- Insertar cursos
INSERT INTO cursos (nombre, descripcion) VALUES 
('1ro', 'Primer grado'),
('2do', 'Segundo grado'),
('3ro', 'Tercer grado'),
('4to', 'Cuarto grado'),
('5to', 'Quinto grado'),
('6to', 'Sexto grado');

-- Insertar paralelos
INSERT INTO paralelos (letra) VALUES 
('A'),
('B'),
('C'),
('D');

-- Insertar materias
INSERT INTO materias (nombre_corto, nombre_completo, descripcion) VALUES 
('COM-LEN', 'COMUNICACIÓN Y LENGUAJES: LENGUA CASTELLANA Y ORIGINARIA', NULL),
('LEN-EXT', 'LENGUA EXTRANJERA', NULL),
('CSOC', 'CIENCIAS SOCIALES', NULL),
('EFYD', 'EDUCACIÓN FÍSICA Y DEPORTES', NULL),
('MUS', 'EDUCACIÓN MUSICAL', NULL),
('ART-PV', 'ARTES PLÁSTICAS Y VISUALES', NULL),
('MAT', 'MATEMÁTICA', NULL),
('TEC', 'TÉCNICA TECNOLÓGICA ESPECIALIZADA', NULL),
('CN-BIOGEO', 'CIENCIAS NATURALES: BIOLOGÍA - GEOGRAFÍA', NULL),
('CN-FIS', 'CIENCIAS NATURALES: FÍSICA', NULL),
('CN-QUI', 'CIENCIAS NATURALES: QUÍMICA', NULL),
('COS-FIL', 'COSMOVISIÓNES, FILOSOFÍA Y SICOLOGÍA', NULL),
('VAL-REL', 'VALORES, ESPIRITUALIDAD Y RELIGIONES', NULL);

-- Insertar un colegio de ejemplo
INSERT INTO colegios (nombre, direccion, telefono, email) VALUES 
('Colegio San Francisco', 'Calle Ayacucho 123, La Paz, Bolivia', '22123456', 'info@colegio.bo');

-- Tabla de gestiones academicas (anos escolares)
CREATE TABLE IF NOT EXISTS gestiones_academicas (
  id_gestion INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL, -- Ej: "Gestión 2024"
  anio INT NOT NULL, -- Año académico
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  activa BOOLEAN DEFAULT FALSE,
  descripcion VARCHAR(255),
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_gestion (anio)
);

-- Modificar tabla de aulas para incluir gestión
ALTER TABLE aulas_profesor ADD COLUMN id_gestion INT NOT NULL DEFAULT 1;
ALTER TABLE aulas_profesor ADD FOREIGN KEY (id_gestion) REFERENCES gestiones_academicas(id_gestion) ON DELETE CASCADE;
-- Aulas activas/eliminadas (compatibilidad con backend)
-- Ya se definen en CREATE TABLE aulas_profesor, por lo que no se alteran aquí para evitar duplicados

-- Agregar restricción única que incluye la gestión y el estado activo
-- Esto permite que la misma combinación exista si una está eliminada (activa=FALSE)
ALTER TABLE aulas_profesor ADD UNIQUE KEY unique_aula_activa (id_profesor, id_colegio, id_nivel, id_curso, id_paralelo, id_materia, id_gestion, activa);

-- Modificar tabla de inscripciones para incluir gestión
ALTER TABLE inscripciones_aula ADD COLUMN id_gestion INT NOT NULL DEFAULT 1;
ALTER TABLE inscripciones_aula ADD FOREIGN KEY (id_gestion) REFERENCES gestiones_academicas(id_gestion) ON DELETE CASCADE;

-- Modificar tabla de notas para incluir gestión
ALTER TABLE notas_aula_profesor ADD COLUMN id_gestion INT NOT NULL DEFAULT 1;
ALTER TABLE notas_aula_profesor ADD FOREIGN KEY (id_gestion) REFERENCES gestiones_academicas(id_gestion) ON DELETE CASCADE;

-- Agregar columnas de evaluación integral a la tabla de notas existente
-- ALTER TABLE notas_aula_profesor
--   ADD COLUMN nota_ser DECIMAL(5,2) DEFAULT 0,
--   ADD COLUMN nota_saber DECIMAL(5,2) DEFAULT 0,
--   ADD COLUMN nota_hacer DECIMAL(5,2) DEFAULT 0,
--   ADD COLUMN nota_decidir DECIMAL(5,2) DEFAULT 0,
--   ADD COLUMN nota_autoevaluacion DECIMAL(5,2) DEFAULT 0;

-- Modificar tabla de asistencia para incluir gestión
ALTER TABLE asistencia_estudiante ADD COLUMN id_gestion INT NOT NULL DEFAULT 1;
ALTER TABLE asistencia_estudiante ADD FOREIGN KEY (id_gestion) REFERENCES gestiones_academicas(id_gestion) ON DELETE CASCADE;

-- Modificar tabla de centralización para incluir gestión
ALTER TABLE centralizacion_notas ADD COLUMN id_gestion INT NOT NULL DEFAULT 1;
ALTER TABLE centralizacion_notas ADD FOREIGN KEY (id_gestion) REFERENCES gestiones_academicas(id_gestion) ON DELETE CASCADE;

-- Tabla de configuración del sistema
-- (Tablas avanzadas removidas por no uso actual)

-- Insertar gestion academica actual (calendario escolar boliviano)
INSERT INTO gestiones_academicas (nombre, anio, fecha_inicio, fecha_fin, activa, descripcion) VALUES 
('Gestión 2025', 2025, '2025-02-05', '2025-12-04', TRUE, 'Año académico 2025 - Calendario escolar boliviano');

-- Insertar configuraciones del sistema
-- (Se elimina configuración_sistema por no uso)

-- Índice para consultas eficientes de aulas activas
CREATE INDEX idx_aulas_activas ON aulas_profesor(activa, id_gestion);

-- ===========================================
-- ACTUALIZACIÓN PARA BASES DE DATOS EXISTENTES
-- ===========================================
-- Si ya tienes una base de datos existente, ejecuta estos comandos:

-- Agregar el campo profesor_area a la tabla profesores existente
-- ALTER TABLE profesores ADD COLUMN profesor_area BOOLEAN DEFAULT FALSE;

-- Agregar el campo es_tutor a la tabla profesores existente
-- ALTER TABLE profesores ADD COLUMN es_tutor BOOLEAN DEFAULT FALSE;

-- (Opcional) Eliminar el campo especialidad de la tabla profesores existente si ya no se utiliza
-- ALTER TABLE profesores DROP COLUMN especialidad;

-- Actualizar el profesor de ejemplo para que no sea profesor de área
-- UPDATE profesores SET profesor_area = FALSE WHERE id_usuario = 2;

-- Limpiar roles incorrectos del profesor de ejemplo (si existe)
-- DELETE FROM usuario_roles WHERE id_usuario = (SELECT id_usuario FROM usuarios WHERE usuario = 'profesor') AND id_rol = (SELECT id_rol FROM roles WHERE nombre = 'ADMIN');

-- Asegurar que el profesor de ejemplo solo tenga rol de PROFESOR
-- INSERT IGNORE INTO usuario_roles (id_usuario, id_rol) 
-- SELECT u.id_usuario, r.id_rol 
-- FROM usuarios u, roles r 
-- WHERE u.usuario = 'profesor' AND r.nombre = 'PROFESOR';
