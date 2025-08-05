import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Get profesor ID
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

    // Get horario
    const horario = await executeQuery<any[]>(
      `SELECT h.id_horario as id, h.dia, h.hora_inicio, h.hora_fin, 
              h.id_aula_profesor, ap.nombre_aula
       FROM horario_profesor h
       JOIN aulas_profesor ap ON h.id_aula_profesor = ap.id_aula_profesor
       WHERE ap.id_profesor = ?
       ORDER BY h.dia, h.hora_inicio`,
      [profesorId],
    )

    return NextResponse.json(horario)
  } catch (error) {
    console.error("Error fetching horario:", error)
    return NextResponse.json({ error: "Error al obtener horario" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    if (!session || !session.user.roles.includes("PROFESOR")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { dia, hora_inicio, hora_fin, id_aula_profesor } = await request.json()

    if (!dia || !hora_inicio || !hora_fin || !id_aula_profesor) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    // Get profesor ID
    const profesores = await executeQuery<any[]>("SELECT id_profesor FROM profesores WHERE id_usuario = ?", [
      session.user.id,
    ])

    if (!profesores || profesores.length === 0) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
    }

    const profesorId = profesores[0].id_profesor

    // Check if aula belongs to profesor
    const aulaCheck = await executeQuery<any[]>(
      "SELECT id_aula_profesor FROM aulas_profesor WHERE id_aula_profesor = ? AND id_profesor = ?",
      [id_aula_profesor, profesorId],
    )

    if (!aulaCheck || aulaCheck.length === 0) {
      return NextResponse.json({ error: "Aula no encontrada o no tiene permisos" }, { status: 404 })
    }

    // Check for overlapping horario
    const overlapCheck = await executeQuery<any[]>(
      `SELECT h.id_horario 
       FROM horario_profesor h
       JOIN aulas_profesor ap ON h.id_aula_profesor = ap.id_aula_profesor
       WHERE ap.id_profesor = ? AND h.dia = ? AND 
       ((h.hora_inicio <= ? AND h.hora_fin > ?) OR
        (h.hora_inicio < ? AND h.hora_fin >= ?) OR
        (h.hora_inicio >= ? AND h.hora_fin <= ?))`,
      [profesorId, dia, hora_inicio, hora_inicio, hora_fin, hora_fin, hora_inicio, hora_fin],
    )

    if (overlapCheck && overlapCheck.length > 0) {
      return NextResponse.json({ error: "El horario se superpone con otro existente" }, { status: 400 })
    }

    // Insert horario
    const result = await executeQuery<any>(
      "INSERT INTO horario_profesor (dia, hora_inicio, hora_fin, id_aula_profesor) VALUES (?, ?, ?, ?)",
      [dia, hora_inicio, hora_fin, id_aula_profesor],
    )

    // Get aula name
    const aulas = await executeQuery<any[]>("SELECT nombre_aula FROM aulas_profesor WHERE id_aula_profesor = ?", [
      id_aula_profesor,
    ])

    return NextResponse.json({
      id: result.insertId,
      dia,
      hora_inicio,
      hora_fin,
      id_aula_profesor,
      nombre_aula: aulas[0].nombre_aula,
    })
  } catch (error) {
    console.error("Error creating horario:", error)
    return NextResponse.json({ error: "Error al crear horario" }, { status: 500 })
  }
}
