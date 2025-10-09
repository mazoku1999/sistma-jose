import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-server-session"
import { executeQuery } from "@/lib/db"
import * as XLSX from "xlsx"

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        // Obtener ID del profesor
        let profesorId = null
        if (session.user.roles.includes("PROFESOR")) {
            const profesores = await executeQuery<any[]>("SELECT id_profesor FROM profesores WHERE id_usuario = ?", [
                session.user.id,
            ])

            if (profesores && profesores.length > 0) {
                profesorId = profesores[0].id_profesor
            }
        }

        if (!profesorId) {
            return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
        }

        const aulaId = parseInt(params.id)

        // Obtener información del aula
        const aulaInfo = await executeQuery<any[]>(`
      SELECT 
        ap.nombre_aula,
        COALESCE(m.nombre_completo, 'Sin materia') as materia,
        COALESCE(c.nombre, 'Sin curso') as curso,
        COALESCE(p.letra, 'Sin paralelo') as paralelo
      FROM aulas_profesor ap
      LEFT JOIN materias m ON ap.id_materia = m.id_materia
      LEFT JOIN cursos c ON ap.id_curso = c.id_curso
      LEFT JOIN paralelos p ON ap.id_paralelo = p.id_paralelo
      WHERE ap.id_aula_profesor = ? AND ap.id_profesor = ?
    `, [aulaId, profesorId])

        if (!aulaInfo || aulaInfo.length === 0) {
            return NextResponse.json({ error: "Aula no encontrada" }, { status: 404 })
        }

        // Obtener estudiantes y sus notas
        const estudiantes = await executeQuery<any[]>(`
      SELECT 
        u.nombre_completo as estudiante,
        nap.nota,
        nap.fecha_registro,
        nap.observaciones
      FROM inscripciones_aula ia
      JOIN usuarios u ON ia.id_estudiante = u.id_usuario
      LEFT JOIN notas_aula_profesor nap ON ia.id_inscripcion = nap.id_inscripcion
      WHERE ia.id_aula_profesor = ?
      ORDER BY u.nombre_completo, nap.fecha_registro
    `, [aulaId])

        // Crear datos para Excel
        const reporteData = []

        // Encabezados
        reporteData.push([
            'Estudiante',
            'Nota',
            'Fecha',
            'Observaciones',
            'Estado'
        ])

        // Datos de estudiantes
        estudiantes.forEach(estudiante => {
            const estado = estudiante.nota ? (estudiante.nota >= 7 ? 'Aprobado' : 'Reprobado') : 'Sin nota'
            reporteData.push([
                estudiante.estudiante,
                estudiante.nota || 'N/A',
                estudiante.fecha_registro ? new Date(estudiante.fecha_registro).toLocaleDateString('es-ES') : 'N/A',
                estudiante.observaciones || 'N/A',
                estado
            ])
        })

        // Agregar resumen estadístico
        const totalEstudiantes = new Set(estudiantes.map(e => e.estudiante)).size
        const notasValidas = estudiantes.filter(e => e.nota).map(e => e.nota)
        const promedio = notasValidas.length > 0 ? notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length : 0
        const aprobados = notasValidas.filter(n => n >= 7).length
        const reprobados = notasValidas.filter(n => n < 7).length

        reporteData.push([]) // Línea vacía
        reporteData.push(['RESUMEN ESTADÍSTICO'])
        reporteData.push(['Total Estudiantes', totalEstudiantes])
        reporteData.push(['Promedio General', promedio.toFixed(2)])
        reporteData.push(['Aprobados', aprobados])
        reporteData.push(['Reprobados', reprobados])
        reporteData.push(['Porcentaje Aprobación', `${((aprobados / notasValidas.length) * 100).toFixed(1)}%`])

        // Crear workbook
        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.aoa_to_sheet(reporteData)

        // Ajustar ancho de columnas
        const colWidths = [
            { wch: 25 }, // Estudiante
            { wch: 10 }, // Nota
            { wch: 15 }, // Fecha
            { wch: 30 }, // Observaciones
            { wch: 12 }  // Estado
        ]
        ws['!cols'] = colWidths

        // Agregar hoja al workbook
        XLSX.utils.book_append_sheet(wb, ws, `Reporte ${aulaInfo[0].nombre_aula}`)

        // Generar buffer
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

        // Retornar archivo Excel
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="reporte-${aulaInfo[0].nombre_aula}-${new Date().toISOString().split('T')[0]}.xlsx"`
            }
        })

    } catch (error) {
        console.error("Error al exportar reporte:", error)
        return NextResponse.json({ error: "Error al exportar reporte" }, { status: 500 })
    }
}
