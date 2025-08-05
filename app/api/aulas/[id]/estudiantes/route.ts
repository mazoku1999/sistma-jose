import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const aulaId = id

    if (!aulaId) {
      return NextResponse.json({ error: "ID de aula no proporcionado" }, { status: 400 })
    }

    // Obtener el ID del profesor
    const profesorQuery = await executeQuery<any[]>("SELECT id_profesor FROM profesores WHERE id_usuario = ?", [
      session.user.id,
    ])

    if (!profesorQuery.length) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
    }

    const profesorId = profesorQuery[0].id_profesor

    // Verificar que el aula pertenece al profesor
    const aulaQuery = await executeQuery<any[]>(
      "SELECT id_aula_profesor FROM aulas_profesor WHERE id_aula_profesor = ? AND id_profesor = ?",
      [aulaId, profesorId]
    )

    if (!aulaQuery.length) {
      return NextResponse.json({ error: "Aula no encontrada" }, { status: 404 })
    }

    // Obtener estudiantes del aula
    const estudiantesQuery = await executeQuery<any[]>(
      `
      SELECT 
        e.id_estudiante as id,
        ia.id_inscripcion as inscripcion_id,
        e.nombres,
        e.apellidos,
        CONCAT(e.nombres, ' ', e.apellidos) as nombre_completo,
        DATE_FORMAT(e.fecha_registro, '%Y-%m-%d') as fecha_registro
      FROM estudiantes e
      JOIN inscripciones_aula ia ON e.id_estudiante = ia.id_estudiante
      WHERE ia.id_aula_profesor = ?
      ORDER BY nombre_completo
    `,
      [aulaId]
    )

    return NextResponse.json(estudiantesQuery)
  } catch (error) {
    console.error("Error al obtener estudiantes:", error)
    return NextResponse.json({ error: "Error al obtener estudiantes" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const aulaId = id

    if (!aulaId) {
      return NextResponse.json({ error: "ID de aula no proporcionado" }, { status: 400 })
    }

    const { nombres, apellidos } = await request.json()

    if (!nombres || !apellidos) {
      return NextResponse.json({ error: "Nombres y apellidos son requeridos" }, { status: 400 })
    }

    // Obtener el ID del profesor
    const profesorQuery = await executeQuery<any[]>("SELECT id_profesor FROM profesores WHERE id_usuario = ?", [
      session.user.id,
    ])

    if (!profesorQuery.length) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
    }

    const profesorId = profesorQuery[0].id_profesor

    // Verificar que el aula pertenece al profesor
    const aulaQuery = await executeQuery<any[]>(
      "SELECT id_aula_profesor, max_estudiantes FROM aulas_profesor WHERE id_aula_profesor = ? AND id_profesor = ?",
      [aulaId, profesorId]
    )

    if (!aulaQuery.length) {
      return NextResponse.json({ error: "Aula no encontrada" }, { status: 404 })
    }

    // Verificar cupos disponibles
    const estudiantesCountQuery = await executeQuery<any[]>(
      "SELECT COUNT(*) as total FROM inscripciones_aula WHERE id_aula_profesor = ?",
      [aulaId]
    )

    if (estudiantesCountQuery[0].total >= aulaQuery[0].max_estudiantes) {
      return NextResponse.json({ error: "No hay cupos disponibles en el aula" }, { status: 400 })
    }

    // Insertar estudiante y su inscripción en una transacción
    await executeQuery("START TRANSACTION")

    try {
      // Insertar estudiante
      const estudianteResult = await executeQuery<{ insertId: number }>(
        "INSERT INTO estudiantes (nombres, apellidos, fecha_registro) VALUES (?, ?, CURRENT_TIMESTAMP)",
        [nombres, apellidos]
      )

      const estudianteId = estudianteResult.insertId

      // Insertar inscripción
      await executeQuery(
        "INSERT INTO inscripciones_aula (id_aula_profesor, id_estudiante, fecha_inscripcion) VALUES (?, ?, CURRENT_DATE)",
        [aulaId, estudianteId]
      )

      await executeQuery("COMMIT")

      // Obtener el estudiante recién creado con la fecha formateada
      const nuevoEstudiante = await executeQuery<any[]>(
        `
        SELECT 
          e.id_estudiante as id,
          e.nombres,
          e.apellidos,
          CONCAT(e.nombres, ' ', e.apellidos) as nombre_completo,
          DATE_FORMAT(e.fecha_registro, '%Y-%m-%d') as fecha_registro
        FROM estudiantes e
        WHERE e.id_estudiante = ?
      `,
        [estudianteId]
      )

      return NextResponse.json(nuevoEstudiante[0])
    } catch (error) {
      await executeQuery("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Error al crear estudiante:", error)
    return NextResponse.json({ error: "Error al crear estudiante" }, { status: 500 })
  }
}
