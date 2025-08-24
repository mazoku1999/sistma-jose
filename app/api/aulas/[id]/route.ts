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
          TRUE as gestion_activa
        FROM aulas_profesor ap
        JOIN colegios c ON ap.id_colegio = c.id_colegio
        JOIN niveles n ON ap.id_nivel = n.id_nivel
        JOIN cursos cur ON ap.id_curso = cur.id_curso
        JOIN paralelos p ON ap.id_paralelo = p.id_paralelo
        JOIN materias m ON ap.id_materia = m.id_materia
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
          ap.max_estudiantes
        FROM aulas_profesor ap
        LEFT JOIN gestiones_academicas ga ON ap.id_gestion = ga.id_gestion
        JOIN colegios c ON ap.id_colegio = c.id_colegio
        JOIN niveles n ON ap.id_nivel = n.id_nivel
        JOIN cursos cur ON ap.id_curso = cur.id_curso
        JOIN paralelos p ON ap.id_paralelo = p.id_paralelo
        JOIN materias m ON ap.id_materia = m.id_materia
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
          true as gestion_activa
        FROM aulas_profesor ap
        JOIN colegios c ON ap.id_colegio = c.id_colegio
        JOIN niveles n ON ap.id_nivel = n.id_nivel
        JOIN cursos cur ON ap.id_curso = cur.id_curso
        JOIN paralelos p ON ap.id_paralelo = p.id_paralelo
        JOIN materias m ON ap.id_materia = m.id_materia
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
    const { nombre_aula, max_estudiantes } = await request.json()

    if (!nombre_aula) {
      return NextResponse.json({ error: "El nombre del aula es requerido" }, { status: 400 })
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

    // Actualizar el aula
    await executeQuery(
      "UPDATE aulas_profesor SET nombre_aula = ?, max_estudiantes = ? WHERE id_aula_profesor = ?",
      [nombre_aula, max_estudiantes || 50, aulaId]
    )

    return NextResponse.json({ message: "Aula actualizada correctamente" })
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

    // Eliminar el aula
    await executeQuery("DELETE FROM aulas_profesor WHERE id_aula_profesor = ?", [aulaId])

    return NextResponse.json({ message: "Aula eliminada correctamente" })
  } catch (error) {
    console.error("Error al eliminar aula:", error)
    return NextResponse.json({ error: "Error al eliminar aula" }, { status: 500 })
  }
}
