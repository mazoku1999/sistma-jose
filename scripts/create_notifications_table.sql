-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  `read` BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Insertar algunas notificaciones de ejemplo
INSERT INTO notifications (user_id, title, message, type, `read`, created_at)
VALUES 
  (1, 'Bienvenido al sistema', 'Gracias por usar nuestro sistema académico. Aquí podrás gestionar tus aulas y estudiantes.', 'info', false, NOW()),
  (1, 'Recordatorio de notas', 'Recuerda que debes ingresar las notas del primer parcial antes del viernes.', 'warning', false, NOW() - INTERVAL 1 DAY),
  (1, 'Actualización del sistema', 'El sistema ha sido actualizado con nuevas funcionalidades.', 'info', true, NOW() - INTERVAL 2 DAY),
  (1, 'Centralización completada', 'La centralización de notas del curso 1A se ha completado exitosamente.', 'success', false, NOW() - INTERVAL 3 DAY);
