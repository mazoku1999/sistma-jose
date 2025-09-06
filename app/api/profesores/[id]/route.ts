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
        u.id_usuario as id,
        u.usuario,
        u.nombre_completo,
        u.email,
        u.telefono,
        u.activo,
        DATE_FORMAT(u.fecha_creacion, '%Y-%m-%d') as fecha_registro,
        p.especialidad,
        p.puede_centralizar_notas,
        p.profesor_area
      FROM usuarios u
      JOIN profesores p ON u.id_usuario = p.id_usuario
      WHERE u.id_usuario = ?`,
      [profesorId]
    )

    if (!profesor.length) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
    }

    // Obtener roles
    const roles = await executeQuery<any[]>(
      `SELECT r.nombre 
       FROM usuario_roles ur 
       JOIN roles r ON ur.id_rol = r.id_rol 
       WHERE ur.id_usuario = ?`,
      [profesorId]
    )

    const profesorData = {
      ...profesor[0],
      roles: roles.map(r => r.nombre),
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

    const body = await request.json()
    const nombre_completo: string | undefined = body.nombre_completo
    const email: string | undefined = body.email
    const telefono: string | undefined = body.telefono
    const password: string | undefined = body.password
    const estado: string | undefined = body.estado
    const roles: string[] | undefined = body.roles

    if (!nombre_completo) {
      return NextResponse.json({ error: "Nombre es requerido" }, { status: 400 })
    }

    // Verificar que el profesor existe
    const existingProfesor = await executeQuery<any[]>(
      "SELECT id_usuario FROM usuarios WHERE id_usuario = ?",
      [profesorId]
    )

    if (!existingProfesor.length) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
    }

    // Iniciar transacción
    await executeQuery("START TRANSACTION")

    try {
      // Actualizar usuario
      let updateQuery = `UPDATE usuarios SET nombre_completo = ?`
      const updateParams: any[] = [nombre_completo]

      if (typeof email !== "undefined") {
        updateQuery += `, email = ?`
        updateParams.push(email && email.trim() !== "" ? email : null)
      }
      if (typeof telefono !== "undefined") {
        updateQuery += `, telefono = ?`
        updateParams.push(telefono || null)
      }
      if (typeof estado !== "undefined") {
        updateQuery += `, activo = ?`
        updateParams.push(estado === "activo")
      }

      // Si se proporciona nueva contraseña, incluirla
      if (password && password.trim() !== "") {
        const hashedPassword = await bcrypt.hash(password, 10)
        updateQuery += `, password = ?`
        updateParams.push(hashedPassword)
      }

      updateQuery += ` WHERE id_usuario = ?`
      updateParams.push(profesorId)
      await executeQuery(updateQuery, updateParams)

      // Actualizar roles
      if (roles && Array.isArray(roles)) {
        // Eliminar roles existentes
        await executeQuery("DELETE FROM usuario_roles WHERE id_usuario = ?", [profesorId])

        // Asignar nuevos roles
        for (const roleName of roles) {
          const roleResult = await executeQuery<any[]>(
            "SELECT id_rol FROM roles WHERE nombre = ?",
            [roleName]
          )

          if (roleResult.length > 0) {
            await executeQuery(
              "INSERT INTO usuario_roles (id_usuario, id_rol) VALUES (?, ?)",
              [profesorId, roleResult[0].id_rol]
            )
          }
        }
      }

      await executeQuery("COMMIT")

      return NextResponse.json({ message: "Usuario actualizado correctamente" })
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
      "SELECT id_usuario FROM usuarios WHERE id_usuario = ?",
      [profesorId]
    )

    if (!existingProfesor.length) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
    }

    // Verificar si el profesor tiene aulas asignadas
    const aulasAsignadas = await executeQuery<any[]>(
      `SELECT COUNT(*) as count FROM aulas_profesor ap 
       JOIN profesores p ON ap.id_profesor = p.id_profesor 
       WHERE p.id_usuario = ?`,
      [profesorId]
    )

    if (aulasAsignadas[0].count > 0) {
      return NextResponse.json({
        error: "No se puede eliminar el profesor porque tiene aulas asignadas"
      }, { status: 400 })
    }

    // Eliminar profesor (CASCADE eliminará las relaciones)
    await executeQuery("DELETE FROM usuarios WHERE id_usuario = ?", [profesorId])

    return NextResponse.json({ message: "Profesor eliminado correctamente" })
  } catch (error) {
    console.error("Error deleting profesor:", error)
    return NextResponse.json({ error: "Error al eliminar profesor" }, { status: 500 })
  }
}
