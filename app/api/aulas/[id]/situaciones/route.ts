import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const id = params.id
    const { searchParams } = new URL(request.url)
    const trimestre = searchParams.get("trimestre") || "1"

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

    // Check if aula exists and belongs to profesor
    const aulaCheck = await executeQuery<any[]>(
      "SELECT id_aula_profesor FROM aulas_profesor WHERE id_aula_profesor = ? AND id_profesor = ?",
      [id, profesorId],
    )

    if (!aulaCheck || aulaCheck.length === 0) {
      return NextResponse.json({ error: "Aula no encontrada o no tiene permisos" }, { status: 404 })
    }

    // Get situaciones
    const situaciones = await executeQuery<any[]>(
      `SELECT e.id_estudiante as id, 
              CONCAT(e.nombres, ' ', e.apellidos) as nombre_completo,
              COALESCE(sit.estado, 'E') as situacion
       FROM estudiantes e
       JOIN inscripciones_aula ia ON e.id_estudiante = ia.id_estudiante
       LEFT JOIN situacion_estudiante_trimestre sit ON ia.id_inscripcion = sit.id_inscripcion AND sit.trimestre = ?
       WHERE ia.id_aula_profesor = ?
       ORDER BY e.apellidos, e.nombres`,
      [trimestre, id],
    )

    if (!situaciones || situaciones.length === 0) {
      return NextResponse.json({ error: "No hay estudiantes inscritos en esta aula" }, { status: 404 })
    }

    return NextResponse.json(situaciones)
  } catch (error) {
    console.error("Error fetching situaciones:", error)
    return NextResponse.json({ error: "Error al obtener situaciones" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()

    if (!session || !session.user.roles.includes("PROFESOR")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const id = params.id
    const { trimestre, situaciones } = await request.json()

    if (!trimestre || !situaciones || !Array.isArray(situaciones)) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }

    // Get profesor ID
    const profesores = await executeQuery<any[]>("SELECT id_profesor FROM profesores WHERE id_usuario = ?", [
      session.user.id,
    ])

    if (!profesores || profesores.length === 0) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
    }

    const profesorId = profesores[0].id_profesor

    // Check if aula exists and belongs to profesor
    const aulaCheck = await executeQuery<any[]>(
      "SELECT id_aula_profesor FROM aulas_profesor WHERE id_aula_profesor = ? AND id_profesor = ?",
      [id, profesorId],
    )

    if (!aulaCheck || aulaCheck.length === 0) {
      return NextResponse.json({ error: "Aula no encontrada o no tiene permisos" }, { status: 404 })
    }

    // Start transaction
    const connection = await executeQuery("START TRANSACTION")

    try {
      for (const situacion of situaciones) {
        const { id_estudiante, situacion: estadoSituacion } = situacion

        // Get inscripcion
        const inscripciones = await executeQuery<any[]>(
          "SELECT id_inscripcion FROM inscripciones_aula WHERE id_aula_profesor = ? AND id_estudiante = ?",
          [id, id_estudiante],
        )

        if (!inscripciones || inscripciones.length === 0) {
          continue // Skip if estudiante not found in aula
        }

        const inscripcionId = inscripciones[0].id_inscripcion

        // Check if situacion already exists
        const situacionCheck = await executeQuery<any[]>(
          "SELECT id_situacion_estudiante FROM situacion_estudiante_trimestre WHERE id_inscripcion = ? AND trimestre = ?",
          [inscripcionId, trimestre],
        )

        if (situacionCheck && situacionCheck.length > 0) {
          // Update situacion
          await executeQuery(
            "UPDATE situacion_estudiante_trimestre SET estado = ? WHERE id_inscripcion = ? AND trimestre = ?",
            [estadoSituacion, inscripcionId, trimestre],
          )
        } else {
          // Insert situacion
          await executeQuery(
            "INSERT INTO situacion_estudiante_trimestre (id_inscripcion, trimestre, estado) VALUES (?, ?, ?)",
            [inscripcionId, trimestre, estadoSituacion],
          )
        }
      }

      await executeQuery("COMMIT")

      return NextResponse.json({ success: true })
    } catch (error) {
      await executeQuery("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Error saving situaciones:", error)
    return NextResponse.json({ error: "Error al guardar situaciones" }, { status: 500 })
  }
}
