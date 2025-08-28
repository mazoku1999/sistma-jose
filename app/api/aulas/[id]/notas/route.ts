import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"
import { getGradeRange, formatGradeWithRange, isValidGrade } from "@/lib/grade-utils"

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
    const trimestre = searchParams.get("trimestre") || "1"

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

    // Obtener notas para el trimestre específico
    const notasQuery = await executeQuery<any[]>(
      `
      SELECT
        nap.id_inscripcion,
        nap.trimestre,
        nap.promedio_final_trimestre,
        e.nombres,
        e.apellidos,
        CONCAT(e.nombres, ' ', e.apellidos) as nombre_completo
      FROM notas_aula_profesor nap
      JOIN inscripciones_aula ia ON nap.id_inscripcion = ia.id_inscripcion
      JOIN estudiantes e ON ia.id_estudiante = e.id_estudiante
      WHERE ia.id_aula_profesor = ? AND nap.trimestre = ?
      ORDER BY e.apellidos, e.nombres
      `,
      [aulaId, trimestre]
    )

    // Agregar información de rangos a cada nota
    const notasConRangos = notasQuery.map(nota => ({
      ...nota,
      rango: getGradeRange(nota.promedio_final_trimestre),
      rango_descripcion: formatGradeWithRange(nota.promedio_final_trimestre)
    }))

    return NextResponse.json(notasConRangos)
  } catch (error) {
    console.error("Error al obtener notas:", error)
    return NextResponse.json({ error: "Error al obtener notas" }, { status: 500 })
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
    const { trimestre, notas } = await request.json()

    if (!trimestre || !notas || !Array.isArray(notas)) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }

    // Validar que el trimestre esté entre 1 y 3
    if (trimestre < 1 || trimestre > 3) {
      return NextResponse.json({ error: "Trimestre inválido" }, { status: 400 })
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
      // Eliminar notas existentes para este trimestre
      await executeQuery(
        `
        DELETE nap FROM notas_aula_profesor nap
        JOIN inscripciones_aula ia ON nap.id_inscripcion = ia.id_inscripcion
        WHERE ia.id_aula_profesor = ? AND nap.trimestre = ?
        `,
        [aulaId, trimestre]
      )

      // Insertar nuevas notas
      for (const nota of notas) {
        // Validar que la nota esté entre 1 y 100 usando la utilidad de rangos
        if (isValidGrade(nota.promedio_final_trimestre)) {
          // Verificar que la inscripción existe y pertenece al aula
          const inscripcionQuery = await executeQuery<any[]>(
            "SELECT id_inscripcion FROM inscripciones_aula WHERE id_inscripcion = ? AND id_aula_profesor = ?",
            [nota.id_inscripcion, aulaId]
          )

          if (inscripcionQuery.length > 0) {
            await executeQuery(
              "INSERT INTO notas_aula_profesor (id_inscripcion, trimestre, promedio_final_trimestre) VALUES (?, ?, ?)",
              [nota.id_inscripcion, trimestre, nota.promedio_final_trimestre]
            )
          }
        }
      }

      await executeQuery("COMMIT")

      return NextResponse.json({
        success: true,
        message: "Notas guardadas correctamente",
        count: notas.length
      })
    } catch (error) {
      await executeQuery("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Error al guardar notas:", error)
    return NextResponse.json({ error: "Error al guardar notas" }, { status: 500 })
  }
}