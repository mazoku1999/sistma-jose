import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

const normalizeDate = (value?: string | null) => {
  if (!value) return ""
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  if (value.includes("T")) {
    const [datePart] = value.split("T")
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart
  }
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }
  return ""
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const aulaId = (await params).id
    const { searchParams } = new URL(request.url)
    const fecha = normalizeDate(searchParams.get("fecha"))
    const trimestre = searchParams.get("trimestre") || "1"

    if (!fecha) {
      return NextResponse.json({ error: "Fecha es requerida" }, { status: 400 })
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

    // Obtener asistencias para la fecha específica
    const asistenciasQuery = await executeQuery<any[]>(
      `
      SELECT 
        ae.id_inscripcion,
        ae.fecha,
        ae.tipo_asistencia
      FROM asistencia_estudiante ae
      JOIN inscripciones_aula ia ON ae.id_inscripcion = ia.id_inscripcion
      WHERE ia.id_aula_profesor = ? AND ae.fecha = ?
      `,
      [aulaId, fecha]
    )

    const formatted = asistenciasQuery.map((row) => ({
      ...row,
      fecha: row.fecha instanceof Date ? row.fecha.toISOString().slice(0, 10) : normalizeDate(row.fecha),
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Error al obtener asistencias:", error)
    return NextResponse.json({ error: "Error al obtener asistencias" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const aulaId = (await params).id
    const { fecha, trimestre, asistencias } = await request.json()
    const normalizedFecha = normalizeDate(fecha)

    if (!normalizedFecha || !asistencias || !Array.isArray(asistencias)) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
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

    // Iniciar transacción
    await executeQuery("START TRANSACTION")

    try {
      // Eliminar asistencias existentes para esta fecha
      await executeQuery(
        `
        DELETE ae FROM asistencia_estudiante ae
        JOIN inscripciones_aula ia ON ae.id_inscripcion = ia.id_inscripcion
        WHERE ia.id_aula_profesor = ? AND ae.fecha = ?
        `,
        [aulaId, normalizedFecha]
      )

      // Insertar nuevas asistencias
      for (const asistencia of asistencias) {
        if (asistencia.tipo_asistencia && ['A', 'F', 'R', 'L'].includes(asistencia.tipo_asistencia)) {
          await executeQuery(
            "INSERT INTO asistencia_estudiante (id_inscripcion, fecha, tipo_asistencia) VALUES (?, ?, ?)",
            [asistencia.id_inscripcion, normalizedFecha, asistencia.tipo_asistencia]
          )
        }
      }

      await executeQuery("COMMIT")

      return NextResponse.json({
        success: true,
        message: "Asistencias guardadas correctamente",
        count: asistencias.length,
        fecha: normalizedFecha,
      })
    } catch (error) {
      await executeQuery("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Error al guardar asistencias:", error)
    return NextResponse.json({ error: "Error al guardar asistencias" }, { status: 500 })
  }
}