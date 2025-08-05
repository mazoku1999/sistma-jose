import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"
import bcrypt from "bcrypt"

export async function POST(
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
      "SELECT usuario FROM usuarios WHERE id_usuario = ?",
      [profesorId]
    )

    if (!existingProfesor.length) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
    }

    // Generar nueva contraseña temporal
    const newPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Actualizar contraseña
    await executeQuery(
      "UPDATE usuarios SET password = ? WHERE id_usuario = ?",
      [hashedPassword, profesorId]
    )

    return NextResponse.json({ 
      message: "Contraseña restablecida correctamente",
      password: newPassword,
      usuario: existingProfesor[0].usuario
    })
  } catch (error) {
    console.error("Error resetting password:", error)
    return NextResponse.json({ error: "Error al restablecer contraseña" }, { status: 500 })
  }
}