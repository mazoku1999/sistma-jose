import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-server-session"
import { executeQuery } from "@/lib/db"

interface StatsResult {
  total_aulas: number
  total_estudiantes: number
  total_notas: number
  total_asistencias: number
}

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = session.user.id

    // Obtener estadísticas básicas
    const aulasQuery = await executeQuery<StatsResult[]>(
      `
      SELECT COUNT(*) as total_aulas
      FROM aulas_profesor ap
      WHERE ap.id_profesor = ?
    `,
      [userId],
    )

    const estudiantesQuery = await executeQuery<StatsResult[]>(
      `
      SELECT COUNT(DISTINCT ia.id_estudiante) as total_estudiantes
      FROM inscripciones_aula ia
      JOIN aulas_profesor ap ON ia.id_aula_profesor = ap.id_aula_profesor
      WHERE ap.id_profesor = ?
    `,
      [userId],
    )

    const notasQuery = await executeQuery<StatsResult[]>(
      `
      SELECT COUNT(*) as total_notas
      FROM notas_aula_profesor nap
      JOIN inscripciones_aula ia ON nap.id_inscripcion = ia.id_inscripcion
      JOIN aulas_profesor ap ON ia.id_aula_profesor = ap.id_aula_profesor
      WHERE ap.id_profesor = ?
    `,
      [userId],
    )

    const asistenciasQuery = await executeQuery<StatsResult[]>(
      `
      SELECT COUNT(*) as total_asistencias
      FROM asistencia_estudiante ae
      JOIN inscripciones_aula ia ON ae.id_inscripcion = ia.id_inscripcion
      JOIN aulas_profesor ap ON ia.id_aula_profesor = ap.id_aula_profesor
      WHERE ap.id_profesor = ?
    `,
      [userId],
    )

    // Obtener próximas clases para hoy
    const today = new Date().getDay() // 0 = domingo, 1 = lunes, etc.
    const proximasClasesQuery = await executeQuery(
      `
      SELECT h.id_horario, ap.nombre_aula, h.hora_inicio, h.hora_fin, h.dia
      FROM horario_profesor h
      JOIN aulas_profesor ap ON h.id_aula_profesor = ap.id_aula_profesor
      WHERE ap.id_profesor = ? AND h.dia = ?
      ORDER BY h.hora_inicio
    `,
      [userId, today],
    )

    // Obtener rendimiento por aula
    const rendimientoQuery = await executeQuery(
      `
      SELECT ap.nombre_aula as aula, 
             AVG(nap.promedio_final_trimestre) as promedio, 
             COUNT(DISTINCT ia.id_estudiante) as estudiantes
      FROM notas_aula_profesor nap
      JOIN inscripciones_aula ia ON nap.id_inscripcion = ia.id_inscripcion
      JOIN aulas_profesor ap ON ia.id_aula_profesor = ap.id_aula_profesor
      WHERE ap.id_profesor = ?
      GROUP BY ap.id_aula_profesor
      ORDER BY promedio DESC
      LIMIT 5
    `,
      [userId],
    )

    // Obtener aulas destacadas
    const aulasDestacadasQuery = await executeQuery(
      `
      SELECT ap.id_aula_profesor as id, ap.nombre_aula as nombre, 
             COUNT(DISTINCT ia.id_estudiante) as estudiantes,
             FLOOR(RAND() * 30) + 70 as progreso
      FROM aulas_profesor ap
      LEFT JOIN inscripciones_aula ia ON ap.id_aula_profesor = ia.id_aula_profesor
      WHERE ap.id_profesor = ?
      GROUP BY ap.id_aula_profesor
      ORDER BY progreso DESC, estudiantes DESC
      LIMIT 6
    `,
      [userId],
    )

    return NextResponse.json({
      totalAulas: aulasQuery[0].total_aulas,
      totalEstudiantes: estudiantesQuery[0].total_estudiantes,
      totalNotas: notasQuery[0].total_notas,
      totalAsistencias: asistenciasQuery[0].total_asistencias,
      proximasClases: proximasClasesQuery,
      rendimiento: rendimientoQuery,
      aulasDestacadas: aulasDestacadasQuery,
    })
  } catch (error) {
    console.error("Error al obtener estadísticas del dashboard:", error)
    return NextResponse.json({ error: "Error al obtener estadísticas" }, { status: 500 })
  }
}
