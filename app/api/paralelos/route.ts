import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const paralelos = await executeQuery<any[]>(
      "SELECT id_paralelo as id, letra as nombre FROM paralelos ORDER BY letra"
    )

    return NextResponse.json(paralelos)
  } catch (error) {
    console.error("Error fetching paralelos:", error)
    return NextResponse.json({ error: "Error al obtener paralelos" }, { status: 500 })
  }
}