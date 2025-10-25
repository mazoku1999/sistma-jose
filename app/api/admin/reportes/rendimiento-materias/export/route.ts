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
                m.nombre_corto as 'Materia',
                m.nombre_completo as 'Materia Completa',
                CONCAT(u.nombres, ' ', u.apellido_paterno, ' ', u.apellido_materno) as 'Profesor',
                col.nombre as 'Colegio',
                n.nombre as 'Nivel',
                CONCAT(c.nombre, ' ', p.letra) as 'Curso',
                COUNT(DISTINCT iap.id_estudiante) as 'Total Estudiantes',
                ROUND(AVG(nap.promedio_final_trimestre), 2) as 'Promedio General',
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 60 THEN iap.id_estudiante END) as 'Estudiantes Aprobados',
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre < 60 THEN iap.id_estudiante END) as 'Estudiantes Reprobados',
                ROUND((COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 60 THEN iap.id_estudiante END) * 100.0 / 
                       COUNT(DISTINCT iap.id_estudiante)), 2) as '% Aprobación',
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 90 THEN iap.id_estudiante END) as 'Estudiantes Excelentes',
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 80 AND nap.promedio_final_trimestre < 90 THEN iap.id_estudiante END) as 'Estudiantes Buenos',
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 70 AND nap.promedio_final_trimestre < 80 THEN iap.id_estudiante END) as 'Estudiantes Regulares',
                COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre < 70 THEN iap.id_estudiante END) as 'Estudiantes Deficientes',
                CASE 
                    WHEN AVG(nap.promedio_final_trimestre) >= 90 THEN 'Excelente'
                    WHEN AVG(nap.promedio_final_trimestre) >= 80 THEN 'Muy Bueno'
                    WHEN AVG(nap.promedio_final_trimestre) >= 70 THEN 'Bueno'
                    WHEN AVG(nap.promedio_final_trimestre) >= 60 THEN 'Regular'
                    ELSE 'Deficiente'
                END as 'Rendimiento'
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
                CONCAT(u.nombres, ' ', u.apellido_paterno, ' ', u.apellido_materno) as 'Profesor',
                COUNT(DISTINCT ap.id_aula_profesor) as 'Total Materias',
                COUNT(DISTINCT iap.id_estudiante) as 'Total Estudiantes',
                ROUND(AVG(nap.promedio_final_trimestre), 2) as 'Promedio General',
                ROUND((COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 60 THEN iap.id_estudiante END) * 100.0 / 
                       COUNT(DISTINCT iap.id_estudiante)), 2) as '% Aprobación General',
                COUNT(DISTINCT CASE 
                    WHEN AVG(nap.promedio_final_trimestre) >= 90 THEN ap.id_aula_profesor 
                END) as 'Materias Excelentes',
                COUNT(DISTINCT CASE 
                    WHEN AVG(nap.promedio_final_trimestre) >= 80 AND AVG(nap.promedio_final_trimestre) < 90 THEN ap.id_aula_profesor 
                END) as 'Materias Buenas',
                COUNT(DISTINCT CASE 
                    WHEN AVG(nap.promedio_final_trimestre) >= 70 AND AVG(nap.promedio_final_trimestre) < 80 THEN ap.id_aula_profesor 
                END) as 'Materias Regulares',
                COUNT(DISTINCT CASE 
                    WHEN AVG(nap.promedio_final_trimestre) < 70 THEN ap.id_aula_profesor 
                END) as 'Materias Deficientes',
                CASE 
                    WHEN AVG(nap.promedio_final_trimestre) >= 90 THEN 'Excelente'
                    WHEN AVG(nap.promedio_final_trimestre) >= 80 THEN 'Muy Bueno'
                    WHEN AVG(nap.promedio_final_trimestre) >= 70 THEN 'Bueno'
                    WHEN AVG(nap.promedio_final_trimestre) >= 60 THEN 'Regular'
                    ELSE 'Deficiente'
                END as 'Rendimiento'
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
                COUNT(DISTINCT ap.id_aula_profesor) as 'Total Materias',
                COUNT(DISTINCT pr.id_profesor) as 'Total Profesores',
                ROUND(AVG(nap.promedio_final_trimestre), 2) as 'Promedio General del Colegio',
                ROUND((COUNT(DISTINCT CASE WHEN nap.promedio_final_trimestre >= 60 THEN iap.id_estudiante END) * 100.0 / 
                       COUNT(DISTINCT iap.id_estudiante)), 2) as '% Aprobación General',
                COUNT(DISTINCT CASE 
                    WHEN AVG(nap.promedio_final_trimestre) >= 90 THEN ap.id_aula_profesor 
                END) as 'Materias Excelentes',
                COUNT(DISTINCT CASE 
                    WHEN AVG(nap.promedio_final_trimestre) >= 80 AND AVG(nap.promedio_final_trimestre) < 90 THEN ap.id_aula_profesor 
                END) as 'Materias Buenas',
                COUNT(DISTINCT CASE 
                    WHEN AVG(nap.promedio_final_trimestre) >= 70 AND AVG(nap.promedio_final_trimestre) < 80 THEN ap.id_aula_profesor 
                END) as 'Materias Regulares',
                COUNT(DISTINCT CASE 
                    WHEN AVG(nap.promedio_final_trimestre) < 70 THEN ap.id_aula_profesor 
                END) as 'Materias Deficientes'
            FROM aulas_profesor ap
            INNER JOIN profesores pr ON ap.id_profesor = pr.id_profesor
            INNER JOIN inscripciones_aula iap ON ap.id_aula_profesor = iap.id_aula_profesor
            INNER JOIN notas_aula_profesor nap ON iap.id_inscripcion = nap.id_inscripcion
            WHERE ${whereClause} AND ap.activa = TRUE
            GROUP BY ap.id_aula_profesor
        `

        const estadisticasResult = await executeQuery(estadisticasQuery, params)
        const estadisticas = Array.isArray(estadisticasResult) ? estadisticasResult : [estadisticasResult]

        // Crear workbook
        const workbook = XLSX.utils.book_new()

        // Hoja de rendimiento por materias
        const wsMaterias = XLSX.utils.json_to_sheet(Array.isArray(rendimientoMaterias) ? rendimientoMaterias : [])

        // Ajustar ancho de columnas
        const colWidthsMaterias = [
            { wch: 15 },  // Materia
            { wch: 40 },  // Materia Completa
            { wch: 30 },  // Profesor
            { wch: 25 },  // Colegio
            { wch: 15 },  // Nivel
            { wch: 12 },  // Curso
            { wch: 15 },  // Total Estudiantes
            { wch: 15 },  // Promedio General
            { wch: 18 },  // Estudiantes Aprobados
            { wch: 18 },  // Estudiantes Reprobados
            { wch: 12 },  // % Aprobación
            { wch: 18 },  // Estudiantes Excelentes
            { wch: 15 },  // Estudiantes Buenos
            { wch: 15 },  // Estudiantes Regulares
            { wch: 18 },  // Estudiantes Deficientes
            { wch: 12 }   // Rendimiento
        ]
        wsMaterias['!cols'] = colWidthsMaterias

        XLSX.utils.book_append_sheet(workbook, wsMaterias, "Rendimiento por Materias")

        // Hoja de rendimiento por profesores
        const wsProfesores = XLSX.utils.json_to_sheet(Array.isArray(rendimientoProfesores) ? rendimientoProfesores : [])

        const colWidthsProfesores = [
            { wch: 30 },  // Profesor
            { wch: 15 },  // Total Materias
            { wch: 15 },  // Total Estudiantes
            { wch: 15 },  // Promedio General
            { wch: 18 },  // % Aprobación General
            { wch: 18 },  // Materias Excelentes
            { wch: 15 },  // Materias Buenas
            { wch: 15 },  // Materias Regulares
            { wch: 18 },  // Materias Deficientes
            { wch: 12 }   // Rendimiento
        ]
        wsProfesores['!cols'] = colWidthsProfesores

        XLSX.utils.book_append_sheet(workbook, wsProfesores, "Rendimiento por Profesores")

        // Hoja de estadísticas generales
        const wsEstadisticas = XLSX.utils.json_to_sheet(estadisticas)
        wsEstadisticas['!cols'] = [{ wch: 30 }, { wch: 20 }]
        XLSX.utils.book_append_sheet(workbook, wsEstadisticas, "Estadísticas Generales")

        // Generar buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

        // Configurar headers para descarga
        const headers = new Headers()
        headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        headers.set('Content-Disposition', `attachment; filename="rendimiento-materias-${new Date().toISOString().split('T')[0]}.xlsx"`)

        return new NextResponse(buffer, {
            status: 200,
            headers
        })

    } catch (error) {
        console.error("Error al exportar rendimiento por materias:", error)
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        )
    }
}
