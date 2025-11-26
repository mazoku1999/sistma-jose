import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

interface Estudiante {
  apellidos: string
  nombres: string
  situacion: string
  notaTrimestre1: number
  notaTrimestre2: number
  notaTrimestre3: number
}

function calcularPromedio(n1: number, n2: number, n3: number): number {
  return Math.round((n1 + n2 + n3) / 3)
}

function numeroALiteral(numero: number): string {
  const literales = [
    "CERO",
    "UNO",
    "DOS",
    "TRES",
    "CUATRO",
    "CINCO",
    "SEIS",
    "SIETE",
    "OCHO",
    "NUEVE",
    "DIEZ",
    "ONCE",
    "DOCE",
    "TRECE",
    "CATORCE",
    "QUINCE",
    "DIECISÉIS",
    "DIECISIETE",
    "DIECIOCHO",
    "DIECINUEVE",
    "VEINTE",
    "VEINTIUNO",
    "VEINTIDÓS",
    "VEINTITRÉS",
    "VEINTICUATRO",
    "VEINTICINCO",
    "VEINTISÉIS",
    "VEINTISIETE",
    "VEINTIOCHO",
    "VEINTINUEVE",
    "TREINTA",
    "TREINTA Y UNO",
    "TREINTA Y DOS",
    "TREINTA Y TRES",
    "TREINTA Y CUATRO",
    "TREINTA Y CINCO",
    "TREINTA Y SEIS",
    "TREINTA Y SIETE",
    "TREINTA Y OCHO",
    "TREINTA Y NUEVE",
    "CUARENTA",
    "CUARENTA Y UNO",
    "CUARENTA Y DOS",
    "CUARENTA Y TRES",
    "CUARENTA Y CUATRO",
    "CUARENTA Y CINCO",
    "CUARENTA Y SEIS",
    "CUARENTA Y SIETE",
    "CUARENTA Y OCHO",
    "CUARENTA Y NUEVE",
    "CINCUENTA",
    "CINCUENTA Y UNO",
    "CINCUENTA Y DOS",
    "CINCUENTA Y TRES",
    "CINCUENTA Y CUATRO",
    "CINCUENTA Y CINCO",
    "CINCUENTA Y SEIS",
    "CINCUENTA Y SIETE",
    "CINCUENTA Y OCHO",
    "CINCUENTA Y NUEVE",
    "SESENTA",
    "SESENTA Y UNO",
    "SESENTA Y DOS",
    "SESENTA Y TRES",
    "SESENTA Y CUATRO",
    "SESENTA Y CINCO",
    "SESENTA Y SEIS",
    "SESENTA Y SIETE",
    "SESENTA Y OCHO",
    "SESENTA Y NUEVE",
    "SETENTA",
    "SETENTA Y UNO",
    "SETENTA Y DOS",
    "SETENTA Y TRES",
    "SETENTA Y CUATRO",
    "SETENTA Y CINCO",
    "SETENTA Y SEIS",
    "SETENTA Y SIETE",
    "SETENTA Y OCHO",
    "SETENTA Y NUEVE",
    "OCHENTA",
    "OCHENTA Y UNO",
    "OCHENTA Y DOS",
    "OCHENTA Y TRES",
    "OCHENTA Y CUATRO",
    "OCHENTA Y CINCO",
    "OCHENTA Y SEIS",
    "OCHENTA Y SIETE",
    "OCHENTA Y OCHO",
    "OCHENTA Y NUEVE",
    "NOVENTA",
    "NOVENTA Y UNO",
    "NOVENTA Y DOS",
    "NOVENTA Y TRES",
    "NOVENTA Y CUATRO",
    "NOVENTA Y CINCO",
    "NOVENTA Y SEIS",
    "NOVENTA Y SIETE",
    "NOVENTA Y OCHO",
    "NOVENTA Y NUEVE",
    "CIEN",
  ]

  return literales[numero] || numero.toString()
}

function determinarAprobacion(promedio: number): string {
  return promedio >= 51 ? "APROBADO" : "REPROBADO"
}

