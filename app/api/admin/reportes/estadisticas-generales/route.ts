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
        const profesor = searchParams.get("profesor")
        const materia = searchParams.get("materia")
        const gestion = searchParams.get("gestion") || "1"

        // Construir condiciones WHERE dinámicamente
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

        if (profesor && profesor !== "all") {
            whereConditions.push("ap.id_profesor = ?")
            params.push(profesor)
        }

        if (materia && materia !== "all") {
            whereConditions.push("ap.id_materia = ?")
            params.push(materia)
        }

        const whereClause = whereConditions.join(" AND ")

        // 1. ESTADÍSTICAS GENERALES
        const estadisticasGeneralesQuery = `
            SELECT
                COUNT(DISTINCT e.id_estudiante) as total_estudiantes,
                COUNT(DISTINCT ap.id_profesor) as total_profesores,
                COUNT(DISTINCT ap.id_aula_profesor) as total_aulas,
                COUNT(DISTINCT ap.id_materia) as total_materias,
                COUNT(DISTINCT ap.id_colegio) as total_colegios,
                ROUND(AVG(nap.promedio_final_trimestre), 2) as promedio_general_colegio,
                ROUND(SUM(CASE WHEN nap.promedio_final_trimestre >= 60 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(nap.id_nota_aula_profesor), 0), 2) as porcentaje_aprobacion_general,
                ROUND(SUM(CASE WHEN nap.promedio_final_trimestre < 60 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(nap.id_nota_aula_profesor), 0), 2) as porcentaje_reprobacion_general
            FROM estudiantes e
            JOIN inscripciones_aula iap ON e.id_estudiante = iap.id_estudiante
            JOIN aulas_profesor ap ON iap.id_aula_profesor = ap.id_aula_profesor
            LEFT JOIN notas_aula_profesor nap ON iap.id_inscripcion = nap.id_inscripcion
            WHERE ${whereClause}
        `

        const estadisticasResult = await executeQuery(estadisticasGeneralesQuery, params)
        const estadisticas = Array.isArray(estadisticasResult) ? estadisticasResult[0] : estadisticasResult

        // 2. PROMEDIO DE ASISTENCIA
        const asistenciaQuery = `
            SELECT 
                ROUND(AVG(porcentaje_asistencia), 2) as promedio_asistencia_general
            FROM (
                SELECT 
                    iap.id_inscripcion,
                    CASE 
                        WHEN COUNT(ae.id_asistencia) > 0 THEN 
                            (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia))
                        ELSE 0 
                    END as porcentaje_asistencia
                FROM inscripciones_aula iap
                JOIN aulas_profesor ap ON iap.id_aula_profesor = ap.id_aula_profesor
                LEFT JOIN asistencia_estudiante ae ON iap.id_inscripcion = ae.id_inscripcion AND ae.id_gestion = ?
                WHERE ${whereClause}
                GROUP BY iap.id_inscripcion
            ) AS asistencias
        `

        const asistenciaParams = [gestion, ...params]
        const asistenciaResult = await executeQuery(asistenciaQuery, asistenciaParams)
        const asistenciaData = Array.isArray(asistenciaResult) ? asistenciaResult[0] : asistenciaResult

        // 3. ESTUDIANTES POR NIVEL
        const estudiantesPorNivelQuery = `
            SELECT
                n.nombre as nivel,
                COUNT(DISTINCT e.id_estudiante) as total_estudiantes,
                ROUND(AVG(nap.promedio_final_trimestre), 2) as promedio_general,
                ROUND(SUM(CASE WHEN nap.promedio_final_trimestre >= 60 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(nap.id_nota_aula_profesor), 0), 2) as porcentaje_aprobacion,
                ROUND(SUM(CASE WHEN nap.promedio_final_trimestre < 60 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(nap.id_nota_aula_profesor), 0), 2) as porcentaje_reprobacion
            FROM estudiantes e
            JOIN inscripciones_aula iap ON e.id_estudiante = iap.id_estudiante
            JOIN aulas_profesor ap ON iap.id_aula_profesor = ap.id_aula_profesor
            JOIN niveles n ON ap.id_nivel = n.id_nivel
            LEFT JOIN notas_aula_profesor nap ON iap.id_inscripcion = nap.id_inscripcion
            WHERE ${whereClause}
            GROUP BY n.id_nivel, n.nombre
            ORDER BY n.nombre
        `

        const estudiantesPorNivel = await executeQuery(estudiantesPorNivelQuery, params)

        // 4. PROFESORES POR COLEGIO
        const profesoresPorColegioQuery = `
            SELECT 
                col.nombre as colegio,
                COUNT(DISTINCT ap.id_profesor) as total_profesores,
                ROUND(AVG(nap.promedio_final_trimestre), 2) as promedio_general
            FROM aulas_profesor ap
            JOIN colegios col ON ap.id_colegio = col.id_colegio
            JOIN inscripciones_aula iap ON ap.id_aula_profesor = iap.id_aula_profesor
            LEFT JOIN notas_aula_profesor nap ON iap.id_inscripcion = nap.id_inscripcion
            WHERE ${whereClause}
            GROUP BY col.id_colegio, col.nombre
            ORDER BY col.nombre
        `

        const profesoresPorColegio = await executeQuery(profesoresPorColegioQuery, params)

        // 5. MATERIAS MÁS DEMANDADAS
        const materiasMasDemandadasQuery = `
            SELECT 
                m.nombre_corto as materia,
                n.nombre as nivel,
                COUNT(DISTINCT e.id_estudiante) as total_estudiantes,
                ROUND(AVG(nap.promedio_final_trimestre), 2) as promedio_general
            FROM materias m
            JOIN aulas_profesor ap ON m.id_materia = ap.id_materia
            JOIN niveles n ON ap.id_nivel = n.id_nivel
            JOIN inscripciones_aula iap ON ap.id_aula_profesor = iap.id_aula_profesor
            JOIN estudiantes e ON iap.id_estudiante = e.id_estudiante
            LEFT JOIN notas_aula_profesor nap ON iap.id_inscripcion = nap.id_inscripcion
            WHERE ${whereClause}
            GROUP BY m.id_materia, m.nombre_corto, n.id_nivel, n.nombre
            ORDER BY total_estudiantes DESC, m.nombre_corto
            LIMIT 15
        `

        const materiasMasDemandadas = await executeQuery(materiasMasDemandadasQuery, params)

        // 6. RENDIMIENTO POR TRIMESTRE
        const rendimientoPorTrimestreQuery = `
            SELECT
                nap.trimestre,
                n.nombre as nivel,
                COUNT(DISTINCT e.id_estudiante) as total_estudiantes,
                ROUND(AVG(nap.promedio_final_trimestre), 2) as promedio_general,
                ROUND(SUM(CASE WHEN nap.promedio_final_trimestre >= 60 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(nap.id_nota_aula_profesor), 0), 2) as porcentaje_aprobacion,
                ROUND(SUM(CASE WHEN nap.promedio_final_trimestre < 60 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(nap.id_nota_aula_profesor), 0), 2) as porcentaje_reprobacion
            FROM estudiantes e
            JOIN inscripciones_aula iap ON e.id_estudiante = iap.id_estudiante
            JOIN aulas_profesor ap ON iap.id_aula_profesor = ap.id_aula_profesor
            JOIN niveles n ON ap.id_nivel = n.id_nivel
            JOIN notas_aula_profesor nap ON iap.id_inscripcion = nap.id_inscripcion
            WHERE ${whereClause}
            GROUP BY nap.trimestre, n.id_nivel, n.nombre
            ORDER BY nap.trimestre, n.nombre
        `

        const rendimientoPorTrimestre = await executeQuery(rendimientoPorTrimestreQuery, params)

        // 7. RENDIMIENTO POR CURSO Y MATERIA
        const rendimientoCursoMateriaQuery = `
            SELECT
                c.nombre as curso,
                m.nombre_corto as materia,
                COUNT(DISTINCT e.id_estudiante) as total_estudiantes,
                ROUND(AVG(nap.promedio_final_trimestre), 2) as promedio_general,
                ROUND(SUM(CASE WHEN nap.promedio_final_trimestre >= 60 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(nap.id_nota_aula_profesor), 0), 2) as porcentaje_aprobacion,
                ROUND(SUM(CASE WHEN nap.promedio_final_trimestre < 60 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(nap.id_nota_aula_profesor), 0), 2) as porcentaje_reprobacion
            FROM estudiantes e
            JOIN inscripciones_aula iap ON e.id_estudiante = iap.id_estudiante
            JOIN aulas_profesor ap ON iap.id_aula_profesor = ap.id_aula_profesor
            JOIN cursos c ON ap.id_curso = c.id_curso
            JOIN materias m ON ap.id_materia = m.id_materia
            LEFT JOIN notas_aula_profesor nap ON iap.id_inscripcion = nap.id_inscripcion
            WHERE ${whereClause}
            GROUP BY c.id_curso, c.nombre, m.id_materia, m.nombre_corto
            ORDER BY c.nombre, m.id_materia
        `

        const rendimientoCursoMateria = await executeQuery(rendimientoCursoMateriaQuery, params)

        // Respuesta final
        return NextResponse.json({
            total_estudiantes: estadisticas?.total_estudiantes || 0,
            total_profesores: estadisticas?.total_profesores || 0,
            total_aulas: estadisticas?.total_aulas || 0,
            total_materias: estadisticas?.total_materias || 0,
            total_colegios: estadisticas?.total_colegios || 0,
            promedio_general_colegio: estadisticas?.promedio_general_colegio || 0,
            porcentaje_aprobacion_general: estadisticas?.porcentaje_aprobacion_general || 0,
            porcentaje_reprobacion_general: estadisticas?.porcentaje_reprobacion_general || 0,
            promedio_asistencia_general: asistenciaData?.promedio_asistencia_general || 0,
            estudiantes_por_nivel: estudiantesPorNivel || [],
            profesores_por_colegio: profesoresPorColegio || [],
            materias_mas_demandadas: materiasMasDemandadas || [],
            rendimiento_por_trimestre: rendimientoPorTrimestre || [],
            rendimiento_curso_materia: rendimientoCursoMateria || []
        })

    } catch (error) {
        console.error("Error en estadísticas generales:", error)
        return NextResponse.json(
            { error: "Error al cargar estadísticas" },
            { status: 500 }
        )
    }
}

