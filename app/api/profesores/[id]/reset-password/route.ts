import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"
import { enviarCredencialesProfesor } from "@/lib/email-utils"
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

    // Verificar que el profesor existe y obtener datos para el email
    const existingProfesor = await executeQuery<any[]>(
      "SELECT usuario, email, nombre_completo, nombres, apellido_paterno, apellido_materno FROM usuarios WHERE id_usuario = ?",
      [profesorId]
    )

    if (!existingProfesor.length) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
    }

    const userData = existingProfesor[0]

    // Generar nueva contraseña temporal (8 caracteres)
    const newPassword = Math.random().toString(36).slice(-8)
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Actualizar contraseña
    await executeQuery(
      "UPDATE usuarios SET password = ? WHERE id_usuario = ?",
      [hashedPassword, profesorId]
    )

    // Enviar email con credenciales si tiene email
    let emailEnviado = false
    let emailError = null

    if (userData.email) {
      try {
        const emailResult = await enviarCredencialesProfesor({
          nombreCompleto: userData.nombre_completo || `${userData.nombres} ${userData.apellido_paterno}`,
          usuario: userData.usuario,
          password: newPassword,
          email: userData.email,
          esTemporal: true
        })
        emailEnviado = emailResult.success
        emailError = emailResult.error
      } catch (e) {
        console.error("Error al enviar email de reset:", e)
        emailError = e instanceof Error ? e.message : "Error desconocido al enviar email"
      }
    }

    return NextResponse.json({
      message: "Contraseña restablecida correctamente",
      password: newPassword,
      usuario: userData.usuario,
      emailEnviado,
      emailError
    })
  } catch (error) {
    console.error("Error resetting password:", error)
    return NextResponse.json({ error: "Error al restablecer contraseña" }, { status: 500 })
  }
}