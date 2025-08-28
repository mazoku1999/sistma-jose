import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const niveles = await executeQuery<any[]>(
      "SELECT id_nivel as id, nombre, descripcion FROM niveles ORDER BY nombre"
    )

    return NextResponse.json(niveles)
  } catch (error) {
    console.error("Error fetching niveles:", error)
    return NextResponse.json({ error: "Error al obtener niveles" }, { status: 500 })
  }
}