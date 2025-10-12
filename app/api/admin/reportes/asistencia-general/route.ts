import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-server-session"
import { executeQuery } from "@/lib/db"

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession()
        if (!session?.user || !session.user.roles?.includes("ADMIN")) {
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

        // Query para obtener reporte de asistencia por estudiante
        const reportesQuery = `
            SELECT 
                e.id_estudiante,
                e.nombres,
                e.apellido_paterno,
                e.apellido_materno,
                CONCAT(e.nombres, ' ', e.apellido_paterno, ' ', e.apellido_materno) as nombre_completo,
                col.nombre as colegio,
                n.nombre as nivel,
                c.nombre as curso,
                p.letra as paralelo,
                COUNT(ae.id_asistencia) as total_clases,
                COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) as asistencias,
                COUNT(CASE WHEN ae.tipo_asistencia = 'F' THEN 1 END) as faltas,
                COUNT(CASE WHEN ae.tipo_asistencia = 'R' THEN 1 END) as retrasos,
                COUNT(CASE WHEN ae.tipo_asistencia = 'L' THEN 1 END) as licencias,
                ROUND((COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)), 2) as porcentaje_asistencia,
                ROUND((COUNT(CASE WHEN ae.tipo_asistencia = 'F' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)), 2) as porcentaje_faltas,
                ROUND((COUNT(CASE WHEN ae.tipo_asistencia = 'R' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)), 2) as porcentaje_retrasos,
                ROUND((COUNT(CASE WHEN ae.tipo_asistencia = 'L' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)), 2) as porcentaje_licencias
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
                COUNT(DISTINCT e.id_estudiante) as total_estudiantes,
                ROUND(AVG(
                    CASE 
                        WHEN COUNT(ae.id_asistencia) > 0 THEN 
                            (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia))
                        ELSE 0 
                    END
                ), 2) as promedio_asistencia_general,
                COUNT(DISTINCT CASE 
                    WHEN (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) >= 95 
                    THEN e.id_estudiante 
                END) as estudiantes_excelente_asistencia,
                COUNT(DISTINCT CASE 
                    WHEN (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) >= 85 
                    AND (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) < 95 
                    THEN e.id_estudiante 
                END) as estudiantes_buena_asistencia,
                COUNT(DISTINCT CASE 
                    WHEN (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) >= 75 
                    AND (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) < 85 
                    THEN e.id_estudiante 
                END) as estudiantes_regular_asistencia,
                COUNT(DISTINCT CASE 
                    WHEN (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) < 75 
                    THEN e.id_estudiante 
                END) as estudiantes_mala_asistencia,
                SUM(CASE WHEN ae.tipo_asistencia = 'F' THEN 1 ELSE 0 END) as total_faltas,
                SUM(CASE WHEN ae.tipo_asistencia = 'R' THEN 1 ELSE 0 END) as total_retrasos,
                SUM(CASE WHEN ae.tipo_asistencia = 'L' THEN 1 ELSE 0 END) as total_licencias
            FROM estudiantes e
            INNER JOIN inscripciones_aula iap ON e.id_estudiante = iap.id_estudiante
            INNER JOIN aulas_profesor ap ON iap.id_aula_profesor = ap.id_aula_profesor
            LEFT JOIN asistencia_estudiante ae ON iap.id_inscripcion = ae.id_inscripcion AND ae.id_gestion = ?
            WHERE ${whereClause}
            GROUP BY iap.id_inscripcion
        `

        const estadisticasResult = await executeQuery(estadisticasQuery, reportesParams)
        const estadisticas = Array.isArray(estadisticasResult) ? estadisticasResult[0] : estadisticasResult

        // Query para asistencia por nivel
        const asistenciaPorNivelQuery = `
            SELECT 
                n.nombre as nivel,
                COUNT(DISTINCT e.id_estudiante) as total_estudiantes,
                ROUND(AVG(
                    CASE 
                        WHEN COUNT(ae.id_asistencia) > 0 THEN 
                            (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia))
                        ELSE 0 
                    END
                ), 2) as promedio_asistencia,
                COUNT(DISTINCT CASE 
                    WHEN (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) >= 95 
                    THEN e.id_estudiante 
                END) as estudiantes_excelente,
                COUNT(DISTINCT CASE 
                    WHEN (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) >= 85 
                    AND (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) < 95 
                    THEN e.id_estudiante 
                END) as estudiantes_bueno,
                COUNT(DISTINCT CASE 
                    WHEN (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) >= 75 
                    AND (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) < 85 
                    THEN e.id_estudiante 
                END) as estudiantes_regular,
                COUNT(DISTINCT CASE 
                    WHEN (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia)) < 75 
                    THEN e.id_estudiante 
                END) as estudiantes_malo
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

        return NextResponse.json({
            reportes: Array.isArray(reportes) ? reportes : [],
            estadisticas: estadisticas || {
                total_estudiantes: 0,
                promedio_asistencia_general: 0,
                estudiantes_excelente_asistencia: 0,
                estudiantes_buena_asistencia: 0,
                estudiantes_regular_asistencia: 0,
                estudiantes_mala_asistencia: 0,
                total_faltas: 0,
                total_retrasos: 0,
                total_licencias: 0
            },
            asistenciaPorNivel: Array.isArray(asistenciaPorNivel) ? asistenciaPorNivel : []
        })

    } catch (error) {
        console.error("Error al obtener asistencia general:", error)
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        )
    }
}
