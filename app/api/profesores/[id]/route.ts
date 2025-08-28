import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"
import bcrypt from "bcrypt"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()

    if (!session || !session.user.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const profesorId = id

    // Obtener información del profesor
    const profesor = await executeQuery<any[]>(
      `SELECT
        p.id_profesor as id,
        u.id_usuario,
        u.usuario,
        u.nombre_completo,
        u.email,
        u.telefono,
        u.activo,
        DATE_FORMAT(u.fecha_creacion, '%Y-%m-%d') as fecha_registro,
        DATE_FORMAT(p.fecha_ingreso, '%Y-%m-%d') as fecha_ingreso
      FROM profesores p
      JOIN usuarios u ON p.id_usuario = u.id_usuario
      WHERE p.id_profesor = ?`,
      [profesorId]
    )

    if (!profesor.length) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
    }

    // Obtener conteo de aulas activas
    const aulasCount = await executeQuery<any[]>(
      `SELECT COUNT(*) as count
       FROM aulas_profesor
       WHERE id_profesor = ? AND activa = TRUE`,
      [profesorId]
    )

    const profesorData = {
      ...profesor[0],
      aulas_activas: aulasCount[0]?.count || 0,
      estado: profesor[0].activo ? "activo" : "inactivo"
    }

    return NextResponse.json(profesorData)
  } catch (error) {
    console.error("Error fetching profesor:", error)
    return NextResponse.json({ error: "Error al obtener profesor" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()

    if (!session || !session.user.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const profesorId = id

    const {
      nombre_completo,
      email,
      telefono,
      password
    } = await request.json()

    if (!nombre_completo || !email) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 })
    }

    // Verificar que el profesor existe
    const existingProfesor = await executeQuery<any[]>(
      "SELECT p.id_profesor, u.id_usuario FROM profesores p JOIN usuarios u ON p.id_usuario = u.id_usuario WHERE p.id_profesor = ?",
      [profesorId]
    )

    if (!existingProfesor.length) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
    }

    const userId = existingProfesor[0].id_usuario

    // Iniciar transacción
    await executeQuery("START TRANSACTION")

    try {
      // Actualizar usuario
      let updateQuery = `UPDATE usuarios SET nombre_completo = ?, email = ?, telefono = ?`
      let updateParams = [nombre_completo, email, telefono || null]

      // Si se proporciona nueva contraseña, incluirla
      if (password && password.trim() !== "") {
        const hashedPassword = await bcrypt.hash(password, 10)
        updateQuery += `, password = ?`
        updateParams.push(hashedPassword)
      }

      updateQuery += ` WHERE id_usuario = ?`
      updateParams.push(userId)

      await executeQuery(updateQuery, updateParams)

      await executeQuery("COMMIT")

      return NextResponse.json({ message: "Profesor actualizado correctamente" })
    } catch (error) {
      await executeQuery("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Error updating profesor:", error)
    return NextResponse.json({ error: "Error al actualizar profesor" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()

    if (!session || !session.user.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const profesorId = id

    // Verificar que el profesor existe
    const existingProfesor = await executeQuery<any[]>(
      "SELECT p.id_profesor, u.id_usuario FROM profesores p JOIN usuarios u ON p.id_usuario = u.id_usuario WHERE p.id_profesor = ?",
      [profesorId]
    )

    if (!existingProfesor.length) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
    }

    const userId = existingProfesor[0].id_usuario

    // Verificar si el profesor tiene aulas asignadas
    const aulasAsignadas = await executeQuery<any[]>(
      `SELECT COUNT(*) as count FROM aulas_profesor
       WHERE id_profesor = ? AND activa = TRUE`,
      [profesorId]
    )

    if (aulasAsignadas[0].count > 0) {
      return NextResponse.json({
        error: "No se puede eliminar el profesor porque tiene aulas activas asignadas"
      }, { status: 400 })
    }

    // Eliminar profesor (CASCADE eliminará las relaciones)
    await executeQuery("DELETE FROM usuarios WHERE id_usuario = ?", [userId])

    return NextResponse.json({ message: "Profesor eliminado correctamente" })
  } catch (error) {
    console.error("Error deleting profesor:", error)
    return NextResponse.json({ error: "Error al eliminar profesor" }, { status: 500 })
  }
}