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

// ==========================================
// FUNCIONES PARA IMPORTAR/EXPORTAR NOTAS
// ==========================================

export interface NotaEstudiante {
  id_inscripcion: number
  nombre_completo: string
  nombres?: string
  apellido_paterno?: string
  apellido_materno?: string
  nota_ser: number
  nota_saber: number
  nota_hacer: number
  nota_decidir: number
  nota_autoevaluacion: number
  promedio_final_trimestre: number
}

export interface NotaImportada {
  nombre: string
  nota_ser: number
  nota_saber: number
  nota_hacer: number
  nota_decidir: number
  nota_autoevaluacion?: number
}

/**
 * Exporta las notas de los estudiantes a Excel con todas las dimensiones
 */
export const exportNotasToExcel = (
  notas: NotaEstudiante[],
  aula: AulaInfo,
  trimestre: number
) => {
  const wb = XLSX.utils.book_new()

  // Crear datos para la hoja
  const data = []

  // Título principal (fila 1)
  data.push(['📊 REGISTRO DE NOTAS - DIMENSIONES DEL SER', '', '', '', '', '', '', ''])
  data.push(['', '', '', '', '', '', '', '']) // Fila vacía

  // Información del aula (filas 3-6)
  data.push([`🏫 ${aula.colegio}`, '', '', '', '', '', '', ''])
  data.push([`📖 ${aula.materia} - ${aula.curso} ${aula.paralelo}`, '', '', '', '', '', '', ''])
  data.push([`📅 Trimestre ${trimestre} - ${new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`, '', '', '', '', '', '', ''])
  data.push(['', '', '', '', '', '', '', '']) // Fila vacía

  // Headers de la tabla (fila 7)
  data.push([
    'N°',
    'APELLIDOS Y NOMBRES',
    'SER',
    'SABER',
    'HACER',
    'DECIDIR',
    'AUTOEVALUACIÓN',
    'PUNTAJE TRIMESTRAL'
  ])

  // Datos de estudiantes
  notas.forEach((nota, index) => {
    const nombreCompleto = nota.apellido_paterno && nota.apellido_materno
      ? `${nota.apellido_paterno} ${nota.apellido_materno} ${nota.nombres || ''}`.trim()
      : nota.nombre_completo

    data.push([
      index + 1,
      nombreCompleto.toUpperCase(),
      nota.nota_ser || 0,
      nota.nota_saber || 0,
      nota.nota_hacer || 0,
      nota.nota_decidir || 0,
      nota.nota_autoevaluacion || 0,
      nota.promedio_final_trimestre || 0
    ])
  })

  // Crear worksheet
  const ws = XLSX.utils.aoa_to_sheet(data)

  // Establecer anchos de columna optimizados
  setColumnWidths(ws, [6, 35, 10, 10, 10, 10, 14, 14])

  // Merge cells para el título
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // Título principal
    { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } }, // Colegio
    { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } }, // Materia y curso
    { s: { r: 4, c: 0 }, e: { r: 4, c: 7 } }  // Fecha
  ]

  // Agregar la hoja al workbook
  XLSX.utils.book_append_sheet(wb, ws, `Notas_T${trimestre}`)

  // Generar y descargar archivo
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const data_blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })

  const fileName = `Notas_${aula.nombre_aula.replace(/\s+/g, '_')}_T${trimestre}_${new Date().toISOString().split('T')[0]}.xlsx`
  saveAs(data_blob, fileName)

  return { fileName, count: notas.length }
}

/**
 * Crea un template para importar notas con las dimensiones
 */
