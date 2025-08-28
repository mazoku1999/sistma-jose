/**
 * Utilidades para limpiar la configuración global del usuario
 */

/**
 * Limpia toda la configuración global guardada en localStorage
 * Se ejecuta cuando el usuario hace logout
 */
export function clearUserConfig() {
  // Limpiar configuración de gestión
  localStorage.removeItem('gestion_global')
  
  // Limpiar configuración de trimestre
  localStorage.removeItem('trimestre_global')
  
  // Aquí se pueden agregar más configuraciones en el futuro
  // localStorage.removeItem('other_config')
}

/**
 * Obtiene el trimestre por defecto basado en la fecha actual (calendario escolar boliviano)
 */
export function getDefaultTrimestre(): string {
  const now = new Date()
  const mes = now.getMonth() + 1 // 1-12
  const dia = now.getDate()
  
  // 1er Trimestre: 5 de febrero al 10 de mayo
  if ((mes === 2 && dia >= 5) || mes === 3 || mes === 4 || (mes === 5 && dia <= 10)) {
    return "1"
  }
  
  // 2do Trimestre: 13 de mayo al 30 de agosto
  if ((mes === 5 && dia >= 13) || mes === 6 || mes === 7 || (mes === 8 && dia <= 30)) {
    return "2"
  }
  
  // 3er Trimestre: 2 de septiembre al 10 de diciembre
  if ((mes === 9 && dia >= 2) || mes === 10 || mes === 11 || (mes === 12 && dia <= 10)) {
    return "3"
  }
  
  // Períodos de transición/vacaciones
  if (mes === 1 || (mes === 2 && dia < 5)) {
    return "1" // Vacaciones de verano, próximo trimestre
  }
  if (mes === 5 && dia >= 11 && dia < 13) {
    return "1" // Transición 1er a 2do trimestre, mantener 1er trimestre
  }
  if (mes === 8 && dia > 30) {
    return "2" // Transición 2do a 3er trimestre, mantener 2do trimestre
  }
  if (mes === 12 && dia > 10) {
    return "1" // Vacaciones de verano, próximo año
  }
  
  return "1" // Por defecto
}