import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

interface EstudianteDimensiones {
    apellidoPaterno: string
    apellidoMaterno: string
    nombres: string
    situacion: string
    // Primer trimestre
    ser1: number
    saber1: number
    hacer1: number
    decidir1: number
    evaluacion1: number
    // Segundo trimestre
    ser2: number
    saber2: number
    hacer2: number
    decidir2: number
    evaluacion2: number
    // Tercer trimestre
    ser3: number
    saber3: number
    hacer3: number
    decidir3: number
    evaluacion3: number
}

interface DatosEncabezado {
    gestion: string
    unidadEducativa: string
    nivel: string
    curso: string
    materia: string
    docente: string
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

export async function POST(request: NextRequest) {
    try {
        const { estudiantes, datosEncabezado } = (await request.json()) as {
            estudiantes: EstudianteDimensiones[]
            datosEncabezado: DatosEncabezado
        }

        if (!estudiantes || !Array.isArray(estudiantes) || estudiantes.length === 0) {
            return NextResponse.json({ error: "Datos de estudiantes inválidos" }, { status: 400 })
        }

        const ExcelJS = (await import("exceljs")).default

        const templatePath = path.join(process.cwd(), "public", "templates", "plantilla-dimensiones.xlsx")

        let workbook: any
        try {
            const templateBuffer = await fs.readFile(templatePath)
            workbook = new ExcelJS.Workbook()
            await workbook.xlsx.load(templateBuffer)
        } catch (error) {
            // Si no existe la plantilla, crear una básica
            workbook = new ExcelJS.Workbook()
            const worksheet = workbook.addWorksheet("Dimensiones")

            // Crear encabezados básicos
            worksheet.getCell("C8").value = "APELLIDO PATERNO"
            worksheet.getCell("D8").value = "APELLIDO MATERNO"
            worksheet.getCell("E8").value = "NOMBRES"
            worksheet.getCell("F8").value = "SITUACIÓN"
        }

        const worksheet = workbook.getWorksheet(1) || workbook.worksheets[0]

        // Llenar datos de encabezado
        if (datosEncabezado) {
            // GESTION: G3, H3 (ya combinadas en plantilla)
            worksheet.getCell("G3").value = datosEncabezado.gestion

            // UNIDAD EDUCATIVA: G4 hasta N4 (ya combinadas en plantilla)
            worksheet.getCell("G4").value = datosEncabezado.unidadEducativa

            // NIVEL: G5 hasta L5 (ya combinadas en plantilla)
            worksheet.getCell("G5").value = datosEncabezado.nivel

            // CURSO: S3 hasta U3 (ya combinadas en plantilla)
            worksheet.getCell("S3").value = datosEncabezado.curso

            // MATERIA: S4 hasta Z4 (ya combinadas en plantilla)
            worksheet.getCell("S4").value = datosEncabezado.materia

            // DOCENTE: S5 hasta Z5 (ya combinadas en plantilla)
            worksheet.getCell("S5").value = datosEncabezado.docente
        }

        // Llenar datos de estudiantes desde la fila 9
        estudiantes.forEach((estudiante, index) => {
            const rowNumber = 9 + index

            // Datos básicos
            worksheet.getCell(`C${rowNumber}`).value = estudiante.apellidoPaterno
            worksheet.getCell(`D${rowNumber}`).value = estudiante.apellidoMaterno
            worksheet.getCell(`E${rowNumber}`).value = estudiante.nombres
            worksheet.getCell(`F${rowNumber}`).value = "E" // Situación siempre "E"

            // Primer trimestre
            worksheet.getCell(`G${rowNumber}`).value = estudiante.ser1
            worksheet.getCell(`H${rowNumber}`).value = estudiante.saber1
            worksheet.getCell(`I${rowNumber}`).value = estudiante.hacer1
            worksheet.getCell(`J${rowNumber}`).value = estudiante.decidir1
            worksheet.getCell(`K${rowNumber}`).value = estudiante.evaluacion1
            // Fórmula para nota 1er trimestre
            worksheet.getCell(`L${rowNumber}`).value = {
                formula: `IF(SUM(G${rowNumber}:K${rowNumber})=0,"",SUM(G${rowNumber}:K${rowNumber}))`,
                result: estudiante.ser1 + estudiante.saber1 + estudiante.hacer1 + estudiante.decidir1 + estudiante.evaluacion1,
            }

            // Segundo trimestre
            worksheet.getCell(`M${rowNumber}`).value = estudiante.ser2
            worksheet.getCell(`N${rowNumber}`).value = estudiante.saber2
            worksheet.getCell(`O${rowNumber}`).value = estudiante.hacer2
            worksheet.getCell(`P${rowNumber}`).value = estudiante.decidir2
            worksheet.getCell(`Q${rowNumber}`).value = estudiante.evaluacion2
            // Fórmula para nota 2do trimestre
            worksheet.getCell(`R${rowNumber}`).value = {
                formula: `IF(SUM(M${rowNumber}:Q${rowNumber})=0,"",SUM(M${rowNumber}:Q${rowNumber}))`,
                result: estudiante.ser2 + estudiante.saber2 + estudiante.hacer2 + estudiante.decidir2 + estudiante.evaluacion2,
            }

            // Tercer trimestre
            worksheet.getCell(`S${rowNumber}`).value = estudiante.ser3
            worksheet.getCell(`T${rowNumber}`).value = estudiante.saber3
            worksheet.getCell(`U${rowNumber}`).value = estudiante.hacer3
            worksheet.getCell(`V${rowNumber}`).value = estudiante.decidir3
            worksheet.getCell(`W${rowNumber}`).value = estudiante.evaluacion3
            // Fórmula para nota 3er trimestre
            worksheet.getCell(`X${rowNumber}`).value = {
                formula: `IF(SUM(S${rowNumber}:W${rowNumber})=0,"",SUM(S${rowNumber}:W${rowNumber}))`,
                result: estudiante.ser3 + estudiante.saber3 + estudiante.hacer3 + estudiante.decidir3 + estudiante.evaluacion3,
            }

            // Promedio numeral con fórmula
            const nota1 =
                estudiante.ser1 + estudiante.saber1 + estudiante.hacer1 + estudiante.decidir1 + estudiante.evaluacion1
            const nota2 =
                estudiante.ser2 + estudiante.saber2 + estudiante.hacer2 + estudiante.decidir2 + estudiante.evaluacion2
            const nota3 =
                estudiante.ser3 + estudiante.saber3 + estudiante.hacer3 + estudiante.decidir3 + estudiante.evaluacion3
            const promedio = Math.round((nota1 + nota2 + nota3) / 3)

            worksheet.getCell(`Y${rowNumber}`).value = {
                formula: `IF(X${rowNumber}<>"",ROUND(AVERAGE(L${rowNumber},R${rowNumber},X${rowNumber}),0),"")`,
                result: promedio,
            }

            // Promedio literal
            worksheet.getCell(`Z${rowNumber}`).value = numeroALiteral(promedio)
        })

        // Ajustar ancho de columnas automáticamente
        worksheet.columns.forEach((column: any) => {
            let maxLength = 0
            column.eachCell({ includeEmpty: true }, (cell: any) => {
                const columnLength = cell.value ? cell.value.toString().length : 10
                if (columnLength > maxLength) {
                    maxLength = columnLength
                }
            })
            column.width = Math.min(maxLength + 2, 50) // Máximo 50 caracteres
        })

        const buffer = await workbook.xlsx.writeBuffer()

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": "attachment; filename=dimensiones.xlsx",
            },
        })
    } catch (error) {
        console.error("[v0] Error al generar Excel de dimensiones:", error)
        return NextResponse.json(
            {
                error: "Error al generar el archivo Excel",
                details: error instanceof Error ? error.message : "Error desconocido",
            },
            { status: 500 },
        )
    }
}
