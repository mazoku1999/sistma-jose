import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-server-session"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    if (!query) {
      return NextResponse.json({ error: "Consulta de búsqueda requerida" }, { status: 400 })
    }

    const userId = session.user.id
    const searchTerm = `%${query}%`

    // Buscar en aulas_profesor
    const [aulas] = await db.query(
      `SELECT
        ap.id_aula_profesor as id,
        ap.nombre_aula as title,
        CONCAT(m.nombre_completo, ' - ', c.nombre, ' ', p.letra, ' (', col.nombre, ')') as description,
        'aula' as type,
        CONCAT('/aulas/', ap.id_aula_profesor) as url
      FROM aulas_profesor ap
      JOIN materias m ON ap.id_materia = m.id_materia
      JOIN cursos c ON ap.id_curso = c.id_curso
      JOIN paralelos p ON ap.id_paralelo = p.id_paralelo
      JOIN colegios col ON ap.id_colegio = col.id_colegio
      JOIN niveles n ON ap.id_nivel = n.id_nivel
      WHERE ap.id_profesor = ? AND ap.activa = TRUE AND (
        ap.nombre_aula LIKE ? OR
        m.nombre_completo LIKE ? OR
        c.nombre LIKE ? OR
        p.letra LIKE ?
      )
      LIMIT 5`,
      [userId, searchTerm, searchTerm, searchTerm, searchTerm],
    )

    // Buscar en estudiantes
    const [estudiantes] = await db.query(
      `SELECT
        e.id_estudiante as id,
        CONCAT(e.nombres, ' ', e.apellidos) as title,
        CONCAT('Estudiante - ', ap.nombre_aula, ' (', m.nombre_completo, ')') as description,
        'estudiante' as type,
        CONCAT('/aulas/', ap.id_aula_profesor, '/estudiantes') as url
      FROM estudiantes e
      JOIN inscripciones_aula ia ON e.id_estudiante = ia.id_estudiante
      JOIN aulas_profesor ap ON ia.id_aula_profesor = ap.id_aula_profesor
      JOIN materias m ON ap.id_materia = m.id_materia
      WHERE ap.id_profesor = ? AND ap.activa = TRUE AND (
        e.nombres LIKE ? OR
        e.apellidos LIKE ?
      )
      LIMIT 5`,
      [userId, searchTerm, searchTerm],
    )

    // Buscar en materias (que el profesor está enseñando)
    const [materias] = await db.query(
      `SELECT
        m.id_materia as id,
        m.nombre_completo as title,
        'Materia' as description,
        'materia' as type,
        '/materias' as url
      FROM materias m
      JOIN aulas_profesor ap ON m.id_materia = ap.id_materia
      WHERE ap.id_profesor = ? AND ap.activa = TRUE AND m.nombre_completo LIKE ?
      GROUP BY m.id_materia, m.nombre_completo
      LIMIT 5`,
      [userId, searchTerm],
    )

    // Combinar resultados
    const results = [...aulas, ...estudiantes, ...materias]

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error en la búsqueda:", error)
    return NextResponse.json({ error: "Error al realizar la búsqueda" }, { status: 500 })
  }
}
