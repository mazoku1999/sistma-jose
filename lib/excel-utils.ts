import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

export interface EstudianteExport {
  id: number
  nombres: string
  apellidos: string
}

export interface AulaInfo {
  nombre_aula: string
  colegio: string
  nivel: string
  curso: string
  paralelo: string
  materia: string
}

// Función para crear celdas con estilo
const createStyledCell = (value: any, style?: any) => {
  return {
    v: value,
    t: typeof value === 'number' ? 'n' : 's',
    s: style
  }
}

// Función para establecer anchos de columna
const setColumnWidths = (ws: XLSX.WorkSheet, widths: number[]) => {
  ws['!cols'] = widths.map(width => ({ wch: width }))
}

export const exportStudentsToExcel = (estudiantes: EstudianteExport[], aula: AulaInfo) => {
  const wb = XLSX.utils.book_new()
  
  // Crear datos para la hoja
  const data = []
  
  // Título principal (fila 1)
  data.push(['📚 LISTA DE ESTUDIANTES', '', ''])
  data.push(['', '', '']) // Fila vacía
  
  // Información del aula (filas 3-6)
  data.push([`🏫 ${aula.colegio}`, '', ''])
  data.push([`📖 ${aula.materia} - ${aula.curso} ${aula.paralelo}`, '', ''])
  data.push([`📅 ${new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`, '', ''])
  data.push(['', '', '']) // Fila vacía
  
  // Headers de la tabla (fila 7)
  data.push(['N°', 'NOMBRES', 'APELLIDOS'])
  
  // Datos de estudiantes
  estudiantes.forEach((estudiante, index) => {
    data.push([
      index + 1,
      estudiante.nombres.toUpperCase(),
      estudiante.apellidos.toUpperCase()
    ])
  })
  
  // Crear worksheet
  const ws = XLSX.utils.aoa_to_sheet(data)
  
  // Establecer anchos de columna optimizados
  setColumnWidths(ws, [8, 30, 30])
  
  // Merge cells para el título
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, // Título principal
    { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } }, // Colegio
    { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } }, // Materia y curso
    { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } }  // Fecha
  ]
  
  // Agregar bordes y estilos a los headers de la tabla
  const headerRow = 6 // Fila de headers (0-indexed)
  for (let col = 0; col < 3; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: headerRow, c: col })
    if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' }
  }
  
  // Agregar la hoja al workbook
  XLSX.utils.book_append_sheet(wb, ws, "Estudiantes")
  
  // Generar y descargar archivo
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const data_blob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  })
  
  const fileName = `Estudiantes_${aula.nombre_aula.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
  saveAs(data_blob, fileName)
  
  return { fileName, count: estudiantes.length }
}

export const createImportTemplate = (aula: AulaInfo) => {
  const wb = XLSX.utils.book_new()
  
  // Crear datos para la hoja
  const data = []
  
  // Título principal (fila 1)
  data.push(['📝 TEMPLATE PARA IMPORTAR ESTUDIANTES', ''])
  data.push(['', '']) // Fila vacía
  
  // Información del aula (filas 3-6)
  data.push([`🏫 ${aula.colegio}`, ''])
  data.push([`📖 ${aula.materia} - ${aula.curso} ${aula.paralelo}`, ''])
  data.push(['', '']) // Fila vacía
  
  // Instrucciones (filas 6-9)
  data.push(['📋 INSTRUCCIONES:', ''])
  data.push(['1️⃣ Complete las columnas NOMBRES y APELLIDOS', ''])
  data.push(['2️⃣ No modifique los encabezados', ''])
  data.push(['3️⃣ Guarde y suba el archivo usando "Importar"', ''])
  data.push(['4️⃣ Los duplicados serán omitidos automáticamente', ''])
  data.push(['', '']) // Fila vacía
  
  // Headers de la tabla (fila 12)
  data.push(['NOMBRES', 'APELLIDOS'])
  
  // Datos de ejemplo
  const ejemplos = [
    ['Juan Carlos', 'Pérez García'],
    ['María Elena', 'López Martínez'],
    ['Pedro Antonio', 'Rodríguez Silva'],
    ['Ana Sofía', 'González Herrera'],
    ['Luis Fernando', 'Ramírez Torres'],
    ['Carmen Isabel', 'Morales Vega'],
    ['Diego Alejandro', 'Castro Ruiz'],
    ['Valentina', 'Jiménez Flores']
  ]
  
  ejemplos.forEach(ejemplo => {
    data.push(ejemplo)
  })
  
  // Crear worksheet
  const ws = XLSX.utils.aoa_to_sheet(data)
  
  // Establecer anchos de columna optimizados
  setColumnWidths(ws, [35, 35])
  
  // Merge cells para títulos e instrucciones
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, // Título principal
    { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } }, // Colegio
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } }, // Materia y curso
    { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } }, // Instrucciones título
    { s: { r: 6, c: 0 }, e: { r: 6, c: 1 } }, // Instrucción 1
    { s: { r: 7, c: 0 }, e: { r: 7, c: 1 } }, // Instrucción 2
    { s: { r: 8, c: 0 }, e: { r: 8, c: 1 } }, // Instrucción 3
    { s: { r: 9, c: 0 }, e: { r: 9, c: 1 } }  // Instrucción 4
  ]
  
  // Agregar la hoja al workbook
  XLSX.utils.book_append_sheet(wb, ws, "Template")
  
  // Generar y descargar
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const data_blob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  })
  
  const fileName = `Template_Estudiantes_${aula.nombre_aula.replace(/\s+/g, '_')}.xlsx`
  saveAs(data_blob, fileName)
  
  return { fileName }
}

export const validateImportFile = (jsonData: any[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (!Array.isArray(jsonData) || jsonData.length === 0) {
    errors.push('El archivo está vacío o no tiene el formato correcto')
    return { isValid: false, errors }
  }
  
  // Buscar la primera fila que tenga datos válidos (puede que las primeras filas sean headers del template)
  let dataStartIndex = -1
  let hasNombres = false
  let hasApellidos = false
  
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i]
    const keys = Object.keys(row)
    
    // Buscar columnas de nombres y apellidos (case insensitive)
    const nombresKey = keys.find(key => 
      key.toLowerCase().includes('nombre') || 
      key.toUpperCase() === 'NOMBRES' ||
      key.toLowerCase() === 'nombres'
    )
    const apellidosKey = keys.find(key => 
      key.toLowerCase().includes('apellido') || 
      key.toUpperCase() === 'APELLIDOS' ||
      key.toLowerCase() === 'apellidos'
    )
    
    if (nombresKey && apellidosKey) {
      hasNombres = true
      hasApellidos = true
      dataStartIndex = i
      break
    }
  }
  
  if (!hasNombres) {
    errors.push('No se encontró la columna de "Nombres"')
  }
  if (!hasApellidos) {
    errors.push('No se encontró la columna de "Apellidos"')
  }
  
  if (dataStartIndex === -1) {
    errors.push('No se encontraron datos válidos en el archivo')
    return { isValid: false, errors }
  }
  
  // Verificar que hay datos después de los headers
  const dataRows = jsonData.slice(dataStartIndex)
  let validRowCount = 0
  
  dataRows.forEach((row, index) => {
    const keys = Object.keys(row)
    const nombresKey = keys.find(key => 
      key.toLowerCase().includes('nombre') || 
      key.toUpperCase() === 'NOMBRES' ||
      key.toLowerCase() === 'nombres'
    )
    const apellidosKey = keys.find(key => 
      key.toLowerCase().includes('apellido') || 
      key.toUpperCase() === 'APELLIDOS' ||
      key.toLowerCase() === 'apellidos'
    )
    
    if (nombresKey && apellidosKey) {
      const nombres = row[nombresKey]
      const apellidos = row[apellidosKey]
      
      if (nombres && apellidos && 
          nombres.toString().trim() !== '' && 
          apellidos.toString().trim() !== '') {
        validRowCount++
      }
    }
  })
  
  if (validRowCount === 0) {
    errors.push('No se encontraron estudiantes válidos en el archivo')
  }
  
  return { isValid: errors.length === 0, errors }
}