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
        const colegio = searchParams.get("colegio")
        const gestion = searchParams.get("gestion") || "1"

        // Construir condiciones WHERE
        let whereConditions = ["ap.id_gestion = ?"]
        let params: any[] = [gestion]

        if (colegio && colegio !== "all") {
            whereConditions.push("ap.id_colegio = ?")
            params.push(colegio)
        }

        const whereClause = whereConditions.join(" AND ")

        // Query para estadísticas generales
        const estadisticasGeneralesQuery = `
            SELECT 
                COUNT(DISTINCT e.id_estudiante) as total_estudiantes,
                COUNT(DISTINCT pr.id_profesor) as total_profesores,
                COUNT(DISTINCT ap.id_aula_profesor) as total_aulas,
                COUNT(DISTINCT m.id_materia) as total_materias,
                COUNT(DISTINCT col.id_colegio) as total_colegios,
                AVG(nap.promedio_final_trimestre) as promedio_general_colegio,
                ROUND((COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 60 THEN iap.id_estudiante END) * 100.0 / 
                       COUNT(DISTINCT iap.id_estudiante)), 2) as porcentaje_aprobacion_general,
                ROUND(AVG(
                    CASE 
                        WHEN COUNT(ae.id_asistencia) > 0 THEN 
                            (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia))
                        ELSE 0 
                    END
                ), 2) as promedio_asistencia_general
            FROM estudiantes e
            INNER JOIN inscripciones_aula iap ON e.id_estudiante = iap.id_estudiante
            INNER JOIN aulas_profesor ap ON iap.id_aula_profesor = ap.id_aula_profesor
            INNER JOIN profesores pr ON ap.id_profesor = pr.id_profesor
            INNER JOIN materias m ON ap.id_materia = m.id_materia
            INNER JOIN colegios col ON ap.id_colegio = col.id_colegio
            INNER JOIN notas_aula_profesor nap ON iap.id_inscripcion = nap.id_inscripcion
            LEFT JOIN asistencia_estudiante ae ON iap.id_inscripcion = ae.id_inscripcion AND ae.id_gestion = ?
            WHERE ${whereClause} AND ap.activa = TRUE
            GROUP BY iap.id_inscripcion
        `

        const estadisticasParams = [...params, gestion]
        const estadisticasResult = await executeQuery(estadisticasGeneralesQuery, estadisticasParams)
        const estadisticas = Array.isArray(estadisticasResult) ? estadisticasResult[0] : estadisticasResult

        // Query para estudiantes por nivel
        const estudiantesPorNivelQuery = `
            SELECT 
                n.nombre as nivel,
                COUNT(DISTINCT e.id_estudiante) as total_estudiantes,
                AVG(nap.promedio_final_trimestre) as promedio_general,
                ROUND((COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 60 THEN iap.id_estudiante END) * 100.0 / 
                       COUNT(DISTINCT iap.id_estudiante)), 2) as porcentaje_aprobacion
            FROM estudiantes e
            INNER JOIN inscripciones_aula iap ON e.id_estudiante = iap.id_estudiante
            INNER JOIN aulas_profesor ap ON iap.id_aula_profesor = ap.id_aula_profesor
            INNER JOIN niveles n ON ap.id_nivel = n.id_nivel
            INNER JOIN notas_aula_profesor nap ON iap.id_inscripcion = nap.id_inscripcion
            WHERE ${whereClause} AND ap.activa = TRUE
            GROUP BY n.id_nivel, n.nombre
            ORDER BY n.nombre
        `

        const estudiantesPorNivel = await executeQuery(estudiantesPorNivelQuery, params)

        // Query para profesores por colegio
        const profesoresPorColegioQuery = `
            SELECT 
                col.nombre as colegio,
                COUNT(DISTINCT pr.id_profesor) as total_profesores,
                COUNT(DISTINCT ap.id_aula_profesor) as total_aulas,
                AVG(nap.promedio_final_trimestre) as promedio_general
            FROM profesores pr
            INNER JOIN aulas_profesor ap ON pr.id_profesor = ap.id_profesor
            INNER JOIN colegios col ON ap.id_colegio = col.id_colegio
            INNER JOIN inscripciones_aula iap ON ap.id_aula_profesor = iap.id_aula_profesor
            INNER JOIN notas_aula_profesor nap ON iap.id_inscripcion = nap.id_inscripcion
            WHERE ${whereClause} AND ap.activa = TRUE
            GROUP BY col.id_colegio, col.nombre
            ORDER BY col.nombre
        `

        const profesoresPorColegio = await executeQuery(profesoresPorColegioQuery, params)

        // Query para materias más demandadas
        const materiasMasDemandadasQuery = `
            SELECT 
                m.nombre_corto as materia,
                COUNT(DISTINCT ap.id_aula_profesor) as total_aulas,
                COUNT(DISTINCT iap.id_estudiante) as total_estudiantes,
                AVG(nap.promedio_final_trimestre) as promedio_general
            FROM materias m
            INNER JOIN aulas_profesor ap ON m.id_materia = ap.id_materia
            INNER JOIN inscripciones_aula iap ON ap.id_aula_profesor = iap.id_aula_profesor
            INNER JOIN notas_aula_profesor nap ON iap.id_inscripcion = nap.id_inscripcion
            WHERE ${whereClause} AND ap.activa = TRUE
            GROUP BY m.id_materia, m.nombre_corto
            ORDER BY total_aulas DESC, total_estudiantes DESC
            LIMIT 10
        `

        const materiasMasDemandadas = await executeQuery(materiasMasDemandadasQuery, params)

        // Query para rendimiento por trimestre
        const rendimientoPorTrimestreQuery = `
            SELECT 
                nap.trimestre,
                COUNT(DISTINCT iap.id_estudiante) as total_estudiantes,
                AVG(nap.promedio_final_trimestre) as promedio_general,
                ROUND((COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 60 THEN iap.id_estudiante END) * 100.0 / 
                       COUNT(DISTINCT iap.id_estudiante)), 2) as porcentaje_aprobacion
            FROM estudiantes e
            INNER JOIN inscripciones_aula iap ON e.id_estudiante = iap.id_estudiante
            INNER JOIN aulas_profesor ap ON iap.id_aula_profesor = ap.id_aula_profesor
            INNER JOIN notas_aula_profesor nap ON iap.id_inscripcion = nap.id_inscripcion
            WHERE ${whereClause} AND ap.activa = TRUE
            GROUP BY nap.trimestre
            ORDER BY nap.trimestre
        `

        const rendimientoPorTrimestre = await executeQuery(rendimientoPorTrimestreQuery, params)

        return NextResponse.json({
            total_estudiantes: estadisticas?.total_estudiantes || 0,
            total_profesores: estadisticas?.total_profesores || 0,
            total_aulas: estadisticas?.total_aulas || 0,
            total_materias: estadisticas?.total_materias || 0,
            total_colegios: estadisticas?.total_colegios || 0,
            promedio_general_colegio: estadisticas?.promedio_general_colegio || 0,
            porcentaje_aprobacion_general: estadisticas?.porcentaje_aprobacion_general || 0,
            promedio_asistencia_general: estadisticas?.promedio_asistencia_general || 0,
            estudiantes_por_nivel: Array.isArray(estudiantesPorNivel) ? estudiantesPorNivel : [],
            profesores_por_colegio: Array.isArray(profesoresPorColegio) ? profesoresPorColegio : [],
            materias_mas_demandadas: Array.isArray(materiasMasDemandadas) ? materiasMasDemandadas : [],
            rendimiento_por_trimestre: Array.isArray(rendimientoPorTrimestre) ? rendimientoPorTrimestre : []
        })

    } catch (error) {
        console.error("Error al obtener estadísticas generales:", error)
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        )
    }
}
