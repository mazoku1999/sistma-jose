import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-server-session"
import { executeQuery } from "@/lib/db"

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession()
        if (!session?.user || (!session.user.roles?.includes("ADMIN") && !session.user.roles?.includes("ADMINISTRATIVO"))) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const colegio = searchParams.get("colegio")
        const nivel = searchParams.get("nivel")
        const curso = searchParams.get("curso")
        const paralelo = searchParams.get("paralelo")
        const gestion = searchParams.get("gestion") || "1"

        // Construir filtros dinámicamente
        let whereConditions = ["ap.id_gestion = ?", "ap.activa = TRUE"]
        let params: any[] = [gestion]

        if (colegio && colegio !== "all") {
            whereConditions.push("ap.id_colegio = ?")
            params.push(colegio)
        }

        if (nivel && nivel !== "all") {
            whereConditions.push("ap.id_nivel = ?")
            params.push(nivel)
        }

        if (curso && curso !== "all") {
            whereConditions.push("ap.id_curso = ?")
            params.push(curso)
        }

        if (paralelo && paralelo !== "all") {
            whereConditions.push("ap.id_paralelo = ?")
            params.push(paralelo)
        }

        const whereClause = whereConditions.join(" AND ")

        // 1. LISTA DETALLADA DE ESTUDIANTES CON ASISTENCIA
        const estudiantesQuery = `
            SELECT 
                e.id_estudiante,
                MAX(e.nombres) as nombres,
                MAX(e.apellido_paterno) as apellido_paterno,
                MAX(e.apellido_materno) as apellido_materno,
                TRIM(CONCAT_WS(' ', MAX(e.nombres), MAX(e.apellido_paterno), MAX(e.apellido_materno))) as nombre_completo,
                MAX(col.nombre) as colegio,
                MAX(n.nombre) as nivel,
                MAX(c.nombre) as curso,
                MAX(p.letra) as paralelo,
                COUNT(DISTINCT ae.id_asistencia) as total_registros,
                SUM(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 ELSE 0 END) as asistencias,
                SUM(CASE WHEN ae.tipo_asistencia = 'F' THEN 1 ELSE 0 END) as faltas,
                SUM(CASE WHEN ae.tipo_asistencia = 'L' THEN 1 ELSE 0 END) as licencias,
                SUM(CASE WHEN ae.tipo_asistencia = 'R' THEN 1 ELSE 0 END) as retrasos,
                CASE 
                    WHEN COUNT(ae.id_asistencia) > 0 THEN 
                        ROUND((SUM(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 ELSE 0 END) * 100.0 / COUNT(ae.id_asistencia)), 2)
                    ELSE 0 
                END as porcentaje_asistencia
            FROM estudiantes e
            JOIN inscripciones_aula iap ON e.id_estudiante = iap.id_estudiante AND iap.id_gestion = ?
            JOIN aulas_profesor ap ON iap.id_aula_profesor = ap.id_aula_profesor
            JOIN colegios col ON ap.id_colegio = col.id_colegio
            JOIN niveles n ON ap.id_nivel = n.id_nivel
            JOIN cursos c ON ap.id_curso = c.id_curso
            JOIN paralelos p ON ap.id_paralelo = p.id_paralelo
            LEFT JOIN asistencia_estudiante ae ON iap.id_inscripcion = ae.id_inscripcion AND ae.id_gestion = ?
            WHERE ${whereClause}
            GROUP BY e.id_estudiante
            ORDER BY 
                CASE WHEN TRIM(IFNULL(MAX(e.apellido_paterno), '')) = '' THEN 0 ELSE 1 END,
                CASE WHEN TRIM(IFNULL(MAX(e.apellido_paterno), '')) = '' THEN TRIM(MAX(e.apellido_materno)) ELSE TRIM(MAX(e.apellido_paterno)) END,
                CASE WHEN TRIM(IFNULL(MAX(e.apellido_paterno), '')) = '' THEN TRIM(MAX(e.nombres)) ELSE TRIM(MAX(e.apellido_materno)) END,
                TRIM(MAX(e.nombres))
        `

        const estudiantesParams = [gestion, gestion, ...params]
        const estudiantes = await executeQuery(estudiantesQuery, estudiantesParams)

        // 2. ESTADÍSTICAS GENERALES (usando subquery)
        const estadisticasQuery = `
            SELECT 
                COUNT(*) as total_estudiantes,
                ROUND(AVG(porcentaje_asistencia), 2) as promedio_asistencia_general,
                SUM(CASE WHEN porcentaje_asistencia >= 95 THEN 1 ELSE 0 END) as estudiantes_excelente_asistencia,
                SUM(CASE WHEN porcentaje_asistencia >= 85 AND porcentaje_asistencia < 95 THEN 1 ELSE 0 END) as estudiantes_buena_asistencia,
                SUM(CASE WHEN porcentaje_asistencia >= 75 AND porcentaje_asistencia < 85 THEN 1 ELSE 0 END) as estudiantes_regular_asistencia,
                SUM(CASE WHEN porcentaje_asistencia < 75 THEN 1 ELSE 0 END) as estudiantes_mala_asistencia
            FROM (
                SELECT 
                    e.id_estudiante,
                    CASE 
                        WHEN COUNT(ae.id_asistencia) > 0 THEN 
                            ROUND((SUM(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 ELSE 0 END) * 100.0 / COUNT(ae.id_asistencia)), 2)
                        ELSE 0 
                    END as porcentaje_asistencia
                FROM estudiantes e
                JOIN inscripciones_aula iap ON e.id_estudiante = iap.id_estudiante AND iap.id_gestion = ?
                JOIN aulas_profesor ap ON iap.id_aula_profesor = ap.id_aula_profesor
                LEFT JOIN asistencia_estudiante ae ON iap.id_inscripcion = ae.id_inscripcion AND ae.id_gestion = ?
                WHERE ${whereClause}
                GROUP BY e.id_estudiante
            ) AS estudiantes_con_porcentajes
        `

        const estadisticasParams = [gestion, gestion, ...params]
        const estadisticasResult = await executeQuery(estadisticasQuery, estadisticasParams)
        const estadisticas = Array.isArray(estadisticasResult) ? estadisticasResult[0] : estadisticasResult

        // 3. ASISTENCIA POR NIVEL (usando subquery para calcular primero por estudiante)
        const asistenciaPorNivelQuery = `
            SELECT 
                nivel,
                COUNT(*) as total_estudiantes,
                ROUND(AVG(porcentaje_asistencia), 2) as promedio_asistencia,
                SUM(CASE WHEN porcentaje_asistencia >= 95 THEN 1 ELSE 0 END) as estudiantes_excelente,
                SUM(CASE WHEN porcentaje_asistencia >= 85 AND porcentaje_asistencia < 95 THEN 1 ELSE 0 END) as estudiantes_bueno,
                SUM(CASE WHEN porcentaje_asistencia >= 75 AND porcentaje_asistencia < 85 THEN 1 ELSE 0 END) as estudiantes_regular,
                SUM(CASE WHEN porcentaje_asistencia < 75 THEN 1 ELSE 0 END) as estudiantes_malo
            FROM (
                SELECT 
                    e.id_estudiante,
                    MAX(n.nombre) as nivel,
                    CASE 
                        WHEN COUNT(ae.id_asistencia) > 0 THEN 
                            ROUND((SUM(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 ELSE 0 END) * 100.0 / COUNT(ae.id_asistencia)), 2)
                        ELSE 0 
                    END as porcentaje_asistencia
                FROM estudiantes e
                JOIN inscripciones_aula iap ON e.id_estudiante = iap.id_estudiante AND iap.id_gestion = ?
                JOIN aulas_profesor ap ON iap.id_aula_profesor = ap.id_aula_profesor
                JOIN niveles n ON ap.id_nivel = n.id_nivel
                LEFT JOIN asistencia_estudiante ae ON iap.id_inscripcion = ae.id_inscripcion AND ae.id_gestion = ?
                WHERE ${whereClause}
                GROUP BY e.id_estudiante
            ) AS estudiantes_con_asistencia
            GROUP BY nivel
            ORDER BY nivel
        `

        const asistenciaPorNivel = await executeQuery(asistenciaPorNivelQuery, estudiantesParams)

        return NextResponse.json({
            reportes: estudiantes || [],
            estadisticas: estadisticas || {
                total_estudiantes: 0,
                promedio_asistencia_general: 0,
                estudiantes_excelente_asistencia: 0,
                estudiantes_buena_asistencia: 0,
                estudiantes_regular_asistencia: 0,
                estudiantes_mala_asistencia: 0
            },
            asistencia_por_nivel: asistenciaPorNivel || []
        })

    } catch (error) {
        console.error("Error en asistencia general:", error)
        return NextResponse.json(
            { error: "Error al cargar asistencia" },
            { status: 500 }
        )
    }
}
