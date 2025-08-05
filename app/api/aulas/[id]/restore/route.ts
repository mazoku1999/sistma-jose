import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-server-session"
import { executeQuery } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session || !session.user.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Solo administradores pueden restaurar aulas" }, { status: 403 })
    }

    const { id } = await params
    const aulaId = parseInt(id)
    if (isNaN(aulaId)) {
      return NextResponse.json({ error: "ID de aula inválido" }, { status: 400 })
    }

    // Verificar que el aula existe y está eliminada
    const aulaRows = await executeQuery<any[]>(
      `SELECT * FROM aulas_profesor WHERE id_aula_profesor = ? AND activa = FALSE`,
      [aulaId]
    )

    if (!aulaRows || aulaRows.length === 0) {
      return NextResponse.json({ error: "Aula eliminada no encontrada" }, { status: 404 })
    }

    // Verificar conflictos antes de restaurar
    const aula = aulaRows[0] as any
    const conflictRows = await executeQuery<any[]>(
      `SELECT COUNT(*) as total FROM aulas_profesor 
       WHERE id_profesor = ? AND id_colegio = ? AND id_nivel = ? 
       AND id_curso = ? AND id_paralelo = ? AND id_materia = ? 
       AND id_gestion = ? AND activa = TRUE`,
      [aula.id_profesor, aula.id_colegio, aula.id_nivel, 
       aula.id_curso, aula.id_paralelo, aula.id_materia, aula.id_gestion]
    )

    if (conflictRows[0].total > 0) {
      return NextResponse.json({ 
        error: "No se puede restaurar: ya existe un aula activa con la misma configuración" 
      }, { status: 400 })
    }

    // Restaurar aula
    await executeQuery(
      `UPDATE aulas_profesor 
       SET activa = TRUE, fecha_eliminacion = NULL, eliminada_por = NULL
       WHERE id_aula_profesor = ?`,
      [aulaId]
    )

    return NextResponse.json({ 
      message: "Aula restaurada exitosamente",
      aula: aula.nombre_aula
    })

  } catch (error) {
    console.error("Error restaurando aula:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}