export const createNotasImportTemplate = (aula: AulaInfo, trimestre: number) => {
  const wb = XLSX.utils.book_new()

  // Crear datos para la hoja
  const data = []

  // Título principal (fila 1)
  data.push(['📝 TEMPLATE PARA IMPORTAR NOTAS', '', '', '', '', '', ''])
  data.push(['', '', '', '', '', '', '']) // Fila vacía

  // Información del aula (filas 3-5)
  data.push([`🏫 ${aula.colegio}`, '', '', '', '', '', ''])
  data.push([`📖 ${aula.materia} - ${aula.curso} ${aula.paralelo} - Trimestre ${trimestre}`, '', '', '', '', '', ''])
  data.push(['', '', '', '', '', '', '']) // Fila vacía

  // Instrucciones (filas 6-11)
  data.push(['📋 INSTRUCCIONES:', '', '', '', '', '', ''])
  data.push(['1️⃣ Complete las columnas de notas (SER, SABER, HACER, DECIDIR, AUTOEVALUACIÓN)', '', '', '', '', '', ''])
  data.push(['2️⃣ Cada nota debe estar entre 0 y 100', '', '', '', '', '', ''])
  data.push(['3️⃣ El puntaje trimestral (suma) se calculará automáticamente', '', '', '', '', '', ''])
  data.push(['4️⃣ No modifique los nombres de los estudiantes', '', '', '', '', '', ''])
  data.push(['5️⃣ Guarde y suba el archivo usando "Importar Excel"', '', '', '', '', '', ''])
  data.push(['', '', '', '', '', '', '']) // Fila vacía

  // Headers de la tabla (fila 12, índice 11)
  data.push([
    'N°',
    'APELLIDOS Y NOMBRES',
    'SER',
    'SABER',
    'HACER',
    'DECIDIR',
    'AUTOEVALUACIÓN',
    'PUNTAJE'
  ])

  // Datos de ejemplo (fila 13 en adelante)
  const ejemplos = [
    { nombre: 'GARCÍA LÓPEZ Juan Carlos', ser: 85, saber: 90, hacer: 88, decidir: 87, auto: 86 },
    { nombre: 'MARTÍNEZ PÉREZ María Elena', ser: 78, saber: 82, hacer: 80, decidir: 79, auto: 81 },
    { nombre: 'RODRÍGUEZ SILVA Pedro Antonio', ser: 92, saber: 95, hacer: 93, decidir: 91, auto: 90 },
  ]

  ejemplos.forEach((ejemplo, index) => {
    const puntaje = (ejemplo.ser + ejemplo.saber + ejemplo.hacer + ejemplo.decidir + ejemplo.auto).toFixed(0)
    data.push([
      index + 1,
      ejemplo.nombre,
      ejemplo.ser,
      ejemplo.saber,
      ejemplo.hacer,
      ejemplo.decidir,
      ejemplo.auto,
      puntaje
    ])
  })

  // Crear worksheet
  const ws = XLSX.utils.aoa_to_sheet(data)

  // Establecer anchos de columna optimizados
  setColumnWidths(ws, [6, 35, 10, 10, 10, 10, 14, 12])

  // Merge cells para títulos e instrucciones
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // Título principal
    { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } }, // Colegio
    { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } }, // Materia y curso
    { s: { r: 5, c: 0 }, e: { r: 5, c: 7 } }, // Instrucciones título
    { s: { r: 6, c: 0 }, e: { r: 6, c: 7 } }, // Instrucción 1
    { s: { r: 7, c: 0 }, e: { r: 7, c: 7 } }, // Instrucción 2
    { s: { r: 8, c: 0 }, e: { r: 8, c: 7 } }, // Instrucción 3
    { s: { r: 9, c: 0 }, e: { r: 9, c: 7 } }, // Instrucción 4
    { s: { r: 10, c: 0 }, e: { r: 10, c: 7 } } // Instrucción 5
  ]

  // Agregar la hoja al workbook
  XLSX.utils.book_append_sheet(wb, ws, "Template Notas")

  // Generar y descargar
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const data_blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })

  const fileName = `Template_Notas_${aula.nombre_aula.replace(/\s+/g, '_')}_T${trimestre}.xlsx`
  saveAs(data_blob, fileName)

  return { fileName }
}

/**
 * Importa notas desde Excel con el formato específico del usuario
 * COLUMNAS:
 * - C (índice 2): Apellido Paterno
 * - D (índice 3): Apellido Materno
 * - E (índice 4): Nombres
 * - J (índice 9): SER
 * - R (índice 17): SABER
 * - Z (índice 25): HACER
 * - AC (índice 28): DECIDIR
 * - AE (índice 30): AUTOEVALUACIÓN
 */
