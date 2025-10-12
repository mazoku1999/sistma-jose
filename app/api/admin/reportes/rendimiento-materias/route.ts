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
        let whereConditions = ["ap.id_gestion = ?"]
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

        // Query para rendimiento por materias
        const rendimientoMateriasQuery = `
            SELECT 
                m.id_materia,
                m.nombre_corto,
                m.nombre_completo,
                col.nombre as colegio,
                n.nombre as nivel,
                c.nombre as curso,
                p.letra as paralelo,
                CONCAT(u.nombres, ' ', u.apellido_paterno, ' ', u.apellido_materno) as profesor,
                COUNT(DISTINCT iap.id_estudiante) as total_estudiantes,
                AVG(nap.promedio_final_trimestre) as promedio_general,
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 60 THEN iap.id_estudiante END) as estudiantes_aprobados,
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre < 60 THEN iap.id_estudiante END) as estudiantes_reprobados,
                ROUND((COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 60 THEN iap.id_estudiante END) * 100.0 / 
                       COUNT(DISTINCT iap.id_estudiante)), 2) as porcentaje_aprobacion,
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 90 THEN iap.id_estudiante END) as estudiantes_excelentes,
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 80 AND nap.promedio_final_trimestre < 90 THEN iap.id_estudiante END) as estudiantes_buenos,
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 70 AND nap.promedio_final_trimestre < 80 THEN iap.id_estudiante END) as estudiantes_regulares,
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre < 70 THEN iap.id_estudiante END) as estudiantes_deficientes
            FROM materias m
            INNER JOIN aulas_profesor ap ON m.id_materia = ap.id_materia
            INNER JOIN profesores pr ON ap.id_profesor = pr.id_profesor
            INNER JOIN usuarios u ON pr.id_usuario = u.id_usuario
            INNER JOIN colegios col ON ap.id_colegio = col.id_colegio
            INNER JOIN niveles n ON ap.id_nivel = n.id_nivel
            INNER JOIN cursos c ON ap.id_curso = c.id_curso
            INNER JOIN paralelos p ON ap.id_paralelo = p.id_paralelo
            INNER JOIN inscripciones_aula iap ON ap.id_aula_profesor = iap.id_aula_profesor
            INNER JOIN notas_aula_profesor nap ON iap.id_inscripcion = nap.id_inscripcion
            WHERE ${whereClause} AND ap.activa = TRUE
            GROUP BY m.id_materia, m.nombre_corto, m.nombre_completo, col.nombre, n.nombre, c.nombre, p.letra, u.nombres, u.apellido_paterno, u.apellido_materno
            ORDER BY promedio_general DESC
        `

        const rendimientoMaterias = await executeQuery(rendimientoMateriasQuery, params)

        // Query para rendimiento por profesores
        const rendimientoProfesoresQuery = `
            SELECT 
                pr.id_profesor,
                CONCAT(u.nombres, ' ', u.apellido_paterno, ' ', u.apellido_materno) as nombre_profesor,
                COUNT(DISTINCT ap.id_aula_profesor) as total_materias,
                COUNT(DISTINCT iap.id_estudiante) as total_estudiantes,
                AVG(nap.promedio_final_trimestre) as promedio_general,
                ROUND((COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 60 THEN iap.id_estudiante END) * 100.0 / 
                       COUNT(DISTINCT iap.id_estudiante)), 2) as porcentaje_aprobacion_general,
                COUNT(DISTINCT CASE 
                    WHEN AVG(nap.promedio_final_trimestre) >= 90 THEN ap.id_aula_profesor 
                END) as materias_excelentes,
                COUNT(DISTINCT CASE 
                    WHEN AVG(nap.promedio_final_trimestre) >= 80 AND AVG(nap.promedio_final_trimestre) < 90 THEN ap.id_aula_profesor 
                END) as materias_buenas,
                COUNT(DISTINCT CASE 
                    WHEN AVG(nap.promedio_final_trimestre) >= 70 AND AVG(nap.promedio_final_trimestre) < 80 THEN ap.id_aula_profesor 
                END) as materias_regulares,
                COUNT(DISTINCT CASE 
                    WHEN AVG(nap.promedio_final_trimestre) < 70 THEN ap.id_aula_profesor 
                END) as materias_deficientes
            FROM profesores pr
            INNER JOIN usuarios u ON pr.id_usuario = u.id_usuario
            INNER JOIN aulas_profesor ap ON pr.id_profesor = ap.id_profesor
            INNER JOIN inscripciones_aula iap ON ap.id_aula_profesor = iap.id_aula_profesor
            INNER JOIN notas_aula_profesor nap ON iap.id_inscripcion = nap.id_inscripcion
            WHERE ${whereClause} AND ap.activa = TRUE
            GROUP BY pr.id_profesor, u.nombres, u.apellido_paterno, u.apellido_materno
            ORDER BY promedio_general DESC
        `

        const rendimientoProfesores = await executeQuery(rendimientoProfesoresQuery, params)

        // Query para estadísticas generales
        const estadisticasQuery = `
            SELECT 
                COUNT(DISTINCT ap.id_aula_profesor) as total_materias,
                COUNT(DISTINCT pr.id_profesor) as total_profesores,
                AVG(nap.promedio_final_trimestre) as promedio_general_colegio,
                ROUND((COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 60 THEN iap.id_estudiante END) * 100.0 / 
                       COUNT(DISTINCT iap.id_estudiante)), 2) as porcentaje_aprobacion_general,
                COUNT(DISTINCT CASE 
                    WHEN AVG(nap.promedio_final_trimestre) >= 90 THEN ap.id_aula_profesor 
                END) as materias_excelentes,
                COUNT(DISTINCT CASE 
                    WHEN AVG(nap.promedio_final_trimestre) >= 80 AND AVG(nap.promedio_final_trimestre) < 90 THEN ap.id_aula_profesor 
                END) as materias_buenas,
                COUNT(DISTINCT CASE 
                    WHEN AVG(nap.promedio_final_trimestre) >= 70 AND AVG(nap.promedio_final_trimestre) < 80 THEN ap.id_aula_profesor 
                END) as materias_regulares,
                COUNT(DISTINCT CASE 
                    WHEN AVG(nap.promedio_final_trimestre) < 70 THEN ap.id_aula_profesor 
                END) as materias_deficientes
            FROM aulas_profesor ap
            INNER JOIN profesores pr ON ap.id_profesor = pr.id_profesor
            INNER JOIN inscripciones_aula iap ON ap.id_aula_profesor = iap.id_aula_profesor
            INNER JOIN notas_aula_profesor nap ON iap.id_inscripcion = nap.id_inscripcion
            WHERE ${whereClause} AND ap.activa = TRUE
            GROUP BY ap.id_aula_profesor
        `

        const estadisticasResult = await executeQuery(estadisticasQuery, params)
        const estadisticas = Array.isArray(estadisticasResult) ? estadisticasResult[0] : estadisticasResult

        return NextResponse.json({
            rendimientoMaterias: Array.isArray(rendimientoMaterias) ? rendimientoMaterias : [],
            rendimientoProfesores: Array.isArray(rendimientoProfesores) ? rendimientoProfesores : [],
            estadisticas: estadisticas || {
                total_materias: 0,
                total_profesores: 0,
                promedio_general_colegio: 0,
                porcentaje_aprobacion_general: 0,
                materias_excelentes: 0,
                materias_buenas: 0,
                materias_regulares: 0,
                materias_deficientes: 0
            }
        })

    } catch (error) {
        console.error("Error al obtener rendimiento por materias:", error)
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        )
    }
}
