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

    // Buscar en aulas
    const [aulas] = await db.query(
      `SELECT 
        a.id, 
        a.nombre as title, 
        CONCAT(m.nombre, ' - ', c.nombre, ' ', p.nombre) as description,
        'aula' as type,
        CONCAT('/aulas/', a.id) as url
      FROM aulas a
      JOIN materias m ON a.materia_id = m.id
      JOIN cursos c ON a.curso_id = c.id
      JOIN paralelos p ON a.paralelo_id = p.id
      WHERE a.profesor_id = ? AND (
        a.nombre LIKE ? OR
        m.nombre LIKE ? OR
        c.nombre LIKE ? OR
        p.nombre LIKE ?
      )
      LIMIT 5`,
      [userId, searchTerm, searchTerm, searchTerm, searchTerm],
    )

    // Buscar en estudiantes
    const [estudiantes] = await db.query(
      `SELECT 
        e.id, 
        e.nombre_completo as title, 
        CONCAT('Estudiante - ', a.nombre) as description,
        'estudiante' as type,
        CONCAT('/aulas/', a.id, '/estudiantes') as url
      FROM estudiantes e
      JOIN aulas_estudiantes ae ON e.id = ae.estudiante_id
      JOIN aulas a ON ae.aula_id = a.id
      WHERE a.profesor_id = ? AND (
        e.nombre_completo LIKE ? OR
        e.codigo_estudiante LIKE ?
      )
      LIMIT 5`,
      [userId, searchTerm, searchTerm],
    )

    // Buscar en materias
    const [materias] = await db.query(
      `SELECT 
        m.id, 
        m.nombre as title, 
        'Materia' as description,
        'materia' as type,
        '/materias' as url
      FROM materias m
      JOIN profesor_materia pm ON m.id = pm.materia_id
      WHERE pm.profesor_id = ? AND m.nombre LIKE ?
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
