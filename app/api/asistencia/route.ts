import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-server-session"
import { executeQuery } from "@/lib/db"

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession()

        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        // Obtener parámetros de filtro
        const { searchParams } = new URL(request.url)
        const aulaId = searchParams.get('aula')
        const periodo = searchParams.get('periodo')

        // Obtener el profesorId del usuario
        const profesor = await executeQuery<any[]>(`
            SELECT id_profesor 
            FROM profesores 
            WHERE id_usuario = ?
        `, [session.user.id])

        if (profesor.length === 0) {
            return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
        }

        const profesorId = profesor[0].id_profesor

        // Construir filtros de fecha basados en el período
        let fechaFilter = ""
        if (periodo && periodo !== "todo") {
            const today = new Date()
            let fechaInicio = ""
            let fechaFin = today.toISOString().split('T')[0]

            if (periodo === "semana") {
                const dayOfWeek = today.getDay()
                const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
                const startOfWeek = new Date(today)
                startOfWeek.setDate(diff)
                fechaInicio = startOfWeek.toISOString().split('T')[0]
            } else if (periodo === "mes") {
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
                fechaInicio = startOfMonth.toISOString().split('T')[0]
            }

            if (fechaInicio) {
                fechaFilter = `AND ae.fecha >= '${fechaInicio}' AND ae.fecha <= '${fechaFin}'`
            }
        }

        // Construir filtro de aula
        let aulaFilter = ""
        if (aulaId && aulaId !== "all") {
            aulaFilter = `AND ap.id_aula_profesor = ${aulaId}`
        }

        // Obtener datos de asistencia con filtros
        const asistencia = await executeQuery<any[]>(`
            SELECT 
                e.id_estudiante as id,
                CONCAT(e.nombres, ' ', COALESCE(e.apellido_paterno, ''), ' ', COALESCE(e.apellido_materno, '')) as estudiante,
                ap.nombre_aula as aula,
                COUNT(DISTINCT h.id_horario) as total_clases,
                COUNT(DISTINCT CASE WHEN ae.tipo_asistencia = 'A' THEN ae.id_asistencia END) as asistencias,
                COUNT(DISTINCT CASE WHEN ae.tipo_asistencia = 'F' THEN ae.id_asistencia END) as faltas,
                CASE 
                    WHEN COUNT(DISTINCT h.id_horario) > 0 THEN 
                        ROUND((COUNT(DISTINCT CASE WHEN ae.tipo_asistencia = 'A' THEN ae.id_asistencia END) * 100.0) / COUNT(DISTINCT h.id_horario), 2)
                    ELSE 0 
                END as porcentaje_asistencia
            FROM estudiantes e
            JOIN inscripciones_aula ia ON e.id_estudiante = ia.id_estudiante
            JOIN aulas_profesor ap ON ia.id_aula_profesor = ap.id_aula_profesor
            LEFT JOIN horario_profesor h ON ap.id_aula_profesor = h.id_aula_profesor
            LEFT JOIN asistencia_estudiante ae ON ia.id_inscripcion = ae.id_inscripcion ${fechaFilter}
            WHERE ap.id_profesor = ? ${aulaFilter}
            GROUP BY e.id_estudiante, e.nombres, e.apellido_paterno, e.apellido_materno, ap.nombre_aula
            ORDER BY porcentaje_asistencia DESC, estudiante
        `, [profesorId])

        return NextResponse.json(asistencia)

    } catch (error) {
        console.error("Error al obtener datos de asistencia:", error)
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
    }
}
