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

        // Obtener mejores estudiantes
        const mejoresEstudiantes = await executeQuery<any[]>(`
      SELECT 
        u.id_usuario as id,
        u.nombre_completo as estudiante,
        AVG(nap.promedio_final_trimestre) as promedio,
        ap.nombre_aula as aula,
        COALESCE(m.nombre_completo, 'Sin materia') as materia
      FROM aulas_profesor ap
      LEFT JOIN materias m ON ap.id_materia = m.id_materia
      JOIN inscripciones_aula ia ON ap.id_aula_profesor = ia.id_aula_profesor
      JOIN usuarios u ON ia.id_estudiante = u.id_usuario
      LEFT JOIN notas_aula_profesor nap ON ia.id_inscripcion = nap.id_inscripcion
      ${whereClause}
      GROUP BY u.id_usuario, u.nombre_completo, ap.nombre_aula, m.nombre_completo
      HAVING promedio > 0
      ORDER BY promedio DESC
      LIMIT 20
    `, params)

        return NextResponse.json(mejoresEstudiantes)
    } catch (error) {
        console.error("Error al obtener mejores estudiantes:", error)
        return NextResponse.json({ error: "Error al obtener mejores estudiantes" }, { status: 500 })
    }
}
