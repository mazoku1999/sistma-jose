import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo los administradores pueden asignar aulas
    if (!session.user.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Solo los administradores pueden asignar aulas" }, { status: 403 })
    }

    const {
      id_profesor,
      id_materia,
      id_colegio,
      id_nivel,
      id_curso,
      id_paralelo,
      nombre_aula,
      max_estudiantes,
      id_gestion
    } = await request.json()

    // Validar datos requeridos
    if (!id_profesor || !id_materia || !id_colegio || !id_nivel || !id_curso || !id_paralelo || !nombre_aula || !id_gestion) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    // Verificar que el profesor existe
    const profesorExists = await executeQuery<any[]>(
      "SELECT id_profesor FROM profesores WHERE id_profesor = ?",
      [id_profesor]
    )

    if (!profesorExists.length) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
    }

    // Verificar que la gestión existe y está activa
    const gestionExists = await executeQuery<any[]>(
      "SELECT id_gestion, activa FROM gestiones_academicas WHERE id_gestion = ?",
      [id_gestion]
    )

    if (!gestionExists.length) {
      return NextResponse.json({ error: "Gestión académica no encontrada" }, { status: 404 })
    }

    if (!gestionExists[0].activa) {
      return NextResponse.json({ error: "Solo se pueden asignar aulas en la gestión académica activa" }, { status: 400 })
    }

    // Verificar que no existe conflicto (misma combinación ya asignada)
    const conflictCheck = await executeQuery<any[]>(
      `SELECT ap.id_aula_profesor, u.nombre_completo as profesor_nombre
       FROM aulas_profesor ap
       JOIN profesores p ON ap.id_profesor = p.id_profesor
       JOIN usuarios u ON p.id_usuario = u.id_usuario
       WHERE ap.id_colegio = ? 
         AND ap.id_nivel = ? 
         AND ap.id_curso = ? 
         AND ap.id_paralelo = ? 
         AND ap.id_materia = ?
         AND ap.id_gestion = ?
         AND ap.activa = TRUE`,
      [id_colegio, id_nivel, id_curso, id_paralelo, id_materia, id_gestion]
    )

    if (conflictCheck.length > 0) {
      return NextResponse.json({ 
        error: `Esta combinación ya está asignada a ${conflictCheck[0].profesor_nombre}` 
      }, { status: 409 })
    }

    // Crear el aula y asignarla al profesor
    const result = await executeQuery(
      `INSERT INTO aulas_profesor (
        id_profesor, 
        id_colegio, 
        id_nivel, 
        id_curso, 
        id_paralelo, 
        id_materia, 
        nombre_aula, 
        max_estudiantes, 
        id_gestion,
        activa,
        fecha_creacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())`,
      [
        id_profesor,
        id_colegio,
        id_nivel,
        id_curso,
        id_paralelo,
        id_materia,
        nombre_aula,
        max_estudiantes || 30,
        id_gestion
      ]
    )

    return NextResponse.json({
      success: true,
      message: "Aula asignada exitosamente",
      aulaId: result.insertId
    })

  } catch (error) {
    console.error("Error al asignar aula:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}