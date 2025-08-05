import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET(
  request: Request,
  { params }: { params: { id: string; estudianteId: string } }
) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const aulaId = params.id
    const estudianteId = params.estudianteId

    if (!aulaId || !estudianteId) {
      return NextResponse.json({ error: "ID de aula o estudiante no proporcionado" }, { status: 400 })
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

    // Obtener información del estudiante
    const estudianteQuery = await executeQuery<any[]>(
      `
      SELECT 
        e.id_estudiante as id,
        e.nombres,
        e.apellidos,
        ia.fecha_inscripcion
      FROM estudiantes e
      JOIN inscripciones_aula ia ON e.id_estudiante = ia.id_estudiante
      WHERE ia.id_aula_profesor = ? AND e.id_estudiante = ?
    `,
      [aulaId, estudianteId]
    )

    if (!estudianteQuery.length) {
      return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 })
    }

    return NextResponse.json(estudianteQuery[0])
  } catch (error) {
    console.error("Error al obtener estudiante:", error)
    return NextResponse.json({ error: "Error al obtener estudiante" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string; estudianteId: string } }
) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const aulaId = params.id
    const estudianteId = params.estudianteId

    if (!aulaId || !estudianteId) {
      return NextResponse.json({ error: "ID de aula o estudiante no proporcionado" }, { status: 400 })
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
      "SELECT id_aula_profesor FROM aulas_profesor WHERE id_aula_profesor = ? AND id_profesor = ?",
      [aulaId, profesorId]
    )

    if (!aulaQuery.length) {
      return NextResponse.json({ error: "Aula no encontrada" }, { status: 404 })
    }

    // Verificar que el estudiante existe y pertenece al aula
    const estudianteQuery = await executeQuery<any[]>(
      `
      SELECT e.id_estudiante
      FROM estudiantes e
      JOIN inscripciones_aula ia ON e.id_estudiante = ia.id_estudiante
      WHERE ia.id_aula_profesor = ? AND e.id_estudiante = ?
    `,
      [aulaId, estudianteId]
    )

    if (!estudianteQuery.length) {
      return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 })
    }

    // Actualizar estudiante
    await executeQuery(
      "UPDATE estudiantes SET nombres = ?, apellidos = ? WHERE id_estudiante = ?",
      [nombres, apellidos, estudianteId]
    )

    return NextResponse.json({
      id: estudianteId,
      nombres,
      apellidos,
    })
  } catch (error) {
    console.error("Error al actualizar estudiante:", error)
    return NextResponse.json({ error: "Error al actualizar estudiante" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; estudianteId: string } }
) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const aulaId = params.id
    const estudianteId = params.estudianteId

    if (!aulaId || !estudianteId) {
      return NextResponse.json({ error: "ID de aula o estudiante no proporcionado" }, { status: 400 })
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

    // Verificar que el estudiante existe y pertenece al aula
    const estudianteQuery = await executeQuery<any[]>(
      `
      SELECT e.id_estudiante
      FROM estudiantes e
      JOIN inscripciones_aula ia ON e.id_estudiante = ia.id_estudiante
      WHERE ia.id_aula_profesor = ? AND e.id_estudiante = ?
    `,
      [aulaId, estudianteId]
    )

    if (!estudianteQuery.length) {
      return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 })
    }

    // Eliminar inscripción del estudiante
    await executeQuery(
      "DELETE FROM inscripciones_aula WHERE id_aula_profesor = ? AND id_estudiante = ?",
      [aulaId, estudianteId]
    )

    return NextResponse.json({ message: "Estudiante eliminado del aula" })
  } catch (error) {
    console.error("Error al eliminar estudiante:", error)
    return NextResponse.json({ error: "Error al eliminar estudiante" }, { status: 500 })
  }
}