export const importNotasFromExcel = async (
  file: File,
  startRow: number = 11 // Fila 12 en Excel (0-indexed = 11)
): Promise<NotaImportada[]> => {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

  const notasImportadas: NotaImportada[] = []

  console.log(`📊 Importando desde fila ${startRow + 1} (Excel), total filas: ${rows.length}`)

  // Procesar desde la fila especificada
  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i] as any[]
    if (!row || !Array.isArray(row)) continue

    // Leer apellidos y nombres de las columnas C, D, E
    const apellidoPaterno = String(row[2] || '').trim() // Columna C (índice 2)
    const apellidoMaterno = String(row[3] || '').trim() // Columna D (índice 3)
    const nombres = String(row[4] || '').trim() // Columna E (índice 4)

    // Combinar en nombre completo: Apellido Paterno + Apellido Materno + Nombres
    const nombre = `${apellidoPaterno} ${apellidoMaterno} ${nombres}`.trim()
    if (!nombre) continue

    // Leer las notas desde las columnas específicas
    const nota_ser = parseFloat(String(row[9] || '0')) // Columna J (índice 9)
    const nota_saber = parseFloat(String(row[17] || '0')) // Columna R (índice 17)
    const nota_hacer = parseFloat(String(row[25] || '0')) // Columna Z (índice 25)
    const nota_decidir = parseFloat(String(row[28] || '0')) // Columna AC (índice 28)

    // Buscar autoevaluación en columna AE (índice 30)
    const nota_autoevaluacion = parseFloat(String(row[30] || '0')) || 0

    // DEBUG: Log de la primera fila procesada
    if (i === startRow) {
      console.log('🔍 Primera fila procesada:', {
        fila: i + 1,
        apellidoPaterno,
        apellidoMaterno,
        nombres,
        nombre_completo: nombre,
        nota_ser: row[9],
        nota_saber: row[17],
        nota_hacer: row[25],
        nota_decidir: row[28],
        nota_autoevaluacion: row[30]
      })
    }

    // Validar que al menos una nota sea válida
    if (
      !isFinite(nota_ser) &&
      !isFinite(nota_saber) &&
      !isFinite(nota_hacer) &&
      !isFinite(nota_decidir)
    ) {
      continue
    }

    notasImportadas.push({
      nombre,
      nota_ser: isFinite(nota_ser) ? Math.max(0, Math.min(100, nota_ser)) : 0,
      nota_saber: isFinite(nota_saber) ? Math.max(0, Math.min(100, nota_saber)) : 0,
      nota_hacer: isFinite(nota_hacer) ? Math.max(0, Math.min(100, nota_hacer)) : 0,
      nota_decidir: isFinite(nota_decidir) ? Math.max(0, Math.min(100, nota_decidir)) : 0,
      nota_autoevaluacion: isFinite(nota_autoevaluacion) ? Math.max(0, Math.min(100, nota_autoevaluacion)) : 0
    })
  }

  console.log(`✅ ${notasImportadas.length} notas importadas del Excel`)
  if (notasImportadas.length > 0) {
    console.log('📋 Primeros 3 nombres importados:', notasImportadas.slice(0, 3).map(n => n.nombre))
  }

  return notasImportadas
}

/**
 * Calcula el puntaje trimestral basado en las 5 dimensiones (SUMA, no promedio)
 * Rango: 0-500 (cada dimensión de 0-100)
 */
export const calcularPuntajeTrimestral = (
  nota_ser: number,
  nota_saber: number,
  nota_hacer: number,
  nota_decidir: number,
  nota_autoevaluacion: number
): number => {
  const suma = nota_ser + nota_saber + nota_hacer + nota_decidir + nota_autoevaluacion
  return Math.round(suma * 100) / 100 // Redondear a 2 decimales
}

/**
 * Normaliza nombres para comparación (quita acentos, convierte a minúsculas)
 */
export const normalizeName = (name: string): string => {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Tokeniza un nombre (divide y elimina conectores)
 */
export const tokenizeName = (name: string): string[] => {
  const connectors = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e'])
  return normalizeName(name)
    .split(' ')
    .filter(t => t && !connectors.has(t) && t.length > 1)
}
