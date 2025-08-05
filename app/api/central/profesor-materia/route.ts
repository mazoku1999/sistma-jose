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

    // Para administradores, devolver null ya que pueden editar todas las materias
    return NextResponse.json({ id_materia: null })
  } catch (error) {
    console.error("Error checking profesor materia:", error)
    return NextResponse.json({ error: "Error al verificar materia del profesor" }, { status: 500 })
  }
}
