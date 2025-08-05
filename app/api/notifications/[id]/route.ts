import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-server-session"
import { db } from "@/lib/db"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = session.user.id
    const notificationId = params.id
    const { read } = await request.json()

    // Verificar que la notificación pertenece al usuario
    const [notifications] = await db.query(`SELECT id FROM notifications WHERE id = ? AND user_id = ?`, [
      notificationId,
      userId,
    ])

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 })
    }

    // Actualizar el estado de lectura de la notificación
    await db.query(`UPDATE notifications SET read = ? WHERE id = ?`, [read, notificationId])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al actualizar notificación:", error)
    return NextResponse.json({ error: "Error al actualizar notificación" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = session.user.id
    const notificationId = params.id

    // Verificar que la notificación pertenece al usuario
    const [notifications] = await db.query(`SELECT id FROM notifications WHERE id = ? AND user_id = ?`, [
      notificationId,
      userId,
    ])

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 })
    }

    // Eliminar la notificación
    await db.query(`DELETE FROM notifications WHERE id = ?`, [notificationId])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al eliminar notificación:", error)
    return NextResponse.json({ error: "Error al eliminar notificación" }, { status: 500 })
  }
}
