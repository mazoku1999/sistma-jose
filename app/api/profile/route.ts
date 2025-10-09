import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET() {
    try {
        const session = await getServerSession()

        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        // Obtener información del usuario actual
        const usuarios = await executeQuery<any[]>(
            `SELECT 
        u.id_usuario,
        u.usuario,
        u.nombres,
        u.apellido_paterno,
        u.apellido_materno,
        u.nombre_completo,
        u.email,
        u.activo,
        DATE_FORMAT(u.fecha_creacion, '%Y-%m-%d') as fecha_registro
      FROM usuarios u
      WHERE u.id_usuario = ?`,
            [session.user.id]
        )

        if (!usuarios || usuarios.length === 0) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
        }

        const usuario = usuarios[0]

        // Obtener roles del usuario
        const roles = await executeQuery<any[]>(
            `SELECT r.nombre 
       FROM usuario_roles ur 
       JOIN roles r ON ur.id_rol = r.id_rol 
       WHERE ur.id_usuario = ?`,
            [usuario.id_usuario]
        )

        usuario.roles = roles.map(r => r.nombre)

        return NextResponse.json(usuario)
    } catch (error) {
        console.error("Error fetching profile:", error)
        return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession()

        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const body = await request.json()
        const { nombres, apellido_paterno, apellido_materno } = body

        if (!nombres || !apellido_paterno || !apellido_materno) {
            return NextResponse.json({
                error: "Nombres, apellido paterno y apellido materno son requeridos"
            }, { status: 400 })
        }

        const nombre_completo = `${nombres} ${apellido_paterno} ${apellido_materno}`.trim()

        // Actualizar información del usuario
        await executeQuery(
            `UPDATE usuarios 
       SET nombres = ?, apellido_paterno = ?, apellido_materno = ?, nombre_completo = ?
       WHERE id_usuario = ?`,
            [nombres, apellido_paterno, apellido_materno, nombre_completo, session.user.id]
        )

        return NextResponse.json({
            success: true,
            message: "Perfil actualizado exitosamente"
        })
    } catch (error) {
        console.error("Error updating profile:", error)
        return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 })
    }
}
