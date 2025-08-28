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
    const activaOnly = searchParams.get("activa") === "true"

    let query = `
      SELECT 
        id_gestion,
        nombre,
        anio,
        fecha_inicio,
        fecha_fin,
        activa,
        descripcion,
        fecha_creacion
      FROM gestiones_academicas
    `

    const params: any[] = []

    if (activaOnly) {
      query += " WHERE activa = TRUE"
    }

    query += " ORDER BY anio DESC, activa DESC"

    const gestiones = await executeQuery<any[]>(query, params)

    return NextResponse.json(gestiones)
  } catch (error) {
    console.error("Error al obtener gestiones:", error)
    return NextResponse.json({ error: "Error al obtener gestiones" }, { status: 500 })
  }
}

export async function POST(request: Request) {
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
      return NextResponse.json({ error: "Solo administradores pueden crear gestiones" }, { status: 403 })
    }

    const { nombre, anio, fecha_inicio, fecha_fin, descripcion } = await request.json()

    if (!nombre || !anio || !fecha_inicio || !fecha_fin) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    // Verificar que no exista una gestión con el mismo año
    const existingQuery = await executeQuery<any[]>(
      "SELECT id_gestion FROM gestiones_academicas WHERE anio = ?",
      [anio]
    )

    if (existingQuery.length > 0) {
      return NextResponse.json({ error: "Ya existe una gestión para este año" }, { status: 400 })
    }

    // Crear la nueva gestión
    const result = await executeQuery<any>(
      `INSERT INTO gestiones_academicas 
       (nombre, anio, fecha_inicio, fecha_fin, descripcion) 
       VALUES (?, ?, ?, ?, ?)`,
      [nombre, anio, fecha_inicio, fecha_fin, descripcion]
    )

    return NextResponse.json({ 
      id_gestion: result.insertId,
      message: "Gestión creada correctamente" 
    })
  } catch (error) {
    console.error("Error al crear gestión:", error)
    return NextResponse.json({ error: "Error al crear gestión" }, { status: 500 })
  }
}