export async function POST(request: NextRequest) {
  try {
    const { estudiantes, aulaInfo, docenteInfo } = (await request.json()) as {
      estudiantes: Estudiante[]
      aulaInfo: {
        gestion?: string
        unidadEducativa?: string
        nivel?: string
        curso?: string
        materia?: string
      }
      docenteInfo: {
        nombre_completo?: string
      }
    }

    if (!estudiantes || !Array.isArray(estudiantes) || estudiantes.length === 0) {
      return NextResponse.json({ error: "Datos de estudiantes inválidos" }, { status: 400 })
    }

    // Importar ExcelJS dinámicamente
    const ExcelJS = (await import("exceljs")).default

    // Leer la plantilla
    const templatePath = path.join(process.cwd(), "public", "templates", "plantilla-promedios.xlsx")

    let workbook: any
    try {
      const templateBuffer = await fs.readFile(templatePath)
      workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(templateBuffer)
    } catch (error) {
      // Si no existe la plantilla, crear un nuevo workbook
      workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet("Promedios")

      // Crear encabezados básicos en la fila 8
      worksheet.getCell("C8").value = "APELLIDOS"
      worksheet.getCell("D8").value = "NOMBRES"
      worksheet.getCell("E8").value = "SITUACIÓN"
      worksheet.getCell("F8").value = "NOTA FINAL 1ER TRIMESTRE"
      worksheet.getCell("G8").value = "NOTA FINAL 2DO TRIMESTRE"
      worksheet.getCell("H8").value = "NOTA FINAL 3ER TRIMESTRE"
      worksheet.getCell("I8").value = "PROMEDIO FINAL (NUMERAL)"
      worksheet.getCell("J8").value = "PROMEDIO FINAL (LITERAL)"
      worksheet.getCell("K8").value = "APROBADO/REPROBADO"

      // Estilo para encabezados
      for (let col = 3; col <= 11; col++) {
        const cell = worksheet.getCell(8, col)
        cell.font = { bold: true }
        cell.alignment = { horizontal: "center", vertical: "middle" }
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD9E1F2" },
        }
      }
    }

    const worksheet = workbook.getWorksheet(1) || workbook.worksheets[0]

    // Llenar datos adicionales del aula con formato en negritas
    if (aulaInfo) {
      // GESTION: D-3
      if (aulaInfo.gestion) {
        const cellD3 = worksheet.getCell("D3")
        cellD3.value = aulaInfo.gestion
        cellD3.font = { bold: true }
      }

      // UNIDAD EDUCATIVA: D-4
      if (aulaInfo.unidadEducativa) {
        const cellD4 = worksheet.getCell("D4")
        cellD4.value = aulaInfo.unidadEducativa
        cellD4.font = { bold: true }
      }

      // NIVEL: D-5
      if (aulaInfo.nivel) {
        const cellD5 = worksheet.getCell("D5")
        cellD5.value = aulaInfo.nivel
        cellD5.font = { bold: true }
      }

      // CURSO: I-3 (SOLO UNA CELDA)
      if (aulaInfo.curso) {
        const cellI3 = worksheet.getCell("I3")
        cellI3.value = aulaInfo.curso
        cellI3.font = { bold: true }
      }

      // MATERIA: I-4, J-4, K-4 (CELDAS FUSIONADAS)
      if (aulaInfo.materia) {
        // Fusionar las celdas I4, J4, K4
        worksheet.mergeCells('I4:K4')

        // Asignar el valor a la celda fusionada
        const cellFusionada = worksheet.getCell("I4")
        cellFusionada.value = aulaInfo.materia
        cellFusionada.font = { bold: true }
        cellFusionada.alignment = { horizontal: "center", vertical: "middle" }
      }
    }

    // DOCENTE: I-5, J-5, K-5 (CELDAS FUSIONADAS) - Nombre del docente loggeado
    if (docenteInfo?.nombre_completo) {
      const nombreDocente = docenteInfo.nombre_completo

      // Fusionar las celdas I5, J5, K5
      worksheet.mergeCells('I5:K5')

      // Asignar el valor a la celda fusionada
      const cellFusionada = worksheet.getCell("I5")
      cellFusionada.value = nombreDocente
      cellFusionada.font = { bold: true }
      cellFusionada.alignment = { horizontal: "center", vertical: "middle" }
    }

    // Llenar los datos desde la fila 9
    estudiantes.forEach((estudiante, index) => {
      const rowNumber = 9 + index
      const promedio = calcularPromedio(estudiante.notaTrimestre1, estudiante.notaTrimestre2, estudiante.notaTrimestre3)

      // Concatenar apellidos y nombres para la columna C (que está fusionada con D)
      const apellidosYNombres = [estudiante.apellidos, estudiante.nombres].filter(Boolean).join(' ')

      console.log(`📝 Fila ${rowNumber}: "${estudiante.apellidos}" + "${estudiante.nombres}" = "${apellidosYNombres}"`)

      // Fusionar celdas C y D para esta fila si no están fusionadas
      try {
        worksheet.mergeCells(`C${rowNumber}:D${rowNumber}`)
      } catch (e) {
        // Ya están fusionadas, ignorar error
      }

      worksheet.getCell(`C${rowNumber}`).value = apellidosYNombres
      worksheet.getCell(`E${rowNumber}`).value = estudiante.situacion
      worksheet.getCell(`F${rowNumber}`).value = estudiante.notaTrimestre1
      worksheet.getCell(`G${rowNumber}`).value = estudiante.notaTrimestre2
      worksheet.getCell(`H${rowNumber}`).value = estudiante.notaTrimestre3
      worksheet.getCell(`I${rowNumber}`).value = promedio
      worksheet.getCell(`J${rowNumber}`).value = numeroALiteral(promedio)
      worksheet.getCell(`K${rowNumber}`).value = determinarAprobacion(promedio)

      // Aplicar estilos básicos
      for (let col = 3; col <= 11; col++) {
        const cell = worksheet.getCell(rowNumber, col)
        cell.alignment = { vertical: "middle" }
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        }
      }
    })

    // Generar el buffer del archivo Excel
    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=promedios.xlsx",
      },
    })
  } catch (error) {
    console.error("[v0] Error al generar Excel:", error)
    return NextResponse.json(
      {
        error: "Error al generar el archivo Excel",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
