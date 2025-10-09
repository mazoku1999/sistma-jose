import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-server-session"
import { executeQuery } from "@/lib/db"

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        // Obtener ID del profesor
        let profesorId = null
        if (session.user.roles.includes("PROFESOR")) {
            const profesores = await executeQuery<any[]>("SELECT id_profesor FROM profesores WHERE id_usuario = ?", [
                session.user.id,
            ])

            if (profesores && profesores.length > 0) {
                profesorId = profesores[0].id_profesor
            }
        }

        if (!profesorId) {
            return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
        }

        const { searchParams } = new URL(request.url)
        const aulaId = searchParams.get('aula')

        // Construir consulta base
        let whereClause = "WHERE ap.id_profesor = ?"
        let params: any[] = [profesorId]

        if (aulaId && aulaId !== "all") {
            whereClause += " AND ap.id_aula_profesor = ?"
            params.push(parseInt(aulaId))
        }

        // Obtener reporte de asistencia
        const reporteAsistencia = await executeQuery<any[]>(`
      SELECT 
        u.id_usuario as id,
        u.nombre_completo as estudiante,
        ap.nombre_aula as aula,
        COUNT(ae.id_asistencia) as total_clases,
        COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) as asistencias,
        COUNT(CASE WHEN ae.tipo_asistencia = 'F' THEN 1 END) as faltas,
        CASE 
          WHEN COUNT(ae.id_asistencia) > 0 THEN 
            (COUNT(CASE WHEN ae.tipo_asistencia = 'A' THEN 1 END) * 100.0 / COUNT(ae.id_asistencia))
          ELSE 0 
        END as porcentaje_asistencia
      FROM aulas_profesor ap
      JOIN inscripciones_aula ia ON ap.id_aula_profesor = ia.id_aula_profesor
      JOIN usuarios u ON ia.id_estudiante = u.id_usuario
      LEFT JOIN asistencia_estudiante ae ON ia.id_inscripcion = ae.id_inscripcion
      ${whereClause}
      GROUP BY u.id_usuario, u.nombre_completo, ap.nombre_aula
      ORDER BY porcentaje_asistencia DESC, u.nombre_completo
    `, params)

        return NextResponse.json(reporteAsistencia)
    } catch (error) {
        console.error("Error al obtener reporte de asistencia:", error)
        return NextResponse.json({ error: "Error al obtener reporte de asistencia" }, { status: 500 })
    }
}
