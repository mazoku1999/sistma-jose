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

    // Si no es ADMIN, verificar propiedad del aula por el profesor
    if (!session.user.roles.includes("ADMIN")) {
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
    } else {
      // Admin: validar que el aula exista
      const aulaExists = await executeQuery<any[]>(
        "SELECT id_aula_profesor FROM aulas_profesor WHERE id_aula_profesor = ?",
        [aulaId]
      )
      if (!aulaExists.length) {
        return NextResponse.json({ error: "Aula no encontrada" }, { status: 404 })
      }
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

    // Resolver aula y validación según rol
    let aulaQuery: any[] = []
    if (session.user.roles.includes("ADMIN")) {
      aulaQuery = await executeQuery<any[]>(
        "SELECT id_aula_profesor, max_estudiantes FROM aulas_profesor WHERE id_aula_profesor = ?",
        [aulaId]
      )
    } else {
      // Obtener el ID del profesor
      const profesorQuery = await executeQuery<any[]>("SELECT id_profesor FROM profesores WHERE id_usuario = ?", [
        session.user.id,
      ])
      if (!profesorQuery.length) {
        return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
      }
      const profesorId = profesorQuery[0].id_profesor
      // Verificar que el aula pertenece al profesor
      aulaQuery = await executeQuery<any[]>(
        "SELECT id_aula_profesor, max_estudiantes FROM aulas_profesor WHERE id_aula_profesor = ? AND id_profesor = ?",
        [aulaId, profesorId]
      )
    }

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

// Bulk assign students to an aula
export async function PATCH(
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

    const { action, studentIds } = await request.json()

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: "studentIds requerido" }, { status: 400 })
    }

    if (!session.user.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Solo ADMIN puede realizar operaciones masivas" }, { status: 403 })
    }

    // Validar aula y obtener cupo
    const aulaQuery = await executeQuery<any[]>(
      "SELECT id_aula_profesor, max_estudiantes FROM aulas_profesor WHERE id_aula_profesor = ?",
      [aulaId]
    )
    if (!aulaQuery.length) return NextResponse.json({ error: "Aula no encontrada" }, { status: 404 })

    // Contar inscritos actuales
    const countQuery = await executeQuery<any[]>(
      "SELECT COUNT(*) as total FROM inscripciones_aula WHERE id_aula_profesor = ?",
      [aulaId]
    )
    const actuales = countQuery[0]?.total || 0

    if (action === "assign") {
      // Prevenir exceder cupo
      const max = aulaQuery[0].max_estudiantes
      if (actuales + studentIds.length > max) {
        return NextResponse.json({ error: `Cupo insuficiente. Disponibles: ${max - actuales}` }, { status: 400 })
      }

      await executeQuery("START TRANSACTION")
      try {
        for (const sid of studentIds) {
          await executeQuery(
            "INSERT IGNORE INTO inscripciones_aula (id_aula_profesor, id_estudiante, fecha_inscripcion) VALUES (?, ?, CURRENT_DATE)",
            [aulaId, sid]
          )
        }
        await executeQuery("COMMIT")
      } catch (e) {
        await executeQuery("ROLLBACK")
        throw e
      }
      return NextResponse.json({ success: true })
    }

    if (action === "remove") {
      await executeQuery("START TRANSACTION")
      try {
        for (const sid of studentIds) {
          await executeQuery(
            "DELETE FROM inscripciones_aula WHERE id_aula_profesor = ? AND id_estudiante = ?",
            [aulaId, sid]
          )
        }
        await executeQuery("COMMIT")
      } catch (e) {
        await executeQuery("ROLLBACK")
        throw e
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 })
  } catch (error) {
    console.error("Error en operación masiva de estudiantes:", error)
    return NextResponse.json({ error: "Error en operación masiva" }, { status: 500 })
  }
}
