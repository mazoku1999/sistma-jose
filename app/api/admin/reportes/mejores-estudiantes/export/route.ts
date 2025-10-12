import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-server-session"
import { executeQuery } from "@/lib/db"
import * as XLSX from "xlsx"

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

        // Query para obtener mejores estudiantes
        const query = `
            SELECT 
                CONCAT(e.nombres, ' ', e.apellido_paterno, ' ', e.apellido_materno) as 'Estudiante',
                col.nombre as 'Colegio',
                n.nombre as 'Nivel',
                CONCAT(c.nombre, ' ', p.letra) as 'Curso',
                ROUND(AVG(nap.promedio_final_trimestre), 2) as 'Promedio General',
                COUNT(DISTINCT nap.id_nota_aula_profesor) as 'Total Materias',
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 60 THEN nap.id_nota_aula_profesor END) as 'Materias Aprobadas',
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre < 60 THEN nap.id_nota_aula_profesor END) as 'Materias Reprobadas',
                ROUND((COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 60 THEN nap.id_nota_aula_profesor END) * 100.0 / 
                       COUNT(DISTINCT nap.id_nota_aula_profesor)), 2) as '% Aprobación',
                CASE 
                    WHEN AVG(nap.promedio_final_trimestre) >= 90 THEN 'Excelente'
                    WHEN AVG(nap.promedio_final_trimestre) >= 80 THEN 'Muy Bueno'
                    WHEN AVG(nap.promedio_final_trimestre) >= 70 THEN 'Bueno'
                    WHEN AVG(nap.promedio_final_trimestre) >= 60 THEN 'Regular'
                    ELSE 'Deficiente'
                END as 'Rendimiento'
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

        params.push(cantidad.toString())
        const result = await executeQuery(query, params)
        const estudiantes = Array.isArray(result) ? result : []

        // Crear workbook
        const workbook = XLSX.utils.book_new()

        // Hoja de mejores estudiantes
        const wsEstudiantes = XLSX.utils.json_to_sheet(estudiantes)

        // Ajustar ancho de columnas
        const colWidths = [
            { wch: 8 },   // Ranking
            { wch: 30 },  // Estudiante
            { wch: 25 },  // Colegio
            { wch: 15 },  // Nivel
            { wch: 12 },  // Curso
            { wch: 15 },  // Promedio General
            { wch: 12 },  // Total Materias
            { wch: 15 },  // Materias Aprobadas
            { wch: 15 },  // Materias Reprobadas
            { wch: 12 },  // % Aprobación
            { wch: 12 }   // Rendimiento
        ]
        wsEstudiantes['!cols'] = colWidths

        XLSX.utils.book_append_sheet(workbook, wsEstudiantes, "Mejores Estudiantes")

        // Hoja de estadísticas generales
        const estadisticasQuery = `
            SELECT 
                COUNT(DISTINCT e.id_estudiante) as 'Total Estudiantes',
                ROUND(AVG(nap.promedio_final_trimestre), 2) as 'Promedio del Colegio',
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 90 THEN e.id_estudiante END) as 'Estudiantes Excelentes (90+)',
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 80 AND nap.promedio_final_trimestre < 90 THEN e.id_estudiante END) as 'Estudiantes Buenos (80-89)',
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 70 AND nap.promedio_final_trimestre < 80 THEN e.id_estudiante END) as 'Estudiantes Regulares (70-79)',
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre < 70 THEN e.id_estudiante END) as 'Estudiantes Deficientes (<70)'
            FROM estudiantes e
            INNER JOIN inscripciones_aula iap ON e.id_estudiante = iap.id_estudiante
            INNER JOIN aulas_profesor ap ON iap.id_aula_profesor = ap.id_aula_profesor
            INNER JOIN notas_aula_profesor nap ON iap.id_inscripcion = nap.id_inscripcion
            WHERE ${whereClause}
        `

        const estadisticasResult = await executeQuery(estadisticasQuery, params)
        const estadisticas = Array.isArray(estadisticasResult) ? estadisticasResult : [estadisticasResult]

        const wsEstadisticas = XLSX.utils.json_to_sheet(estadisticas)
        wsEstadisticas['!cols'] = [{ wch: 30 }, { wch: 20 }]
        XLSX.utils.book_append_sheet(workbook, wsEstadisticas, "Estadísticas Generales")

        // Generar buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

        // Configurar headers para descarga
        const headers = new Headers()
        headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        headers.set('Content-Disposition', `attachment; filename="mejores-estudiantes-${new Date().toISOString().split('T')[0]}.xlsx"`)

        return new NextResponse(buffer, {
            status: 200,
            headers
        })

    } catch (error) {
        console.error("Error al exportar mejores estudiantes:", error)
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        )
    }
}
