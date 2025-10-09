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
    const { searchParams } = new URL(request.url)
    const trimestre = searchParams.get("trimestre") || "1"

    // Si es ADMIN, no exigir propiedad; solo validar que exista el aula y devolver info
    if (session.user.roles.includes("ADMIN")) {
      const aulaInfo = await executeQuery<any[]>(
        `
        SELECT 
          ap.id_aula_profesor as id,
          ap.nombre_aula,
          ap.id_colegio,
          ap.id_nivel,
          ap.id_curso,
          ap.id_paralelo,
          ap.id_materia,
          COALESCE(ap.id_gestion, 1) as id_gestion,
          c.nombre as colegio,
          n.nombre as nivel,
          cur.nombre as curso,
          p.letra as paralelo,
          m.nombre_completo as materia,
          COUNT(DISTINCT ia.id_estudiante) as estudiantes,
          ap.max_estudiantes,
          TRUE as gestion_activa,
          prof.es_tutor
        FROM aulas_profesor ap
        JOIN colegios c ON ap.id_colegio = c.id_colegio
        JOIN niveles n ON ap.id_nivel = n.id_nivel
        JOIN cursos cur ON ap.id_curso = cur.id_curso
        JOIN paralelos p ON ap.id_paralelo = p.id_paralelo
        JOIN materias m ON ap.id_materia = m.id_materia
        JOIN profesores prof ON ap.id_profesor = prof.id_profesor
        LEFT JOIN inscripciones_aula ia ON ap.id_aula_profesor = ia.id_aula_profesor
        WHERE ap.id_aula_profesor = ?
        GROUP BY ap.id_aula_profesor
      `,
        [aulaId]
      )
      if (!aulaInfo.length) {
        return NextResponse.json({ error: "Aula no encontrada" }, { status: 404 })
      }
      return NextResponse.json(aulaInfo[0])
    }

    // Obtener el ID del profesor (para PROFESOR)
    const profesorQuery = await executeQuery<any[]>("SELECT id_profesor FROM profesores WHERE id_usuario = ?", [
      session.user.id,
    ])

    if (!profesorQuery.length) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
    }

    const profesorId = profesorQuery[0].id_profesor

    // Verificar si existen gestiones
    const gestionesExist = await executeQuery<any[]>("SHOW TABLES LIKE 'gestiones_academicas'")

    let aulaQuery: any[] = []

    if (gestionesExist.length > 0) {
      // Obtener información del aula con gestión
      aulaQuery = await executeQuery<any[]>(
        `
        SELECT 
          ap.id_aula_profesor as id,
          ap.nombre_aula,
          ap.id_colegio,
          ap.id_nivel,
          ap.id_curso,
          ap.id_paralelo,
          ap.id_materia,
          COALESCE(ap.id_gestion, 1) as id_gestion,
          COALESCE(ga.nombre, 'Sin gestion') as gestion_nombre,
          COALESCE(ga.activa, false) as gestion_activa,
          c.nombre as colegio,
          n.nombre as nivel,
          cur.nombre as curso,
          p.letra as paralelo,
          m.nombre_completo as materia,
          COUNT(DISTINCT ia.id_estudiante) as estudiantes,
          ap.max_estudiantes,
          prof.es_tutor
        FROM aulas_profesor ap
        LEFT JOIN gestiones_academicas ga ON ap.id_gestion = ga.id_gestion
        JOIN colegios c ON ap.id_colegio = c.id_colegio
        JOIN niveles n ON ap.id_nivel = n.id_nivel
        JOIN cursos cur ON ap.id_curso = cur.id_curso
        JOIN paralelos p ON ap.id_paralelo = p.id_paralelo
        JOIN materias m ON ap.id_materia = m.id_materia
        JOIN profesores prof ON ap.id_profesor = prof.id_profesor
        LEFT JOIN inscripciones_aula ia ON ap.id_aula_profesor = ia.id_aula_profesor
        WHERE ap.id_aula_profesor = ? AND ap.id_profesor = ?
        GROUP BY ap.id_aula_profesor
      `,
        [aulaId, profesorId]
      )
    } else {
      // Obtener información del aula sin gestión
      aulaQuery = await executeQuery<any[]>(
        `
        SELECT 
          ap.id_aula_profesor as id,
          ap.nombre_aula,
          ap.id_colegio,
          ap.id_nivel,
          ap.id_curso,
          ap.id_paralelo,
          ap.id_materia,
          c.nombre as colegio,
          n.nombre as nivel,
          cur.nombre as curso,
          p.letra as paralelo,
          m.nombre_completo as materia,
          COUNT(DISTINCT ia.id_estudiante) as estudiantes,
          ap.max_estudiantes,
          true as gestion_activa,
          prof.es_tutor
        FROM aulas_profesor ap
        JOIN colegios c ON ap.id_colegio = c.id_colegio
        JOIN niveles n ON ap.id_nivel = n.id_nivel
        JOIN cursos cur ON ap.id_curso = cur.id_curso
        JOIN paralelos p ON ap.id_paralelo = p.id_paralelo
        JOIN materias m ON ap.id_materia = m.id_materia
        JOIN profesores prof ON ap.id_profesor = prof.id_profesor
        LEFT JOIN inscripciones_aula ia ON ap.id_aula_profesor = ia.id_aula_profesor
        WHERE ap.id_aula_profesor = ? AND ap.id_profesor = ?
        GROUP BY ap.id_aula_profesor
      `,
        [aulaId, profesorId]
      )
    }

    if (!aulaQuery.length) {
      return NextResponse.json({ error: "Aula no encontrada" }, { status: 404 })
    }

    return NextResponse.json(aulaQuery[0])
  } catch (error) {
    console.error("Error al obtener aula:", error)
    return NextResponse.json({ error: "Error al obtener aula" }, { status: 500 })
  }
}

