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
  nombre_completo VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  telefono VARCHAR(20),
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
  especialidad VARCHAR(100),
  puede_centralizar_notas BOOLEAN DEFAULT FALSE,
  fecha_ingreso DATE,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- Tabla de estudiantes
CREATE TABLE IF NOT EXISTS estudiantes (
  id_estudiante INT AUTO_INCREMENT PRIMARY KEY,
  nombres VARCHAR(50) NOT NULL,
  apellidos VARCHAR(50) NOT NULL,
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
  fecha_eliminacion DATETIME,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_profesor) REFERENCES profesores(id_profesor) ON DELETE CASCADE,
  FOREIGN KEY (id_colegio) REFERENCES colegios(id_colegio) ON DELETE CASCADE,
  FOREIGN KEY (id_nivel) REFERENCES niveles(id_nivel) ON DELETE CASCADE,
  FOREIGN KEY (id_curso) REFERENCES cursos(id_curso) ON DELETE CASCADE,
  FOREIGN KEY (id_paralelo) REFERENCES paralelos(id_paralelo) ON DELETE CASCADE,
  FOREIGN KEY (id_materia) REFERENCES materias(id_materia) ON DELETE CASCADE,
  UNIQUE KEY unique_aula (id_profesor, id_colegio, id_nivel, id_curso, id_paralelo, id_materia)
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
('PROFESOR', 'Profesor con acceso a aulas y notas');

-- Insertar usuario administrador (password: admin123)
INSERT INTO usuarios (usuario, password, nombre_completo, activo) VALUES 
('admin', '$2b$10$WnF./ztE.2asPXhhFBN/1.ttDlaQja3eRgJFtUFt0AO7IscFXwzEa', 'Administrador del Sistema', TRUE);

-- Insertar usuario profesor (password: admin123)
INSERT INTO usuarios (usuario, password, nombre_completo, activo) VALUES 
('profesor', '$2b$10$WnF./ztE.2asPXhhFBN/1.ttDlaQja3eRgJFtUFt0AO7IscFXwzEa', 'Profesor Ejemplo', TRUE);

-- Asignar rol de administrador
INSERT INTO usuario_roles (id_usuario, id_rol) VALUES (1, 1);

-- Asignar rol de profesor
INSERT INTO usuario_roles (id_usuario, id_rol) VALUES (2, 2);

-- Insertar profesor
INSERT INTO profesores (id_usuario, especialidad, puede_centralizar_notas, fecha_ingreso) VALUES 
(2, 'Matemáticas', TRUE, CURRENT_DATE);

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
('MAT', 'Matemáticas', 'Matemáticas generales'),
('LEN', 'Lenguaje', 'Lenguaje y comunicación'),
('CS', 'Ciencias Sociales', 'Ciencias sociales y cívica'),
('CN', 'Ciencias Naturales', 'Ciencias naturales y biología'),
('ING', 'Inglés', 'Idioma inglés'),
('EF', 'Educación Física', 'Educación física y deportes'),
('ART', 'Artes', 'Educación artística'),
('TEC', 'Tecnología', 'Tecnología e informática'),
('MUS', 'Música', 'Educación musical'),
('REL', 'Religión', 'Educación religiosa'),
('FIL', 'Filosofía', 'Filosofía'),
('QUI', 'Química', 'Química'),
('FIS', 'Física', 'Física');

-- Insertar un colegio de ejemplo
INSERT INTO colegios (nombre, direccion, telefono, email) VALUES 
('Colegio San Francisco', 'Calle Ayacucho 123, La Paz, Bolivia', '22123456', 'info@colegio.bo');

-- (Se elimina la tabla de notificaciones por no usarse en esta configuración)
