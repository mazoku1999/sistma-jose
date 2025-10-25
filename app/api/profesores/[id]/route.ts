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

    // Obtener información del usuario (puede ser profesor, admin o administrativo)
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
        COALESCE(p.puede_centralizar_notas, 0) as puede_centralizar_notas,
        COALESCE(p.profesor_area, 0) as profesor_area,
        COALESCE(p.es_tutor, 0) as es_tutor
      FROM usuarios u
      LEFT JOIN profesores p ON u.id_usuario = p.id_usuario
      WHERE u.id_usuario = ?`,
      [profesorId]
    )

    if (!profesor.length) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
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

    // Roles (opcional): reemplazar roles si se envía roles[]
    let isProfesor = false
    if (Array.isArray(body.roles)) {
      isProfesor = body.roles.includes("PROFESOR")
      await executeQuery("DELETE FROM usuario_roles WHERE id_usuario = ?", [id])
      for (const roleName of body.roles) {
        const role = await executeQuery<any[]>("SELECT id_rol FROM roles WHERE nombre = ?", [roleName])
        if (role.length) {
          await executeQuery("INSERT INTO usuario_roles (id_usuario, id_rol) VALUES (?, ?)", [id, role[0].id_rol])
        }
      }
    } else {
      // Si no se envían roles, verificar si el usuario tiene rol PROFESOR
      const currentRoles = await executeQuery<any[]>(
        `SELECT r.nombre FROM usuario_roles ur JOIN roles r ON ur.id_rol = r.id_rol WHERE ur.id_usuario = ?`,
        [id]
      )
      isProfesor = currentRoles.some(r => r.nombre === "PROFESOR")
    }

    // Verificar si existe registro en profesores
    const existingProfesor = await executeQuery<any[]>(
      "SELECT id_profesor FROM profesores WHERE id_usuario = ?",
      [id]
    )

    // Si es profesor y no tiene registro, crearlo
    if (isProfesor && existingProfesor.length === 0) {
      await executeQuery(
        "INSERT INTO profesores (id_usuario, puede_centralizar_notas, profesor_area, es_tutor) VALUES (?, ?, ?, ?)",
        [
          id,
          typeof body.puede_centralizar_notas !== "undefined" ? !!body.puede_centralizar_notas : true,
          typeof body.profesor_area !== "undefined" ? !!body.profesor_area : false,
          typeof body.es_tutor !== "undefined" ? !!body.es_tutor : false
        ]
      )
    }
    // Si es profesor y ya tiene registro, actualizar banderas
    else if (isProfesor && existingProfesor.length > 0) {
      const profUpdates: string[] = []
      const profParams: any[] = []
      if (typeof body.puede_centralizar_notas !== "undefined") { profUpdates.push("puede_centralizar_notas = ?"); profParams.push(!!body.puede_centralizar_notas) }
      if (typeof body.profesor_area !== "undefined") { profUpdates.push("profesor_area = ?"); profParams.push(!!body.profesor_area) }
      if (typeof body.es_tutor !== "undefined") { profUpdates.push("es_tutor = ?"); profParams.push(!!body.es_tutor) }
      if (profUpdates.length > 0) {
        await executeQuery(`UPDATE profesores SET ${profUpdates.join(', ')} WHERE id_usuario = ?`, [...profParams, id])
      }
    }
    // Si no es profesor pero tiene registro (cambio de rol), eliminarlo solo si no tiene aulas
    else if (!isProfesor && existingProfesor.length > 0) {
      const aulasAsignadas = await executeQuery<any[]>(
        "SELECT COUNT(*) as count FROM aulas_profesor WHERE id_profesor = ?",
        [existingProfesor[0].id_profesor]
      )
      if (aulasAsignadas[0].count === 0) {
        await executeQuery("DELETE FROM profesores WHERE id_usuario = ?", [id])
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
    const userId = id

    // Verificar que el usuario existe
    const existingUser = await executeQuery<any[]>(
      "SELECT id_usuario FROM usuarios WHERE id_usuario = ?",
      [userId]
    )

    if (!existingUser.length) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Verificar si tiene registro en profesores
    const profesorRecord = await executeQuery<any[]>(
      "SELECT id_profesor FROM profesores WHERE id_usuario = ?",
      [userId]
    )

    // Si es profesor, verificar que no tenga aulas asignadas
    if (profesorRecord.length > 0) {
      const aulasAsignadas = await executeQuery<any[]>(
        "SELECT COUNT(*) as count FROM aulas_profesor WHERE id_profesor = ?",
        [profesorRecord[0].id_profesor]
      )

      if (aulasAsignadas[0].count > 0) {
        return NextResponse.json({
          error: "No se puede eliminar el usuario porque tiene aulas asignadas"
        }, { status: 400 })
      }
    }

    // Eliminar usuario (CASCADE eliminará las relaciones en profesores y usuario_roles)
    await executeQuery("DELETE FROM usuarios WHERE id_usuario = ?", [userId])

    return NextResponse.json({ message: "Profesor eliminado correctamente" })
  } catch (error) {
    console.error("Error deleting profesor:", error)
    return NextResponse.json({ error: "Error al eliminar profesor" }, { status: 500 })
  }
}