export async function PUT(
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
    const body = await request.json()

    const {
      nombre_aula,
      max_estudiantes,
      id_profesor,
      id_materia,
      id_colegio,
      id_nivel,
      id_curso,
      id_paralelo
    } = body

    // Verificar que el aula existe y está activa
    const aulaQuery = await executeQuery<any[]>(
      "SELECT * FROM aulas_profesor WHERE id_aula_profesor = ? AND activa = TRUE",
      [aulaId]
    )

    if (!aulaQuery.length) {
      return NextResponse.json({ error: "Aula no encontrada o ya eliminada" }, { status: 404 })
    }

    const aulaActual = aulaQuery[0]

    // Si es ADMIN, puede editar todos los campos
    if (session.user.roles.includes("ADMIN")) {
      // Construir la consulta de actualización dinámicamente
      const updates: string[] = []
      const values: any[] = []

      if (nombre_aula !== undefined) {
        updates.push("nombre_aula = ?")
        values.push(nombre_aula)
      }

      if (max_estudiantes !== undefined) {
        updates.push("max_estudiantes = ?")
        values.push(max_estudiantes)
      }

      if (id_profesor !== undefined) {
        // Verificar que el nuevo profesor existe
        const profesorExists = await executeQuery<any[]>(
          "SELECT id_profesor FROM profesores WHERE id_profesor = ?",
          [id_profesor]
        )
        if (!profesorExists.length) {
          return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
        }
        updates.push("id_profesor = ?")
        values.push(id_profesor)
      }

      if (id_materia !== undefined) {
        updates.push("id_materia = ?")
        values.push(id_materia)
      }

      if (id_colegio !== undefined) {
        updates.push("id_colegio = ?")
        values.push(id_colegio)
      }

      if (id_nivel !== undefined) {
        updates.push("id_nivel = ?")
        values.push(id_nivel)
      }

      if (id_curso !== undefined) {
        updates.push("id_curso = ?")
        values.push(id_curso)
      }

      if (id_paralelo !== undefined) {
        updates.push("id_paralelo = ?")
        values.push(id_paralelo)
      }

      if (updates.length === 0) {
        return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 })
      }

      // Verificar que no existe conflicto con la nueva combinación
      const finalProfesor = id_profesor || aulaActual.id_profesor
      const finalMateria = id_materia || aulaActual.id_materia
      const finalColegio = id_colegio || aulaActual.id_colegio
      const finalNivel = id_nivel || aulaActual.id_nivel
      const finalCurso = id_curso || aulaActual.id_curso
      const finalParalelo = id_paralelo || aulaActual.id_paralelo

      const conflictCheck = await executeQuery<any[]>(
        `SELECT ap.id_aula_profesor, u.nombre_completo as profesor_nombre
         FROM aulas_profesor ap
         JOIN profesores p ON ap.id_profesor = p.id_profesor
         JOIN usuarios u ON p.id_usuario = u.id_usuario
         WHERE ap.id_colegio = ? 
           AND ap.id_nivel = ? 
           AND ap.id_curso = ? 
           AND ap.id_paralelo = ? 
           AND ap.id_materia = ?
           AND ap.id_gestion = ?
           AND ap.activa = TRUE
           AND ap.id_aula_profesor != ?`,
        [finalColegio, finalNivel, finalCurso, finalParalelo, finalMateria, aulaActual.id_gestion, aulaId]
      )

      if (conflictCheck.length > 0) {
        return NextResponse.json({
          error: `Esta combinación ya está asignada a ${conflictCheck[0].profesor_nombre}`
        }, { status: 409 })
      }

      // Actualizar el aula
      values.push(aulaId)
      await executeQuery(
        `UPDATE aulas_profesor SET ${updates.join(", ")} WHERE id_aula_profesor = ?`,
        values
      )

      return NextResponse.json({
        success: true,
        message: "Asignación actualizada correctamente"
      })
    } else {
      // Si es PROFESOR, solo puede editar nombre_aula y max_estudiantes
      if (!nombre_aula) {
        return NextResponse.json({ error: "El nombre del aula es requerido" }, { status: 400 })
      }

      // Obtener el ID del profesor
      const profesorQuery = await executeQuery<any[]>(
        "SELECT id_profesor FROM profesores WHERE id_usuario = ?",
        [session.user.id]
      )

      if (!profesorQuery.length) {
        return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
      }

      const profesorId = profesorQuery[0].id_profesor

      // Verificar que el aula pertenece al profesor
      if (aulaActual.id_profesor !== profesorId) {
        return NextResponse.json({ error: "No tienes permiso para editar esta aula" }, { status: 403 })
      }

      // Actualizar solo nombre y capacidad
      await executeQuery(
        "UPDATE aulas_profesor SET nombre_aula = ?, max_estudiantes = ? WHERE id_aula_profesor = ?",
        [nombre_aula, max_estudiantes || 50, aulaId]
      )

      return NextResponse.json({
        success: true,
        message: "Aula actualizada correctamente"
      })
    }
  } catch (error) {
    console.error("Error al actualizar aula:", error)
    return NextResponse.json({ error: "Error al actualizar aula" }, { status: 500 })
  }
}

