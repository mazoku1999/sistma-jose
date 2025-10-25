-- Script para agregar el rol ADMINISTRATIVO al sistema
-- Este script se puede ejecutar en una base de datos existente

-- Insertar el nuevo rol ADMINISTRATIVO si no existe
INSERT INTO roles (nombre, descripcion) 
SELECT 'ADMINISTRATIVO', 'Personal administrativo con acceso a central de notas y reportes'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'ADMINISTRATIVO');

-- Insertar usuario administrativo de ejemplo (password: admin123)
INSERT INTO usuarios (usuario, password, nombres, apellido_paterno, apellido_materno, nombre_completo, activo, email) 
SELECT 'administrativo', '$2b$10$WnF./ztE.2asPXhhFBN/1.ttDlaQja3eRgJFtUFt0AO7IscFXwzEa', 'Personal', 'Administrativo', 'Sistema', 'Personal Administrativo Sistema', TRUE, 'administrativo@sistema.com'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario = 'administrativo');

-- Asignar rol de administrativo al usuario administrativo
INSERT INTO usuario_roles (id_usuario, id_rol) 
SELECT u.id_usuario, r.id_rol 
FROM usuarios u, roles r 
WHERE u.usuario = 'administrativo' AND r.nombre = 'ADMINISTRATIVO'
AND NOT EXISTS (
    SELECT 1 FROM usuario_roles ur 
    WHERE ur.id_usuario = u.id_usuario AND ur.id_rol = r.id_rol
);
