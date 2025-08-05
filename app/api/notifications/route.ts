import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-server-session"
import { executeQuery } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = session.user.id

    // Obtener notificaciones de la base de datos
    const notifications = await executeQuery(
      `SELECT 
        id, 
        title, 
        message, 
        type, 
        \`read\`, 
        created_at 
      FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 20`,
      [userId],
    )

    // Si no hay notificaciones en la base de datos, devolver un array vacío
    if (!notifications || notifications.length === 0) {
      return NextResponse.json([])
    }

    return NextResponse.json(notifications)
  } catch (error) {
    console.error("Error al obtener notificaciones:", error)
    return NextResponse.json({ error: "Error al obtener notificaciones" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { title, message, type = "info", userId } = await request.json()

    if (!title || !message || !userId) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    // Insertar notificación en la base de datos
    const result = await executeQuery(
      `INSERT INTO notifications (user_id, title, message, type, \`read\`, created_at) 
       VALUES (?, ?, ?, ?, false, NOW())`,
      [userId, title, message, type],
    )

    return NextResponse.json({
      id: result.insertId,
      title,
      message,
      type,
      read: false,
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error al crear notificación:", error)
    return NextResponse.json({ error: "Error al crear notificación" }, { status: 500 })
  }
}
