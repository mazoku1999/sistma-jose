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
        const paralelo = searchParams.get("paralelo")
        const colegio = searchParams.get("colegio")
        const cantidad = parseInt(searchParams.get("cantidad") || "3")
        console.log("Cantidad parseada:", cantidad, "tipo:", typeof cantidad)
        const tipo = searchParams.get("tipo") || "colegio"
        const gestion = searchParams.get("gestion") || "1"

        // Construir condiciones WHERE según el tipo de reporte
        let whereConditions = ["iap.id_gestion = ?"]
        let params: any[] = [gestion]

        // Siempre incluir colegio si se especifica
        if (colegio && colegio !== "all") {
            whereConditions.push("ap.id_colegio = ?")
            params.push(colegio)
        }

        // Para reporte por curso, incluir nivel y curso
        if (tipo === "curso") {
            if (nivel && nivel !== "all") {
                whereConditions.push("ap.id_nivel = ?")
                params.push(nivel)
            }
            if (curso && curso !== "all") {
                whereConditions.push("ap.id_curso = ?")
                params.push(curso)
            }
        }

        // Para reporte por paralelo, incluir nivel, curso y paralelo
        if (tipo === "paralelo") {
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
        }

        const whereClause = whereConditions.join(" AND ")

        // Debug: Log de parámetros
        console.log("Tipo de reporte:", tipo)
        console.log("Colegio recibido:", colegio)
        console.log("Nivel recibido:", nivel)
        console.log("Curso recibido:", curso)
        console.log("Paralelo recibido:", paralelo)
        console.log("Condiciones WHERE:", whereClause)
        console.log("Parámetros:", params)
        console.log("Cantidad:", cantidad)

        // Query para obtener mejores estudiantes con promedio general
        const estudiantesQuery = `
            SELECT 
                e.id_estudiante,
                e.nombres,
                e.apellido_paterno,
                e.apellido_materno,
                CONCAT(e.nombres, ' ', e.apellido_paterno, ' ', e.apellido_materno) as nombre_completo,
                AVG(nap.promedio_final_trimestre) as promedio_general,
                COUNT(DISTINCT nap.id_nota_aula_profesor) as total_materias,
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 60 THEN nap.id_nota_aula_profesor END) as materias_aprobadas,
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre < 60 THEN nap.id_nota_aula_profesor END) as materias_reprobadas,
                (COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 60 THEN nap.id_nota_aula_profesor END) * 100.0 / 
                 COUNT(DISTINCT nap.id_nota_aula_profesor)) as porcentaje_aprobacion,
                n.nombre as nivel,
                c.nombre as curso,
                p.letra as paralelo,
                col.nombre as colegio
            FROM estudiantes e
            INNER JOIN inscripciones_aula iap ON e.id_estudiante = iap.id_estudiante
            INNER JOIN aulas_profesor ap ON iap.id_aula_profesor = ap.id_aula_profesor
            INNER JOIN niveles n ON ap.id_nivel = n.id_nivel
            INNER JOIN cursos c ON ap.id_curso = c.id_curso
            INNER JOIN paralelos p ON ap.id_paralelo = p.id_paralelo
            INNER JOIN colegios col ON ap.id_colegio = col.id_colegio
            INNER JOIN notas_aula_profesor nap ON iap.id_inscripcion = nap.id_inscripcion
            WHERE ${whereClause}
            GROUP BY e.id_estudiante, e.nombres, e.apellido_paterno, e.apellido_materno, 
                     n.nombre, c.nombre, p.letra, col.nombre
            HAVING COUNT(DISTINCT nap.id_nota_aula_profesor) > 0
            ORDER BY AVG(nap.promedio_final_trimestre) DESC
            LIMIT ?
        `

        // Parámetros para la consulta de estudiantes (incluye LIMIT)
        const estudiantesParams = [...params, cantidad.toString()]
        console.log("Parámetros finales antes de ejecutar:", estudiantesParams)
        console.log("Cantidad de parámetros:", estudiantesParams.length)
        console.log("Tipos de parámetros:", estudiantesParams.map(p => typeof p))
        const estudiantes = await executeQuery(estudiantesQuery, estudiantesParams)

        // Query para estadísticas generales
        const estadisticasQuery = `
            SELECT 
                COUNT(DISTINCT e.id_estudiante) as total_estudiantes,
                AVG(nap.promedio_final_trimestre) as promedio_colegio,
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 90 THEN e.id_estudiante END) as estudiantes_excelentes,
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 80 AND nap.promedio_final_trimestre < 90 THEN e.id_estudiante END) as estudiantes_buenos,
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 70 AND nap.promedio_final_trimestre < 80 THEN e.id_estudiante END) as estudiantes_regulares,
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre < 70 THEN e.id_estudiante END) as estudiantes_deficientes
            FROM estudiantes e
            INNER JOIN inscripciones_aula iap ON e.id_estudiante = iap.id_estudiante
            INNER JOIN aulas_profesor ap ON iap.id_aula_profesor = ap.id_aula_profesor
            INNER JOIN notas_aula_profesor nap ON iap.id_inscripcion = nap.id_inscripcion
            WHERE ${whereClause}
        `

        const estadisticasResult = await executeQuery(estadisticasQuery, params)
        const estadisticas = Array.isArray(estadisticasResult) ? estadisticasResult[0] : estadisticasResult

        return NextResponse.json({
            estudiantes: Array.isArray(estudiantes) ? estudiantes : [],
            estadisticas: estadisticas || {
                total_estudiantes: 0,
                promedio_colegio: 0,
                estudiantes_excelentes: 0,
                estudiantes_buenos: 0,
                estudiantes_regulares: 0,
                estudiantes_deficientes: 0
            }
        })

    } catch (error) {
        console.error("Error al obtener mejores estudiantes:", error)
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        )
    }
}
