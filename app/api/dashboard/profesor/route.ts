import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = session.user.id
    console.log("🔍 Obteniendo datos del dashboard de profesor para usuario:", userId)

    // Obtener estadísticas básicas del profesor
    const totalAulas = await executeQuery<any[]>(`
      SELECT COUNT(*) as total 
      FROM aulas_profesor ap
      JOIN profesores p ON ap.id_profesor = p.id_profesor
      WHERE p.id_usuario = ?
    `, [userId])

    const totalEstudiantes = await executeQuery<any[]>(`
      SELECT COUNT(DISTINCT ia.id_estudiante) as total
      FROM inscripciones_aula ia
      JOIN aulas_profesor ap ON ia.id_aula_profesor = ap.id_aula_profesor
      JOIN profesores p ON ap.id_profesor = p.id_profesor
      WHERE p.id_usuario = ?
    `, [userId])

    const aulasActivas = await executeQuery<any[]>(`
      SELECT COUNT(*) as total 
      FROM aulas_profesor ap
      JOIN profesores p ON ap.id_profesor = p.id_profesor
      WHERE p.id_usuario = ? AND ap.activa = 1
    `, [userId])


    // Obtener notas del profesor
    let totalNotas = 0
    try {
      const notasResult = await executeQuery<any[]>(`
        SELECT COUNT(*) as total
        FROM notas_aula_profesor nap
        JOIN inscripciones_aula ia ON nap.id_inscripcion = ia.id_inscripcion
        JOIN aulas_profesor ap ON ia.id_aula_profesor = ap.id_aula_profesor
        JOIN profesores p ON ap.id_profesor = p.id_profesor
        WHERE p.id_usuario = ?
      `, [userId])
      totalNotas = notasResult[0]?.total || 0
    } catch (error) {
      console.log("⚠️ Error obteniendo notas:", error)
    }

    // Obtener asistencias del profesor
    let totalAsistencias = 0
    try {
      const asistenciasResult = await executeQuery<any[]>(`
        SELECT COUNT(*) as total
        FROM asistencia_estudiante ae
        JOIN inscripciones_aula ia ON ae.id_inscripcion = ia.id_inscripcion
        JOIN aulas_profesor ap ON ia.id_aula_profesor = ap.id_aula_profesor
        JOIN profesores p ON ap.id_profesor = p.id_profesor
        WHERE p.id_usuario = ?
      `, [userId])
      totalAsistencias = asistenciasResult[0]?.total || 0
    } catch (error) {
      console.log("⚠️ Error obteniendo asistencias:", error)
    }

    // Obtener estudiantes con notas pendientes
    let estudiantesConNotasPendientes = 0
    try {
      const pendientesResult = await executeQuery<any[]>(`
        SELECT COUNT(DISTINCT ia.id_estudiante) as total
        FROM inscripciones_aula ia
        JOIN aulas_profesor ap ON ia.id_aula_profesor = ap.id_aula_profesor
        JOIN profesores p ON ap.id_profesor = p.id_profesor
        WHERE p.id_usuario = ? 
        AND ia.id_estudiante NOT IN (
          SELECT DISTINCT ia2.id_estudiante
          FROM inscripciones_aula ia2
          JOIN notas_aula_profesor nap ON ia2.id_inscripcion = nap.id_inscripcion
          WHERE ia2.id_aula_profesor = ap.id_aula_profesor
        )
      `, [userId])
      estudiantesConNotasPendientes = pendientesResult[0]?.total || 0
    } catch (error) {
      console.log("⚠️ Error obteniendo estudiantes con notas pendientes:", error)
    }

    // Obtener asistencias pendientes de hoy
    let asistenciasPendientesHoy = 0
    try {
      const pendientesResult = await executeQuery<any[]>(`
        SELECT COUNT(DISTINCT ia.id_estudiante) as total
        FROM inscripciones_aula ia
        JOIN aulas_profesor ap ON ia.id_aula_profesor = ap.id_aula_profesor
        JOIN profesores p ON ap.id_profesor = p.id_profesor
        WHERE p.id_usuario = ? 
        AND ia.id_estudiante NOT IN (
          SELECT DISTINCT ae.id_estudiante
          FROM asistencia_estudiante ae
          WHERE ae.id_inscripcion = ia.id_inscripcion
          AND DATE(ae.fecha) = CURDATE()
        )
      `, [userId])
      asistenciasPendientesHoy = pendientesResult[0]?.total || 0
    } catch (error) {
      console.log("⚠️ Error obteniendo asistencias pendientes:", error)
    }

    // Obtener promedio de notas del profesor
    let promedioNotas = 0
    try {
      const promedioResult = await executeQuery<any[]>(`
        SELECT AVG(nap.promedio_final_trimestre) as promedio
        FROM notas_aula_profesor nap
        JOIN inscripciones_aula ia ON nap.id_inscripcion = ia.id_inscripcion
        JOIN aulas_profesor ap ON ia.id_aula_profesor = ap.id_aula_profesor
        JOIN profesores p ON ap.id_profesor = p.id_profesor
        WHERE p.id_usuario = ?
        AND nap.promedio_final_trimestre > 0
      `, [userId])
      promedioNotas = promedioResult[0]?.promedio || 0
    } catch (error) {
      console.log("⚠️ Error obteniendo promedio de notas:", error)
    }

    // Obtener próximas clases
    let proximasClases = []
    try {
      proximasClases = await executeQuery<any[]>(`
        SELECT 
          ap.id_aula_profesor as id,
          ap.nombre_aula as nombre_aula,
          hp.hora_inicio,
          hp.hora_fin,
          hp.dia,
          m.nombre_completo as materia
        FROM aulas_profesor ap
        JOIN profesores p ON ap.id_profesor = p.id_profesor
        JOIN horario_profesor hp ON ap.id_aula_profesor = hp.id_aula_profesor
        JOIN materias m ON ap.id_materia = m.id_materia
        WHERE p.id_usuario = ? 
        AND hp.dia = DAYOFWEEK(CURDATE())
        AND ap.activa = 1
        ORDER BY hp.hora_inicio
      `, [userId])
    } catch (error) {
      console.log("⚠️ Error obteniendo próximas clases:", error)
    }

    // Obtener rendimiento por aula
    let rendimientoAulas = []
    try {
      rendimientoAulas = await executeQuery<any[]>(`
        SELECT 
          ap.id_aula_profesor as id,
          ap.nombre_aula as nombre,
          COALESCE(AVG(nap.promedio_final_trimestre), 0) as promedio,
          COUNT(DISTINCT ia.id_estudiante) as estudiantes,
          ROUND((COUNT(nap.id_nota_aula_profesor) / GREATEST(COUNT(DISTINCT ia.id_estudiante) * 3, 1)) * 100) as progreso
        FROM aulas_profesor ap
        JOIN profesores p ON ap.id_profesor = p.id_profesor
        LEFT JOIN inscripciones_aula ia ON ap.id_aula_profesor = ia.id_aula_profesor
        LEFT JOIN notas_aula_profesor nap ON ia.id_inscripcion = nap.id_inscripcion
        WHERE p.id_usuario = ? AND ap.activa = 1
        GROUP BY ap.id_aula_profesor, ap.nombre_aula
        ORDER BY promedio DESC
      `, [userId])
    } catch (error) {
      console.log("⚠️ Error obteniendo rendimiento:", error)
    }

    // Obtener estudiantes destacados
    let estudiantesDestacados = []
    try {
      estudiantesDestacados = await executeQuery<any[]>(`
        SELECT 
          e.id_estudiante as id,
          CONCAT(e.nombres, ' ', COALESCE(e.apellido_paterno, ''), ' ', COALESCE(e.apellido_materno, '')) as nombre,
          ap.nombre_aula as aula,
          AVG(nap.promedio_final_trimestre) as promedio
        FROM estudiantes e
        JOIN inscripciones_aula ia ON e.id_estudiante = ia.id_estudiante
        JOIN aulas_profesor ap ON ia.id_aula_profesor = ap.id_aula_profesor
        JOIN profesores p ON ap.id_profesor = p.id_profesor
        JOIN notas_aula_profesor nap ON ia.id_inscripcion = nap.id_inscripcion
        WHERE p.id_usuario = ? AND ap.activa = 1
        GROUP BY e.id_estudiante, e.nombres, e.apellido_paterno, e.apellido_materno, ap.nombre_aula
        HAVING AVG(nap.promedio_final_trimestre) >= 8.0
        ORDER BY promedio DESC
        LIMIT 5
      `, [userId])
    } catch (error) {
      console.log("⚠️ Error obteniendo estudiantes destacados:", error)
    }

    // Generar alertas útiles para el profesor
    const alertas = []

    if (estudiantesConNotasPendientes > 0) {
      alertas.push({
        tipo: 'notas',
        mensaje: 'Estudiantes con notas pendientes',
        cantidad: estudiantesConNotasPendientes,
        aula: 'Revisar aulas'
      })
    }

    if (asistenciasPendientesHoy > 0) {
      alertas.push({
        tipo: 'asistencia',
        mensaje: 'Asistencias pendientes de hoy',
        cantidad: asistenciasPendientesHoy,
        aula: 'Registrar asistencia'
      })
    }

    const result = {
      totalAulas: totalAulas[0]?.total || 0,
      totalEstudiantes: totalEstudiantes[0]?.total || 0,
      totalNotas,
      totalAsistencias,
      aulasActivas: aulasActivas[0]?.total || 0,
      estudiantesConNotasPendientes,
      asistenciasPendientesHoy,
      promedioNotas: Math.round(promedioNotas * 10) / 10,
      proximasClases: proximasClases || [],
      rendimientoAulas: rendimientoAulas || [],
      estudiantesDestacados: estudiantesDestacados || [],
      alertas
    }

    console.log("✅ Dashboard profesor data:", result)
    return NextResponse.json(result)

  } catch (error) {
    console.error("❌ Error fetching profesor dashboard data:", error)
    return NextResponse.json({
      error: "Error al obtener datos del dashboard",
      details: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 })
  }
}
