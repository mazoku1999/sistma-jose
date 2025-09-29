import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET(request: Request) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const colegioId = searchParams.get("colegioId")
    const nivelId = searchParams.get("nivelId")
    const cursoId = searchParams.get("cursoId")
    const paraleloId = searchParams.get("paraleloId")

    if (!colegioId || !nivelId || !cursoId || !paraleloId) {
      return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 })
    }

    // Solo los administradores pueden acceder a la centralización
    if (!session.user.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Sin permisos de centralización" }, { status: 403 })
    }

    // Get unique estudiantes for this curso
    const estudiantes = await executeQuery<any[]>(
      `SELECT DISTINCT 
         e.id_estudiante as id, 
         e.nombres,
         e.apellido_paterno,
         e.apellido_materno,
         CONCAT_WS(' ', e.nombres, e.apellido_paterno, e.apellido_materno) AS nombre_completo
       FROM estudiantes e
       JOIN inscripciones_aula ia ON e.id_estudiante = ia.id_estudiante
       JOIN aulas_profesor ap ON ia.id_aula_profesor = ap.id_aula_profesor
       WHERE ap.id_colegio = ? AND ap.id_nivel = ? AND ap.id_curso = ? AND ap.id_paralelo = ?
       ORDER BY 
         CASE WHEN TRIM(IFNULL(e.apellido_paterno, '')) = '' THEN 0 ELSE 1 END,
         CASE WHEN TRIM(IFNULL(e.apellido_paterno, '')) = '' THEN TRIM(e.apellido_materno) ELSE TRIM(e.apellido_paterno) END,
         CASE WHEN TRIM(IFNULL(e.apellido_paterno, '')) = '' THEN TRIM(e.nombres) ELSE TRIM(e.apellido_materno) END,
         TRIM(e.nombres)`,
      [colegioId, nivelId, cursoId, paraleloId],
    )

    return NextResponse.json(estudiantes)
  } catch (error) {
    console.error("Error fetching estudiantes:", error)
    return NextResponse.json({ error: "Error al obtener estudiantes" }, { status: 500 })
  }
}
