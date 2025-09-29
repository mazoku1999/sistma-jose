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
        u.nombres,
        u.apellido_paterno,
        u.apellido_materno,
        u.nombre_completo,
        u.email,
        u.activo,
        DATE_FORMAT(u.fecha_creacion, '%Y-%m-%d') as fecha_registro,
        p.puede_centralizar_notas,
        p.profesor_area,
        p.es_tutor
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
      estado: profesor[0].activo ? "activo" : "inactivo",
      puede_centralizar_notas: !!profesor[0].puede_centralizar_notas,
      es_tutor: !!profesor[0].es_tutor
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
    const body = await request.json()

    const updates: string[] = []
    const paramsArr: any[] = []

    if (typeof body.nombres !== "undefined") { updates.push("nombres = ?"); paramsArr.push(body.nombres) }
    if (typeof body.apellido_paterno !== "undefined") { updates.push("apellido_paterno = ?"); paramsArr.push(body.apellido_paterno) }
    if (typeof body.apellido_materno !== "undefined") { updates.push("apellido_materno = ?"); paramsArr.push(body.apellido_materno) }
    if (typeof body.email !== "undefined") { updates.push("email = ?"); paramsArr.push(body.email || null) }
    if (typeof body.activo !== "undefined") { updates.push("activo = ?"); paramsArr.push(!!body.activo) }

    // Recalcular nombre_completo si cambian nombres o apellidos
    const willRecalc = ["nombres", "apellido_paterno", "apellido_materno"].some(k => typeof body[k] !== "undefined")

    if (updates.length > 0) {
      await executeQuery(`UPDATE usuarios SET ${updates.join(', ')} WHERE id_usuario = ?`, [...paramsArr, id])
      if (willRecalc) {
        await executeQuery(`UPDATE usuarios SET nombre_completo = CONCAT(nombres,' ',apellido_paterno,' ',apellido_materno) WHERE id_usuario = ?`, [id])
      }
    }

    // Actualizar banderas de profesor
    const profUpdates: string[] = []
    const profParams: any[] = []
    if (typeof body.puede_centralizar_notas !== "undefined") { profUpdates.push("puede_centralizar_notas = ?"); profParams.push(!!body.puede_centralizar_notas) }
    if (typeof body.profesor_area !== "undefined") { profUpdates.push("profesor_area = ?"); profParams.push(!!body.profesor_area) }
    if (typeof body.es_tutor !== "undefined") { profUpdates.push("es_tutor = ?"); profParams.push(!!body.es_tutor) }
    if (profUpdates.length > 0) {
      await executeQuery(`UPDATE profesores SET ${profUpdates.join(', ')} WHERE id_usuario = ?`, [...profParams, id])
    }

    // Roles (opcional): reemplazar roles si se envía roles[]
    if (Array.isArray(body.roles)) {
      await executeQuery("DELETE FROM usuario_roles WHERE id_usuario = ?", [id])
      for (const roleName of body.roles) {
        const role = await executeQuery<any[]>("SELECT id_rol FROM roles WHERE nombre = ?", [roleName])
        if (role.length) {
          await executeQuery("INSERT INTO usuario_roles (id_usuario, id_rol) VALUES (?, ?)", [id, role[0].id_rol])
        }
      }
    }

    return NextResponse.json({ success: true })
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
