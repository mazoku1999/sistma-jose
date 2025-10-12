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
                COUNT(DISTINCT e.id_estudiante) as 'Total Estudiantes',
                COUNT(DISTINCT pr.id_profesor) as 'Total Profesores',
                COUNT(DISTINCT ap.id_aula_profesor) as 'Total Aulas',
                COUNT(DISTINCT m.id_materia) as 'Total Materias',
                COUNT(DISTINCT col.id_colegio) as 'Total Colegios',
                ROUND(AVG(nap.promedio_final_trimestre), 2) as 'Promedio General del Colegio',
                ROUND((COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 60 THEN iap.id_estudiante END) * 100.0 / 
                       COUNT(DISTINCT iap.id_estudiante)), 2) as '% Aprobación General',
                ROUND(AVG(
                    CASE 
                        WHEN COUNT(ae.id_asistencia) > 0 THEN 
                            (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia))
                        ELSE 0 
                    END
                ), 2) as '% Asistencia General'
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
        const estadisticas = Array.isArray(estadisticasResult) ? estadisticasResult : [estadisticasResult]

        // Query para estudiantes por nivel
        const estudiantesPorNivelQuery = `
            SELECT 
                n.nombre as 'Nivel',
                COUNT(DISTINCT e.id_estudiante) as 'Total Estudiantes',
                ROUND(AVG(nap.promedio_final_trimestre), 2) as 'Promedio General',
                ROUND((COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 60 THEN iap.id_estudiante END) * 100.0 / 
                       COUNT(DISTINCT iap.id_estudiante)), 2) as '% Aprobación'
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
                col.nombre as 'Colegio',
                COUNT(DISTINCT pr.id_profesor) as 'Total Profesores',
                COUNT(DISTINCT ap.id_aula_profesor) as 'Total Aulas',
                ROUND(AVG(nap.promedio_final_trimestre), 2) as 'Promedio General'
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
                m.nombre_corto as 'Materia',
                COUNT(DISTINCT ap.id_aula_profesor) as 'Total Aulas',
                COUNT(DISTINCT iap.id_estudiante) as 'Total Estudiantes',
                ROUND(AVG(nap.promedio_final_trimestre), 2) as 'Promedio General'
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
                nap.trimestre as 'Trimestre',
                COUNT(DISTINCT iap.id_estudiante) as 'Total Estudiantes',
                ROUND(AVG(nap.promedio_final_trimestre), 2) as 'Promedio General',
                ROUND((COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 60 THEN iap.id_estudiante END) * 100.0 / 
                       COUNT(DISTINCT iap.id_estudiante)), 2) as '% Aprobación'
            FROM estudiantes e
            INNER JOIN inscripciones_aula iap ON e.id_estudiante = iap.id_estudiante
            INNER JOIN aulas_profesor ap ON iap.id_aula_profesor = ap.id_aula_profesor
            INNER JOIN notas_aula_profesor nap ON iap.id_inscripcion = nap.id_inscripcion
            WHERE ${whereClause} AND ap.activa = TRUE
            GROUP BY nap.trimestre
            ORDER BY nap.trimestre
        `

        const rendimientoPorTrimestre = await executeQuery(rendimientoPorTrimestreQuery, params)

        // Crear workbook
        const workbook = XLSX.utils.book_new()

        // Hoja de estadísticas generales
        const wsEstadisticas = XLSX.utils.json_to_sheet(estadisticas)
        wsEstadisticas['!cols'] = [{ wch: 30 }, { wch: 20 }]
        XLSX.utils.book_append_sheet(workbook, wsEstadisticas, "Estadísticas Generales")

        // Hoja de estudiantes por nivel
        const wsEstudiantesPorNivel = XLSX.utils.json_to_sheet(Array.isArray(estudiantesPorNivel) ? estudiantesPorNivel : [])
        wsEstudiantesPorNivel['!cols'] = [
            { wch: 20 },  // Nivel
            { wch: 15 },  // Total Estudiantes
            { wch: 15 },  // Promedio General
            { wch: 15 }   // % Aprobación
        ]
        XLSX.utils.book_append_sheet(workbook, wsEstudiantesPorNivel, "Estudiantes por Nivel")

        // Hoja de profesores por colegio
        const wsProfesoresPorColegio = XLSX.utils.json_to_sheet(Array.isArray(profesoresPorColegio) ? profesoresPorColegio : [])
        wsProfesoresPorColegio['!cols'] = [
            { wch: 25 },  // Colegio
            { wch: 15 },  // Total Profesores
            { wch: 12 },  // Total Aulas
            { wch: 15 }   // Promedio General
        ]
        XLSX.utils.book_append_sheet(workbook, wsProfesoresPorColegio, "Profesores por Colegio")

        // Hoja de materias más demandadas
        const wsMateriasMasDemandadas = XLSX.utils.json_to_sheet(Array.isArray(materiasMasDemandadas) ? materiasMasDemandadas : [])
        wsMateriasMasDemandadas['!cols'] = [
            { wch: 20 },  // Materia
            { wch: 12 },  // Total Aulas
            { wch: 15 },  // Total Estudiantes
            { wch: 15 }   // Promedio General
        ]
        XLSX.utils.book_append_sheet(workbook, wsMateriasMasDemandadas, "Materias Más Demandadas")

        // Hoja de rendimiento por trimestre
        const wsRendimientoPorTrimestre = XLSX.utils.json_to_sheet(Array.isArray(rendimientoPorTrimestre) ? rendimientoPorTrimestre : [])
        wsRendimientoPorTrimestre['!cols'] = [
            { wch: 12 },  // Trimestre
            { wch: 15 },  // Total Estudiantes
            { wch: 15 },  // Promedio General
            { wch: 15 }   // % Aprobación
        ]
        XLSX.utils.book_append_sheet(workbook, wsRendimientoPorTrimestre, "Rendimiento por Trimestre")

        // Generar buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

        // Configurar headers para descarga
        const headers = new Headers()
        headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        headers.set('Content-Disposition', `attachment; filename="estadisticas-generales-${new Date().toISOString().split('T')[0]}.xlsx"`)

        return new NextResponse(buffer, {
            status: 200,
            headers
        })

    } catch (error) {
        console.error("Error al exportar estadísticas generales:", error)
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        )
    }
}
