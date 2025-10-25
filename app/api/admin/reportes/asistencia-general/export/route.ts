import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-server-session"
import { executeQuery } from "@/lib/db"
import * as XLSX from "xlsx"

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession()
        if (!session?.user || (!session.user.roles?.includes("ADMIN") && !session.user.roles?.includes("ADMINISTRATIVO"))) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const nivel = searchParams.get("nivel")
        const curso = searchParams.get("curso")
        const colegio = searchParams.get("colegio")
        const gestion = searchParams.get("gestion") || "1"

        // Construir condiciones WHERE
        let whereConditions = ["iap.id_gestion = ?"]
        let params: any[] = [gestion]

        if (nivel && nivel !== "all") {
            whereConditions.push("ap.id_nivel = ?")
            params.push(nivel)
        }

        if (curso && curso !== "all") {
            whereConditions.push("ap.id_curso = ?")
            params.push(curso)
        }

        if (colegio && colegio !== "all") {
            whereConditions.push("ap.id_colegio = ?")
            params.push(colegio)
        }

        const whereClause = whereConditions.join(" AND ")

        // Query para obtener reporte de asistencia
        const reportesQuery = `
            SELECT 
                CONCAT(e.nombres, ' ', e.apellido_paterno, ' ', e.apellido_materno) as 'Estudiante',
                col.nombre as 'Colegio',
                n.nombre as 'Nivel',
                CONCAT(c.nombre, ' ', p.letra) as 'Curso',
                COUNT(ae.id_asistencia) as 'Total Clases',
                COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) as 'Asistencias',
                COUNT(CASE WHEN ae.tipo_asistencia = 'F' THEN 1 END) as 'Faltas',
                COUNT(CASE WHEN ae.tipo_asistencia = 'R' THEN 1 END) as 'Retrasos',
                COUNT(CASE WHEN ae.tipo_asistencia = 'L' THEN 1 END) as 'Licencias',
                ROUND((COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)), 2) as '% Asistencia',
                ROUND((COUNT(CASE WHEN ae.tipo_asistencia = 'F' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)), 2) as '% Faltas',
                ROUND((COUNT(CASE WHEN ae.tipo_asistencia = 'R' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)), 2) as '% Retrasos',
                ROUND((COUNT(CASE WHEN ae.tipo_asistencia = 'L' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)), 2) as '% Licencias',
                CASE 
                    WHEN (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) >= 95 THEN 'Excelente'
                    WHEN (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) >= 85 THEN 'Buena'
                    WHEN (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) >= 75 THEN 'Regular'
                    ELSE 'Mala'
                END as 'Estado Asistencia'
            FROM estudiantes e
            INNER JOIN inscripciones_aula iap ON e.id_estudiante = iap.id_estudiante
            INNER JOIN aulas_profesor ap ON iap.id_aula_profesor = ap.id_aula_profesor
            INNER JOIN niveles n ON ap.id_nivel = n.id_nivel
            INNER JOIN cursos c ON ap.id_curso = c.id_curso
            INNER JOIN paralelos p ON ap.id_paralelo = p.id_paralelo
            INNER JOIN colegios col ON ap.id_colegio = col.id_colegio
            LEFT JOIN asistencia_estudiante ae ON iap.id_inscripcion = ae.id_inscripcion AND ae.id_gestion = ?
            WHERE ${whereClause}
            GROUP BY e.id_estudiante, e.nombres, e.apellido_paterno, e.apellido_materno, 
                     n.nombre, c.nombre, p.letra, col.nombre
            ORDER BY porcentaje_asistencia DESC, e.nombres ASC
        `

        const reportesParams = [...params, gestion]
        const reportes = await executeQuery(reportesQuery, reportesParams)

        // Query para estadísticas generales
        const estadisticasQuery = `
            SELECT 
                COUNT(DISTINCT e.id_estudiante) as 'Total Estudiantes',
                ROUND(AVG(
                    CASE 
                        WHEN COUNT(ae.id_asistencia) > 0 THEN 
                            (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia))
                        ELSE 0 
                    END
                ), 2) as 'Promedio Asistencia General',
                COUNT(DISTINCT CASE 
                    WHEN (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) >= 95 
                    THEN e.id_estudiante 
                END) as 'Estudiantes Excelente Asistencia',
                COUNT(DISTINCT CASE 
                    WHEN (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) >= 85 
                    AND (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) < 95 
                    THEN e.id_estudiante 
                END) as 'Estudiantes Buena Asistencia',
                COUNT(DISTINCT CASE 
                    WHEN (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) >= 75 
                    AND (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) < 85 
                    THEN e.id_estudiante 
                END) as 'Estudiantes Regular Asistencia',
                COUNT(DISTINCT CASE 
                    WHEN (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) < 75 
                    THEN e.id_estudiante 
                END) as 'Estudiantes Mala Asistencia',
                SUM(CASE WHEN ae.tipo_asistencia = 'F' THEN 1 ELSE 0 END) as 'Total Faltas',
                SUM(CASE WHEN ae.tipo_asistencia = 'R' THEN 1 ELSE 0 END) as 'Total Retrasos',
                SUM(CASE WHEN ae.tipo_asistencia = 'L' THEN 1 ELSE 0 END) as 'Total Licencias'
            FROM estudiantes e
            INNER JOIN inscripciones_aula iap ON e.id_estudiante = iap.id_estudiante
            INNER JOIN aulas_profesor ap ON iap.id_aula_profesor = ap.id_aula_profesor
            LEFT JOIN asistencia_estudiante ae ON iap.id_inscripcion = ae.id_inscripcion AND ae.id_gestion = ?
            WHERE ${whereClause}
            GROUP BY iap.id_inscripcion
        `

        const estadisticasResult = await executeQuery(estadisticasQuery, reportesParams)
        const estadisticas = Array.isArray(estadisticasResult) ? estadisticasResult : [estadisticasResult]

        // Query para asistencia por nivel
        const asistenciaPorNivelQuery = `
            SELECT 
                n.nombre as 'Nivel',
                COUNT(DISTINCT e.id_estudiante) as 'Total Estudiantes',
                ROUND(AVG(
                    CASE 
                        WHEN COUNT(ae.id_asistencia) > 0 THEN 
                            (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia))
                        ELSE 0 
                    END
                ), 2) as 'Promedio Asistencia',
                COUNT(DISTINCT CASE 
                    WHEN (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) >= 95 
                    THEN e.id_estudiante 
                END) as 'Estudiantes Excelente',
                COUNT(DISTINCT CASE 
                    WHEN (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) >= 85 
                    AND (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) < 95 
                    THEN e.id_estudiante 
                END) as 'Estudiantes Bueno',
                COUNT(DISTINCT CASE 
                    WHEN (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) >= 75 
                    AND (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) < 85 
                    THEN e.id_estudiante 
                END) as 'Estudiantes Regular',
                COUNT(DISTINCT CASE 
                    WHEN (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) < 75 
                    THEN e.id_estudiante 
                END) as 'Estudiantes Malo'
            FROM estudiantes e
            INNER JOIN inscripciones_aula iap ON e.id_estudiante = iap.id_estudiante
            INNER JOIN aulas_profesor ap ON iap.id_aula_profesor = ap.id_aula_profesor
            INNER JOIN niveles n ON ap.id_nivel = n.id_nivel
            LEFT JOIN asistencia_estudiante ae ON iap.id_inscripcion = ae.id_inscripcion AND ae.id_gestion = ?
            WHERE ${whereClause}
            GROUP BY n.id_nivel, n.nombre
            ORDER BY n.nombre
        `

        const asistenciaPorNivel = await executeQuery(asistenciaPorNivelQuery, reportesParams)

        // Crear workbook
        const workbook = XLSX.utils.book_new()

        // Hoja de asistencia por estudiante
        const wsReportes = XLSX.utils.json_to_sheet(Array.isArray(reportes) ? reportes : [])

        // Ajustar ancho de columnas
        const colWidths = [
            { wch: 30 },  // Estudiante
            { wch: 25 },  // Colegio
            { wch: 15 },  // Nivel
            { wch: 12 },  // Curso
            { wch: 12 },  // Total Clases
            { wch: 12 },  // Asistencias
            { wch: 10 },  // Faltas
            { wch: 10 },  // Retrasos
            { wch: 10 },  // Licencias
            { wch: 12 },  // % Asistencia
            { wch: 10 },  // % Faltas
            { wch: 10 },  // % Retrasos
            { wch: 10 },  // % Licencias
            { wch: 15 }   // Estado Asistencia
        ]
        wsReportes['!cols'] = colWidths

        XLSX.utils.book_append_sheet(workbook, wsReportes, "Asistencia por Estudiante")

        // Hoja de estadísticas generales
        const wsEstadisticas = XLSX.utils.json_to_sheet(estadisticas)
        wsEstadisticas['!cols'] = [{ wch: 30 }, { wch: 20 }]
        XLSX.utils.book_append_sheet(workbook, wsEstadisticas, "Estadísticas Generales")

        // Hoja de asistencia por nivel
        const wsPorNivel = XLSX.utils.json_to_sheet(Array.isArray(asistenciaPorNivel) ? asistenciaPorNivel : [])
        wsPorNivel['!cols'] = [
            { wch: 15 },  // Nivel
            { wch: 15 },  // Total Estudiantes
            { wch: 18 },  // Promedio Asistencia
            { wch: 15 },  // Excelente
            { wch: 12 },  // Bueno
            { wch: 12 },  // Regular
            { wch: 12 }   // Malo
        ]
        XLSX.utils.book_append_sheet(workbook, wsPorNivel, "Asistencia por Nivel")

        // Generar buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

        // Configurar headers para descarga
        const headers = new Headers()
        headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        headers.set('Content-Disposition', `attachment; filename="asistencia-general-${new Date().toISOString().split('T')[0]}.xlsx"`)

        return new NextResponse(buffer, {
            status: 200,
            headers
        })

    } catch (error) {
        console.error("Error al exportar asistencia general:", error)
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        )
    }
}
