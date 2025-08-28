import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { executeQuery } from "@/lib/db"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ user: null })
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as {
        id: number
        username: string
        roles: string[]
      }

      // Get user from database to ensure they still exist and are active
      const users = await executeQuery<any[]>(
        `SELECT u.id_usuario, u.usuario, u.nombre_completo, 
                GROUP_CONCAT(r.nombre) as roles
         FROM usuarios u
         JOIN usuario_roles ur ON u.id_usuario = ur.id_usuario
         JOIN roles r ON ur.id_rol = r.id_rol
         WHERE u.id_usuario = ? AND u.activo = TRUE
         GROUP BY u.id_usuario`,
        [decoded.id],
      )

      if (!users || users.length === 0) {
        cookieStore.delete("auth-token")
        return NextResponse.json({ user: null })
      }

      const user = users[0]

      // Get professor info if user is a professor
      let professorInfo = null
      if (user.roles.includes("PROFESOR")) {
        const professors = await executeQuery<any[]>(
          "SELECT id_profesor, puede_centralizar_notas, profesor_area FROM profesores WHERE id_usuario = ?",
          [user.id_usuario],
        )
        if (professors && professors.length > 0) {
          professorInfo = professors[0]
        }
      }

      return NextResponse.json({
        user: {
          id: user.id_usuario,
          nombre_completo: user.nombre_completo,
          usuario: user.usuario,
          roles: user.roles.split(","),
          ...(professorInfo && { profesor: professorInfo }),
        },
      })
    } catch (error) {
      console.error("Token verification error:", error)
      cookieStore.delete("auth-token")
      return NextResponse.json({ user: null })
    }
  } catch (error) {
    console.error("Session error:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}
