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

    const aulaId = (await params).id

    if (!aulaId) {
      return NextResponse.json({ error: "ID de aula no proporcionado" }, { status: 400 })
    }

    // Obtener estudiantes del aula
    const estudiantesQuery = await executeQuery<any[]>(
      `
      SELECT 
        e.id_estudiante as id,
        ia.id_inscripcion as inscripcion_id,
        e.nombres,
        e.apellido_paterno,
        e.apellido_materno,
        CONCAT_WS(' ', e.nombres, e.apellido_paterno, e.apellido_materno) as nombre_completo,
        DATE_FORMAT(e.fecha_registro, '%Y-%m-%d') as fecha_registro
      FROM estudiantes e
      JOIN inscripciones_aula ia ON e.id_estudiante = ia.id_estudiante
      WHERE ia.id_aula_profesor = ?
      ORDER BY 
        CASE WHEN TRIM(IFNULL(e.apellido_paterno, '')) = '' THEN 0 ELSE 1 END,
        CASE WHEN TRIM(IFNULL(e.apellido_paterno, '')) = '' THEN TRIM(e.apellido_materno) ELSE TRIM(e.apellido_paterno) END,
        CASE WHEN TRIM(IFNULL(e.apellido_paterno, '')) = '' THEN TRIM(e.nombres) ELSE TRIM(e.apellido_materno) END,
        TRIM(e.nombres)
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

    const aulaId = (await params).id

    if (!aulaId) {
      return NextResponse.json({ error: "ID de aula no proporcionado" }, { status: 400 })
    }

    const body = await request.json()
    const nombres: string = (body.nombres || '').toString().trim()
    const apellido_paterno: string = (body.apellido_paterno || body.apellidos || '').toString().trim()
    const apellido_materno: string = (body.apellido_materno || '').toString().trim()

    if (!nombres || !apellido_paterno || !apellido_materno) {
      return NextResponse.json({ error: "Nombres, apellido paterno y apellido materno son requeridos" }, { status: 400 })
    }

    // Crear o reutilizar estudiante
    const existingStudent = await executeQuery<any[]>(
      "SELECT id_estudiante FROM estudiantes WHERE nombres = ? AND COALESCE(apellido_paterno, '') = ? AND COALESCE(apellido_materno, '') = ?",
      [nombres, apellido_paterno, apellido_materno]
    )

    let studentId: number

    if (existingStudent.length > 0) {
      studentId = existingStudent[0].id_estudiante
    } else {
      const insertResult = await executeQuery<any>(
        "INSERT INTO estudiantes (nombres, apellido_paterno, apellido_materno) VALUES (?, ?, ?)",
        [nombres, apellido_paterno, apellido_materno]
      )
      studentId = insertResult.insertId
    }

    // Inscribir si no está inscrito
    const existingInscription = await executeQuery<any[]>(
      "SELECT id_inscripcion FROM inscripciones_aula WHERE id_aula_profesor = ? AND id_estudiante = ?",
      [aulaId, studentId]
    )

    if (!existingInscription.length) {
      await executeQuery(
        "INSERT INTO inscripciones_aula (id_aula_profesor, id_estudiante, fecha_inscripcion) VALUES (?, ?, CURRENT_DATE)",
        [aulaId, studentId]
      )
    }

    return NextResponse.json({ id: studentId, nombres, apellido_paterno, apellido_materno })
  } catch (error) {
    console.error("Error al agregar estudiante:", error)
    return NextResponse.json({ error: "Error al agregar estudiante" }, { status: 500 })
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
