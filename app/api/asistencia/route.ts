import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-server-session"
import { executeQuery } from "@/lib/db"
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession()

        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        // Obtener parámetros de filtro
        const { searchParams } = new URL(request.url)
        const aulaId = searchParams.get('aula')
        const periodo = searchParams.get('periodo')
        const exportPdf = searchParams.get('export') === 'pdf'

        // Obtener el profesorId del usuario
        const profesor = await executeQuery<any[]>(`
            SELECT id_profesor 
            FROM profesores 
            WHERE id_usuario = ?
        `, [session.user.id])

        if (profesor.length === 0) {
            return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
        }

        const profesorId = profesor[0].id_profesor

        // Construir filtros de fecha basados en el período
        let fechaFilter = ""
        if (periodo && periodo !== "todo") {
            const today = new Date()
            let fechaInicio = ""
            let fechaFin = today.toISOString().split('T')[0]

            if (periodo === "1") {
                // 1er Trimestre: 5 de febrero al 10 de mayo
                const currentYear = today.getFullYear()
                fechaInicio = `${currentYear}-02-05`
                fechaFin = `${currentYear}-05-10`
            } else if (periodo === "2") {
                // 2do Trimestre: 13 de mayo al 30 de agosto
                const currentYear = today.getFullYear()
                fechaInicio = `${currentYear}-05-13`
                fechaFin = `${currentYear}-08-30`
            } else if (periodo === "3") {
                // 3er Trimestre: 2 de septiembre al 10 de diciembre
                const currentYear = today.getFullYear()
                fechaInicio = `${currentYear}-09-02`
                fechaFin = `${currentYear}-12-10`
            }

            if (fechaInicio) {
                fechaFilter = `AND ae.fecha >= '${fechaInicio}' AND ae.fecha <= '${fechaFin}'`
            }
        }

        // Construir filtro de aula
        let aulaFilter = ""
        if (aulaId && aulaId !== "all") {
            aulaFilter = `AND ap.id_aula_profesor = ${aulaId}`
        }

        // Obtener datos de asistencia con filtros
        const asistencia = await executeQuery<any[]>(`
            SELECT 
                e.id_estudiante as id,
                CONCAT(e.nombres, ' ', COALESCE(e.apellido_paterno, ''), ' ', COALESCE(e.apellido_materno, '')) as estudiante,
                ap.nombre_aula as aula,
                COALESCE(SUM(CASE WHEN ae.tipo_asistencia IN ('A', 'F', 'R', 'L') THEN 1 ELSE 0 END), 0) as total_clases,
                COALESCE(SUM(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 ELSE 0 END), 0) as asistencias,
                COALESCE(SUM(CASE WHEN ae.tipo_asistencia = 'F' THEN 1 ELSE 0 END), 0) as faltas,
                COALESCE(SUM(CASE WHEN ae.tipo_asistencia = 'R' THEN 1 ELSE 0 END), 0) as retrasos,
                COALESCE(SUM(CASE WHEN ae.tipo_asistencia = 'L' THEN 1 ELSE 0 END), 0) as licencias,
                CASE 
                    WHEN COALESCE(SUM(CASE WHEN ae.tipo_asistencia IN ('A', 'F', 'R', 'L') THEN 1 ELSE 0 END), 0) > 0 THEN 
                        ROUND(((COALESCE(SUM(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 ELSE 0 END), 0) + 
                                COALESCE(SUM(CASE WHEN ae.tipo_asistencia = 'R' THEN 1 ELSE 0 END), 0)) * 100.0) / 
                              COALESCE(SUM(CASE WHEN ae.tipo_asistencia IN ('A', 'F', 'R', 'L') THEN 1 ELSE 0 END), 0), 2)
                    ELSE 0 
                END as porcentaje_asistencia
            FROM estudiantes e
            JOIN inscripciones_aula ia ON e.id_estudiante = ia.id_estudiante
            JOIN aulas_profesor ap ON ia.id_aula_profesor = ap.id_aula_profesor
            LEFT JOIN asistencia_estudiante ae ON ia.id_inscripcion = ae.id_inscripcion ${fechaFilter}
            WHERE ap.id_profesor = ? ${aulaFilter}
            GROUP BY e.id_estudiante, e.nombres, e.apellido_paterno, e.apellido_materno, ap.nombre_aula
            ORDER BY e.apellido_paterno, e.apellido_materno, e.nombres
        `, [profesorId])

        // Si se solicita exportación a PDF
        if (exportPdf) {
            const pdfDoc = await PDFDocument.create()
            const page = pdfDoc.addPage([595.28, 841.89]) // A4 size
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

            let yPosition = 800
            const lineHeight = 20
            const margin = 50

            // Título
            page.drawText('REPORTE DE ASISTENCIA', {
                x: margin,
                y: yPosition,
                size: 18,
                font: boldFont,
                color: rgb(0, 0, 0)
            })
            yPosition -= 30

            // Información del período
            const periodoText = periodo === "todo" ? "Año Lectivo" :
                periodo === "1" ? "1er Trimestre" :
                    periodo === "2" ? "2do Trimestre" : "3er Trimestre"

            page.drawText(`Período: ${periodoText}`, {
                x: margin,
                y: yPosition,
                size: 12,
                font: font,
                color: rgb(0, 0, 0)
            })
            yPosition -= 20

            // Fecha de generación
            page.drawText(`Fecha: ${new Date().toLocaleDateString('es-BO')}`, {
                x: margin,
                y: yPosition,
                size: 10,
                font: font,
                color: rgb(0.5, 0.5, 0.5)
            })
            yPosition -= 20

            // Nota explicativa
            page.drawText('Nota: % Asistencia = (Asistencias + Retrasos) / Total Clases × 100', {
                x: margin,
                y: yPosition,
                size: 9,
                font: font,
                color: rgb(0.3, 0.3, 0.3)
            })
            yPosition -= 20

            // Encabezados de tabla
            const headers = ['Estudiante', 'Aula', 'Asist.', 'Faltas', 'Retrasos', 'Licencias', 'Total', '% Asist.']
            const colWidths = [200, 80, 50, 50, 50, 50, 50, 60]
            let xPosition = margin

            headers.forEach((header, index) => {
                page.drawText(header, {
                    x: xPosition,
                    y: yPosition,
                    size: 10,
                    font: boldFont,
                    color: rgb(0, 0, 0)
                })
                xPosition += colWidths[index]
            })
            yPosition -= 25

            // Línea separadora
            page.drawLine({
                start: { x: margin, y: yPosition },
                end: { x: 545, y: yPosition },
                thickness: 1,
                color: rgb(0, 0, 0)
            })
            yPosition -= 15

            // Datos de estudiantes
            asistencia.forEach((estudiante) => {
                if (yPosition < 100) {
                    // Nueva página si no hay espacio
                    const newPage = pdfDoc.addPage([595.28, 841.89])
                    yPosition = 800
                }

                xPosition = margin
                const data = [
                    estudiante.estudiante,
                    estudiante.aula,
                    estudiante.asistencias.toString(),
                    estudiante.faltas.toString(),
                    estudiante.retrasos.toString(),
                    estudiante.licencias.toString(),
                    estudiante.total_clases.toString(),
                    `${estudiante.porcentaje_asistencia.toFixed(1)}%`
                ]

                data.forEach((value, index) => {
                    page.drawText(value, {
                        x: xPosition,
                        y: yPosition,
                        size: 9,
                        font: font,
                        color: rgb(0, 0, 0)
                    })
                    xPosition += colWidths[index]
                })
                yPosition -= lineHeight
            })

            const pdfBytes = await pdfDoc.save()

            return new NextResponse(pdfBytes, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="reporte-asistencia-${periodoText.toLowerCase().replace(/\s+/g, '-')}.pdf"`
                }
            })
        }

        return NextResponse.json(asistencia)

    } catch (error) {
        console.error("Error al obtener datos de asistencia:", error)
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
    }
}
