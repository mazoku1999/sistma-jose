import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo los administradores pueden centralizar notas
    if (!session.user.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Solo los administradores pueden centralizar notas" }, { status: 403 })
    }

    const id = params.id

    // Para administradores, obtener el profesor asociado al aula
    const aulaProfesorQuery = await executeQuery<any[]>(
      "SELECT id_profesor FROM aulas_profesor WHERE id_aula_profesor = ?",
      [id]
    )

    if (!aulaProfesorQuery || aulaProfesorQuery.length === 0) {
      return NextResponse.json({ error: "Aula no encontrada" }, { status: 404 })
    }

    const profesorId = aulaProfesorQuery[0].id_profesor

    // Check if aula exists
    const aulaCheck = await executeQuery<any[]>(
      `SELECT ap.id_aula_profesor, ap.id_colegio, ap.id_nivel, ap.id_curso, ap.id_paralelo, ap.id_materia
       FROM aulas_profesor ap
       WHERE ap.id_aula_profesor = ?`,
      [id],
    )

    if (!aulaCheck || aulaCheck.length === 0) {
      return NextResponse.json({ error: "Aula no encontrada" }, { status: 404 })
    }

    const { id_colegio, id_nivel, id_curso, id_paralelo, id_materia } = aulaCheck[0]

    // Start transaction
    const connection = await executeQuery("START TRANSACTION")

    try {
      // Get all notas for this aula
      for (let trimestre = 1; trimestre <= 3; trimestre++) {
        const notas = await executeQuery<any[]>(
          `SELECT e.id_estudiante, nap.promedio_final_trimestre
           FROM estudiantes e
           JOIN inscripciones_aula ia ON e.id_estudiante = ia.id_estudiante
           JOIN notas_aula_profesor nap ON ia.id_inscripcion = nap.id_inscripcion
           WHERE ia.id_aula_profesor = ? AND nap.trimestre = ?`,
          [id, trimestre],
        )

        // Centralizar each nota
        for (const nota of notas) {
          const { id_estudiante, promedio_final_trimestre } = nota

          // Check if centralized nota already exists
          const centralCheck = await executeQuery<any[]>(
            `SELECT id_centralizacion_nota 
             FROM centralizacion_notas 
             WHERE id_profesor_centralizador = ? 
             AND id_colegio = ? 
             AND id_nivel = ? 
             AND id_curso = ? 
             AND id_paralelo = ? 
             AND id_estudiante = ? 
             AND trimestre = ? 
             AND id_materia = ?`,
            [profesorId, id_colegio, id_nivel, id_curso, id_paralelo, id_estudiante, trimestre, id_materia],
          )

          if (centralCheck && centralCheck.length > 0) {
            // Update centralized nota
            await executeQuery(
              `UPDATE centralizacion_notas 
               SET nota_final_materia = ?, fecha_ultima_modificacion = NOW() 
               WHERE id_centralizacion_nota = ?`,
              [promedio_final_trimestre, centralCheck[0].id_centralizacion_nota],
            )
          } else {
            // Insert centralized nota
            await executeQuery(
              `INSERT INTO centralizacion_notas 
               (id_profesor_centralizador, id_colegio, id_nivel, id_curso, id_paralelo, 
                id_estudiante, trimestre, id_materia, nota_final_materia) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                profesorId,
                id_colegio,
                id_nivel,
                id_curso,
                id_paralelo,
                id_estudiante,
                trimestre,
                id_materia,
                promedio_final_trimestre,
              ],
            )
          }
        }
      }

      await executeQuery("COMMIT")

      return NextResponse.json({ success: true })
    } catch (error) {
      await executeQuery("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Error centralizing notas:", error)
    return NextResponse.json({ error: "Error al centralizar notas" }, { status: 500 })
  }
}
