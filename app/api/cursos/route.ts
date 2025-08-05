import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const cursos = await executeQuery<any[]>(
      "SELECT id_curso as id, nombre, descripcion FROM cursos ORDER BY nombre"
    )

    return NextResponse.json(cursos)
  } catch (error) {
    console.error("Error fetching cursos:", error)
    return NextResponse.json({ error: "Error al obtener cursos" }, { status: 500 })
  }
}