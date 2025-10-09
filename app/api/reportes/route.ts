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

        // Obtener reportes por aula
        const reportes = await executeQuery<any[]>(`
      SELECT 
        ap.id_aula_profesor as id,
        ap.nombre_aula,
        COALESCE(m.nombre_completo, 'Sin materia') as materia,
        COALESCE(c.nombre, 'Sin curso') as curso,
        COALESCE(p.letra, 'Sin paralelo') as paralelo,
        COUNT(DISTINCT ia.id_estudiante) as total_estudiantes,
        COALESCE(AVG(nap.promedio_final_trimestre), 0) as promedio_general,
        COUNT(CASE WHEN nap.promedio_final_trimestre >= 7 THEN 1 END) as aprobados,
        COUNT(CASE WHEN nap.promedio_final_trimestre < 7 THEN 1 END) as reprobados
      FROM aulas_profesor ap
      LEFT JOIN materias m ON ap.id_materia = m.id_materia
      LEFT JOIN cursos c ON ap.id_curso = c.id_curso
      LEFT JOIN paralelos p ON ap.id_paralelo = p.id_paralelo
      LEFT JOIN inscripciones_aula ia ON ap.id_aula_profesor = ia.id_aula_profesor
      LEFT JOIN notas_aula_profesor nap ON ia.id_inscripcion = nap.id_inscripcion
      ${whereClause}
      GROUP BY ap.id_aula_profesor, ap.nombre_aula, m.nombre_completo, c.nombre, p.letra
      ORDER BY ap.nombre_aula
    `, params)

        // Calcular porcentaje de aprobación para cada reporte
        const reportesConPorcentaje = reportes.map(reporte => ({
            ...reporte,
            porcentaje_aprobacion: reporte.total_estudiantes > 0
                ? (reporte.aprobados / reporte.total_estudiantes) * 100
                : 0
        }))

        return NextResponse.json(reportesConPorcentaje)
    } catch (error) {
        console.error("Error al obtener reportes:", error)
        return NextResponse.json({ error: "Error al obtener reportes" }, { status: 500 })
    }
}