export async function DELETE(
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

    // Verificar que el aula existe y está activa
    const aulaQuery = await executeQuery<any[]>(
      "SELECT * FROM aulas_profesor WHERE id_aula_profesor = ? AND activa = TRUE",
      [aulaId]
    )

    if (!aulaQuery.length) {
      return NextResponse.json({ error: "Aula no encontrada o ya eliminada" }, { status: 404 })
    }

    const aula = aulaQuery[0]

    // Si es ADMIN, puede eliminar cualquier aula
    // Si es PROFESOR, solo puede eliminar sus propias aulas
    if (!session.user.roles.includes("ADMIN")) {
      const profesorQuery = await executeQuery<any[]>(
        "SELECT id_profesor FROM profesores WHERE id_usuario = ?",
        [session.user.id]
      )

      if (!profesorQuery.length) {
        return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
      }

      const profesorId = profesorQuery[0].id_profesor

      if (aula.id_profesor !== profesorId) {
        return NextResponse.json({
          error: "No tienes permiso para eliminar esta aula"
        }, { status: 403 })
      }
    }

    // Soft delete: marcar como inactiva
    await executeQuery(
      `UPDATE aulas_profesor 
       SET activa = FALSE, 
           fecha_eliminacion = NOW(), 
           eliminada_por = ? 
       WHERE id_aula_profesor = ?`,
      [session.user.id, aulaId]
    )

    return NextResponse.json({
      success: true,
      message: "Asignación eliminada correctamente"
    })
  } catch (error) {
    console.error("Error al eliminar aula:", error)
    return NextResponse.json({ error: "Error al eliminar aula" }, { status: 500 })
  }
}
