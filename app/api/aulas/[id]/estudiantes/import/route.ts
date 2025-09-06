import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

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
    const { estudiantes } = await request.json()

    if (!Array.isArray(estudiantes) || estudiantes.length === 0) {
      return NextResponse.json({ error: "No se proporcionaron estudiantes para importar" }, { status: 400 })
    }

    // Validar aula según rol
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
        "SELECT id_aula_profesor FROM aulas_profesor WHERE id_aula_profesor = ? AND id_profesor = ?",
        [aulaId, profesorId]
      )
    }

    if (!aulaQuery.length) {
      return NextResponse.json({ error: "Aula no encontrada" }, { status: 404 })
    }

    let importedCount = 0
    let errors: string[] = []
    let skippedByCapacity = 0
    let createdNewStudents = 0
    let reusedExistingStudents = 0

    // Iniciar transacción
    await executeQuery("START TRANSACTION")

    try {
      // Obtener capacidad disponible
      const aulaCapRow = await executeQuery<any[]>(
        "SELECT max_estudiantes FROM aulas_profesor WHERE id_aula_profesor = ?",
        [aulaId]
      )
      const max = aulaCapRow[0]?.max_estudiantes ?? 0
      const countRow = await executeQuery<any[]>(
        "SELECT COUNT(*) as total FROM inscripciones_aula WHERE id_aula_profesor = ?",
        [aulaId]
      )
      let remaining = Math.max(0, max - (countRow[0]?.total ?? 0))

      if (remaining <= 0) {
        await executeQuery("ROLLBACK")
        return NextResponse.json({
          success: true,
          imported: 0,
          errors: ["No hay cupos disponibles en el aula"],
          skippedByCapacity: estudiantes.length,
          createdNewStudents: 0,
          reusedExistingStudents: 0,
        })
      }
      for (const estudiante of estudiantes) {
        // Validar datos
        if (!estudiante.Nombres || !estudiante.Apellidos) {
          errors.push(`Estudiante sin nombres o apellidos completos`)
          continue
        }

        const nombres = estudiante.Nombres.toString().trim()
        const apellidos = estudiante.Apellidos.toString().trim()

        if (nombres.length === 0 || apellidos.length === 0) {
          errors.push(`Estudiante con nombres o apellidos vacíos: ${nombres} ${apellidos}`)
          continue
        }

        try {
          if (remaining <= 0) {
            skippedByCapacity += 1
            continue
          }
          // Verificar si el estudiante ya existe
          const existingStudent = await executeQuery<any[]>(
            "SELECT id_estudiante FROM estudiantes WHERE nombres = ? AND apellidos = ?",
            [nombres, apellidos]
          )

          let studentId: number

          if (existingStudent.length > 0) {
            studentId = existingStudent[0].id_estudiante
            reusedExistingStudents += 1
          } else {
            // Crear nuevo estudiante
            const insertResult = await executeQuery<any>(
              "INSERT INTO estudiantes (nombres, apellidos) VALUES (?, ?)",
              [nombres, apellidos]
            )
            studentId = insertResult.insertId
            createdNewStudents += 1
          }

          // Verificar si ya está inscrito en esta aula
          const existingInscription = await executeQuery<any[]>(
            "SELECT id_inscripcion FROM inscripciones_aula WHERE id_aula_profesor = ? AND id_estudiante = ?",
            [aulaId, studentId]
          )

          if (existingInscription.length === 0) {
            // Inscribir estudiante en el aula
            await executeQuery(
              "INSERT INTO inscripciones_aula (id_aula_profesor, id_estudiante, fecha_inscripcion) VALUES (?, ?, CURRENT_DATE)",
              [aulaId, studentId]
            )
            importedCount++
            remaining = Math.max(0, remaining - 1)
          } else {
            errors.push(`${nombres} ${apellidos} ya está inscrito en esta aula`)
          }
        } catch (error) {
          console.error(`Error al procesar estudiante ${nombres} ${apellidos}:`, error)
          errors.push(`Error al procesar ${nombres} ${apellidos}`)
        }
      }

      await executeQuery("COMMIT")

      return NextResponse.json({
        success: true,
        imported: importedCount,
        errors: errors,
        skippedByCapacity,
        createdNewStudents,
        reusedExistingStudents,
        message: `${importedCount} estudiantes importados correctamente`
      })
    } catch (error) {
      await executeQuery("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Error al importar estudiantes:", error)
    return NextResponse.json({ error: "Error al importar estudiantes" }, { status: 500 })
  }
}
