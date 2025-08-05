import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-server-session"
import { executeQuery } from "@/lib/db"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const aulaId = parseInt(id)
    if (isNaN(aulaId)) {
      return NextResponse.json({ error: "ID de aula inválido" }, { status: 400 })
    }

    // Verificar que el aula pertenece al profesor
    const aulaRows = await executeQuery<any[]>(
      `SELECT ap.*, u.nombre_completo as profesor_nombre 
       FROM aulas_profesor ap
       JOIN profesores p ON ap.id_profesor = p.id_profesor
       JOIN usuarios u ON p.id_usuario = u.id_usuario
       WHERE ap.id_aula_profesor = ? AND ap.activa = TRUE`,
      [aulaId]
    )

    if (!aulaRows || aulaRows.length === 0) {
      return NextResponse.json({ error: "Aula no encontrada" }, { status: 404 })
    }

    const aula = aulaRows[0] as any

    // Debug logs para verificar los valores
    console.log("Session user:", session.user)
    console.log("Aula data:", aula)
    console.log("Comparing:", session.user.id, "vs", aula.id_profesor)

    // Solo el profesor propietario o admin puede eliminar
    // Necesitamos obtener el id_profesor del usuario actual
    const profesorRows = await executeQuery<any[]>(
      "SELECT id_profesor FROM profesores WHERE id_usuario = ?",
      [session.user.id]
    )

    if (!profesorRows || profesorRows.length === 0) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
    }

    const currentProfesorId = profesorRows[0].id_profesor
    const isOwner = currentProfesorId === aula.id_profesor
    const isAdmin = session.user.roles.includes("ADMIN")
    
    console.log("Current profesor ID:", currentProfesorId)
    console.log("Aula profesor ID:", aula.id_profesor)
    console.log("Is owner:", isOwner)
    console.log("Is admin:", isAdmin)
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ 
        error: "Sin permisos para eliminar esta aula",
        debug: {
          currentProfesorId,
          aulaProfesorId: aula.id_profesor,
          isOwner,
          isAdmin
        }
      }, { status: 403 })
    }

    // Verificar si tiene estudiantes inscritos
    const inscripcionesRows = await executeQuery<any[]>(
      "SELECT COUNT(*) as total FROM inscripciones_aula WHERE id_aula_profesor = ?",
      [aulaId]
    )
    
    const totalEstudiantes = inscripcionesRows[0].total

    if (totalEstudiantes > 0) {
      return NextResponse.json({ 
        error: "No se puede eliminar un aula con estudiantes inscritos",
        details: `Esta aula tiene ${totalEstudiantes} estudiante(s) inscrito(s)`
      }, { status: 400 })
    }

    // Eliminación suave
    await executeQuery(
      `UPDATE aulas_profesor 
       SET activa = FALSE, fecha_eliminacion = NOW(), eliminada_por = ?
       WHERE id_aula_profesor = ?`,
      [session.user.id, aulaId]
    )

    return NextResponse.json({ 
      message: "Aula eliminada exitosamente",
      aula: aula.nombre_aula
    })

  } catch (error) {
    console.error("Error eliminando aula:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}