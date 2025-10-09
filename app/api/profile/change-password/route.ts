import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"
import bcrypt from "bcrypt"

export async function POST(request: Request) {
    try {
        const session = await getServerSession()

        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const body = await request.json()
        const { currentPassword, newPassword } = body

        if (!currentPassword || !newPassword) {
            return NextResponse.json({
                error: "Contraseña actual y nueva contraseña son requeridas"
            }, { status: 400 })
        }

        if (newPassword.length < 6) {
            return NextResponse.json({
                error: "La nueva contraseña debe tener al menos 6 caracteres"
            }, { status: 400 })
        }

        // Obtener la contraseña actual del usuario
        const usuarios = await executeQuery<any[]>(
            "SELECT password FROM usuarios WHERE id_usuario = ?",
            [session.user.id]
        )

        if (!usuarios || usuarios.length === 0) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
        }

        // Verificar la contraseña actual
        const passwordMatch = await bcrypt.compare(currentPassword, usuarios[0].password)
        if (!passwordMatch) {
            return NextResponse.json({
                error: "La contraseña actual es incorrecta"
            }, { status: 400 })
        }

        // Encriptar la nueva contraseña
        const hashedNewPassword = await bcrypt.hash(newPassword, 10)

        // Actualizar la contraseña
        await executeQuery(
            "UPDATE usuarios SET password = ? WHERE id_usuario = ?",
            [hashedNewPassword, session.user.id]
        )

        return NextResponse.json({
            success: true,
            message: "Contraseña actualizada exitosamente"
        })
    } catch (error) {
        console.error("Error changing password:", error)
        return NextResponse.json({ error: "Error al cambiar contraseña" }, { status: 500 })
    }
}
