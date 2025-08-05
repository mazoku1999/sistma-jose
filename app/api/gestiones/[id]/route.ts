import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que el usuario sea administrador
    const adminQuery = await executeQuery<any[]>(
      `SELECT ur.id_rol FROM usuario_roles ur 
       JOIN roles r ON ur.id_rol = r.id_rol 
       WHERE ur.id_usuario = ? AND r.nombre = 'ADMIN'`,
      [session.user.id]
    )

    if (!adminQuery.length) {
      return NextResponse.json({ error: "Solo administradores pueden modificar gestiones" }, { status: 403 })
    }

    const gestionId = parseInt(params.id)
    const { activa } = await request.json()

    if (typeof activa !== 'boolean') {
      return NextResponse.json({ error: "El campo 'activa' es requerido y debe ser boolean" }, { status: 400 })
    }

    // Si se está activando una gestión, desactivar todas las demás
    if (activa) {
      await executeQuery(
        "UPDATE gestiones_academicas SET activa = FALSE WHERE activa = TRUE"
      )
    }

    // Actualizar la gestión específica
    await executeQuery(
      "UPDATE gestiones_academicas SET activa = ? WHERE id_gestion = ?",
      [activa, gestionId]
    )

    // Verificar que la gestión existe
    const gestionQuery = await executeQuery<any[]>(
      "SELECT * FROM gestiones_academicas WHERE id_gestion = ?",
      [gestionId]
    )

    if (!gestionQuery.length) {
      return NextResponse.json({ error: "Gestión no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ 
      message: activa ? "Gestión activada correctamente" : "Gestión desactivada correctamente",
      gestion: gestionQuery[0]
    })
  } catch (error) {
    console.error("Error al actualizar gestión:", error)
    return NextResponse.json({ error: "Error al actualizar gestión" }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const gestionId = parseInt(params.id)

    const gestionQuery = await executeQuery<any[]>(
      `SELECT 
        id_gestion,
        nombre,
        anio,
        fecha_inicio,
        fecha_fin,
        activa,
        descripcion,
        fecha_creacion
      FROM gestiones_academicas 
      WHERE id_gestion = ?`,
      [gestionId]
    )

    if (!gestionQuery.length) {
      return NextResponse.json({ error: "Gestión no encontrada" }, { status: 404 })
    }

    return NextResponse.json(gestionQuery[0])
  } catch (error) {
    console.error("Error al obtener gestión:", error)
    return NextResponse.json({ error: "Error al obtener gestión" }, { status: 500 })
  }
}