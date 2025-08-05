import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()

    if (!session || !session.user.roles.includes("PROFESOR")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const id = params.id

    // Get profesor ID
    const profesores = await executeQuery<any[]>("SELECT id_profesor FROM profesores WHERE id_usuario = ?", [
      session.user.id,
    ])

    if (!profesores || profesores.length === 0) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
    }

    const profesorId = profesores[0].id_profesor

    // Check if horario belongs to profesor
    const horarioCheck = await executeQuery<any[]>(
      `SELECT h.id_horario 
       FROM horario_profesor h
       JOIN aulas_profesor ap ON h.id_aula_profesor = ap.id_aula_profesor
       WHERE h.id_horario = ? AND ap.id_profesor = ?`,
      [id, profesorId],
    )

    if (!horarioCheck || horarioCheck.length === 0) {
      return NextResponse.json({ error: "Horario no encontrado o no tiene permisos" }, { status: 404 })
    }

    // Delete horario
    await executeQuery("DELETE FROM horario_profesor WHERE id_horario = ?", [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting horario:", error)
    return NextResponse.json({ error: "Error al eliminar horario" }, { status: 500 })
  }
}
