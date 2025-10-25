import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo los administradores y administrativos pueden centralizar notas
    const canCentralize = session.user.roles.includes("ADMIN") || session.user.roles.includes("ADMINISTRATIVO")

    return NextResponse.json({ canCentralize })
  } catch (error) {
    console.error("Error al verificar permisos:", error)
    return NextResponse.json({ error: "Error al verificar permisos" }, { status: 500 })
  }
}