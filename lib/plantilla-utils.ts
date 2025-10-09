import * as XLSX from "xlsx"

/**
 * Convierte una nota numérica a literal en texto (61 = "sesenta y uno")
 */
const convertirNotaALiteral = (nota: number): string => {
    const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']
    const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
    const especiales = ['', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve']

    if (nota === 0) return 'cero'
    if (nota < 0) return 'negativo'
    if (nota > 100) return 'cien'

    // Números del 1 al 19
    if (nota < 20) {
        if (nota < 10) return unidades[nota]
        return especiales[nota - 10]
    }

    // Números del 20 al 99
    if (nota < 100) {
        const decena = Math.floor(nota / 10)
        const unidad = nota % 10

        if (unidad === 0) {
            return decenas[decena]
        }

        return `${decenas[decena]} y ${unidades[unidad]}`
    }

    // 100
    if (nota === 100) return 'cien'

    return nota.toString()
}

/**
 * Exporta notas usando la plantilla plantilla-promedios.xlsx
 */
export const exportNotasToPlantillaPromedios = async (
    estudiantes: any[],
    notasPorTrimestre: { [trimestre: string]: { [inscripcionId: number]: any } },
    aulaInfo: { nombre_aula: string, materia: string, profesor: string }
): Promise<Blob> => {
    try {
        // Cargar la plantilla desde el servidor
        const response = await fetch('/templates/plantilla-promedios.xlsx')
        if (!response.ok) {
            throw new Error('No se pudo cargar la plantilla')
        }

        const templateBuffer = await response.arrayBuffer()
        const workbook = XLSX.read(templateBuffer, { type: 'array' })

        // Obtener la primera hoja
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Llenar datos desde la fila 9 (índice 8)
        let rowIndex = 8 // Fila 9 (0-indexed)

        for (const estudiante of estudiantes) {
            const inscripcionId = estudiante.inscripcion_id

            // Obtener notas de los 3 trimestres
            const notaT1 = notasPorTrimestre['1']?.[inscripcionId] || { promedio_final_trimestre: 0 }
            const notaT2 = notasPorTrimestre['2']?.[inscripcionId] || { promedio_final_trimestre: 0 }
            const notaT3 = notasPorTrimestre['3']?.[inscripcionId] || { promedio_final_trimestre: 0 }

            // Calcular promedio final de los 3 trimestres
            const promedioFinal = (notaT1.promedio_final_trimestre + notaT2.promedio_final_trimestre + notaT3.promedio_final_trimestre) / 3

            // Convertir a literal (mismo valor numérico)
            const promedioLiteral = convertirNotaALiteral(promedioFinal)

            // Determinar si está aprobado (>= 51 puntos)
            const aprobado = promedioFinal >= 51 ? 'APROBADO' : 'REPROBADO'

            // Llenar las celdas según las columnas especificadas
            const cellData = {
                'C9': estudiante.apellido_paterno || '', // APELLIDOS
                'D9': estudiante.apellido_materno || '', // NOMBRES  
                'E9': estudiante.situacion || 'REGULAR', // SITUACION
                'F9': notaT1.promedio_final_trimestre || 0, // NOTA FINAL PRIMER TRIMESTRE
                'G9': notaT2.promedio_final_trimestre || 0, // NOTA FINAL SEGUNDO TRIMESTRE
                'H9': notaT3.promedio_final_trimestre || 0, // NOTA FINAL TERCER TRIMESTRE
                'I9': promedioFinal, // PROMEDIO FINAL NUMERAL
                'J9': promedioLiteral, // PROMEDIO FINAL LITERAL
                'K9': aprobado // APROBADO O REPROBADO
            }

            // Aplicar los datos a las celdas
            Object.entries(cellData).forEach(([cell, value]) => {
                const cellRef = cell.replace('9', rowIndex.toString())
                if (!worksheet[cellRef]) {
                    worksheet[cellRef] = { t: 's', v: value }
                } else {
                    worksheet[cellRef].v = value
                }
            })

            rowIndex++
        }

        // Convertir a blob
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
        return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

    } catch (error) {
        console.error('Error al exportar notas a plantilla-promedios:', error)
        throw error
    }
}
