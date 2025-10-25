import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET(request: Request) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo los administradores y administrativos pueden acceder a la centralización
    if (!session.user.roles.includes("ADMIN") && !session.user.roles.includes("ADMINISTRATIVO")) {
      return NextResponse.json({ error: "Sin permisos de centralización" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const colegio = searchParams.get("colegio")
    const nivel = searchParams.get("nivel")
    const curso = searchParams.get("curso")
    const paralelo = searchParams.get("paralelo")

    if (!colegio || !nivel || !curso || !paralelo) {
      return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 })
    }

    // Obtener solo las materias que tienen aulas creadas para este curso y paralelo específico
    const materiasQuery = await executeQuery<any[]>(
      `
      SELECT DISTINCT 
        m.id_materia as id,
        m.nombre_completo as nombre,
        m.nombre_corto
      FROM materias m
      JOIN aulas_profesor ap ON m.id_materia = ap.id_materia
      WHERE ap.id_colegio = ? 
        AND ap.id_nivel = ? 
        AND ap.id_curso = ? 
        AND ap.id_paralelo = ?
        AND ap.activa = TRUE
        AND ap.fecha_eliminacion IS NULL
      ORDER BY m.id_materia
      `,
      [colegio, nivel, curso, paralelo]
    )

    return NextResponse.json(materiasQuery)
  } catch (error) {
    console.error("Error al obtener materias del curso:", error)
    return NextResponse.json({ error: "Error al obtener materias" }, { status: 500 })
  }
}